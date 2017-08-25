#!/usr/bin/env node
const AWS = require('aws-sdk');
const Promise = require('bluebird');
const c = require('chalk');
const _ = require('lodash');
const fs = require('fs');
const logUpdate = require('log-update');

const argv = require('yargs')
    .usage('Usage: $0 [kinesis-stream-name]')
    .example('$0 log-stream --filename dump.log')
    .describe('f', 'Forward kinesis record to file').alias('f', 'forward').boolean('f')
    .describe('F', 'Filename to Forward kinesis records').alias('F', 'filename').boolean('f')
    .describe('refresh-rate', 'Refresh rate of the dashboard, in time per second (default 10)')
    .describe('batch-size', 'Size of batch for each kinesis getRecord (default 0)')
    .number(['refresh-rate', 'batch-size'])
    .help('h').alias('h', 'help')
    .argv;

const processors = require('./processors');
const cliView = require('./cli-view');

const kinesis = Promise.promisifyAll(new AWS.Kinesis({
    apiVersion: '2013-12-02',
    region: process.env.AWS_REGION || 'eu-west-1'
}), {suffix: 'P'});

const kinesisStream = argv._[0] || 'bricklane-central-development';
const batchSize = argv['batch-size'] || 100; // maybe: slow mode option

const STATE = {kinesisStream, batchSize, count: 0, shardCount: []}
const updateRate = 1000 / (argv['refresh-rate'] || 10);

const processorsList = [...processors.BASICS];

if (argv.filename || argv.forward) {
    const file = argv.filename || '/tmp/kinesis-listener.log';
    const fileStream = fs.createWriteStream(file);
    const streamProcessor = processors.streamProcessorMaker(fileStream, file);
    processorsList.push(streamProcessor);
}

if (argv.retro) {
    STATE.retro = true;
    const timeRegexp = /^(?=\d\d?[hms])(?:(\d\d?)h)?(?:(\d\d?)m)?(?:(\d\d?)s)?$/;
    if(!argv.retro.match(timeRegexp)) throw new Error(`Invalide retro time format: ${argv.retro}`);
    const match = timeRegexp.exec(argv.retro);
    const hours = match[1] || 0;
    const minutes = match[2] || 0;
    const seconds = match[3] || 0;
    console.log(hours, 'h', minutes, 'm', seconds, 's')
    return;
}
const readIterator = recordProcessors => ({ShardId, ShardIterator}) => {
    return kinesis.getRecordsP({ShardIterator, Limit: batchSize})
        .then(data => {
            const iterator = data.NextShardIterator;
            const context = {
                ShardId, ShardIterator, nRecords: data.Records.length
            };
            // TODO: see MillisBehind Latest to determine batchsize?
            const records = _.map(data.Records,
                record => Object.assign(record, {Data: new Buffer(record.Data, 'base64').toString('utf-8')}));
            _.map(recordProcessors, recordProcessor => _.map(records, recordProcessor(STATE, context)));
            // maybe: later async record processor
            return {ShardId, ShardIterator: iterator};
        })
};

const getStreamShards = (kinesisStream) => kinesis.describeStreamP({StreamName: kinesisStream})
    .then(streamConf => {
        const shardsIds = _.map(streamConf.StreamDescription.Shards, 'ShardId');
        STATE.shardsIds = shardsIds;
        return shardsIds;
    });

const launchListener = () => getStreamShards(kinesisStream)
    .map(shardId => kinesis.getShardIteratorP({
        StreamName: kinesisStream,
        ShardId: shardId, // TODO: type later configurable -> X minutes ago
        ShardIteratorType: 'LATEST'
    }).then(si => ({ShardId: shardId, ShardIterator: si.ShardIterator})))
    .then((shardIterators) => {
        const kinesisIterator = readIterator(processorsList);
        const readLoop = (initialIterators) => {
            // TODO graceful STOP
            return Promise.map(initialIterators, kinesisIterator)
                .then(readLoop)
        }
        const printLoop = () => {
            logUpdate(cliView(STATE));
            return Promise.delay(updateRate).then(printLoop);
        }

        return Promise.all([readLoop(shardIterators), printLoop()]);
    });

const resilientListener = () =>
    launchListener().catch(
        err => _.includes(['ProvisionedThroughputExceededException', 'ExpiredIteratorException'], err.code),
        err => {
            logUpdate.clear()
            console.log(c.red.bold('Error Occured'));
            console.log(err.message);
            console.log(c.blue.bold('Relaunching listener'));
            return resilientListener()
        });

resilientListener()
    .catch(err => err.name === "ResourceNotFoundException", err => {
        console.log(err.message);
        process.exit(2);
    })
    .catch(err => {
        console.log(c.red('Error Occured forcing us to shut down the program:'));
        console.log(err.message);
        process.exit(1);
    });
