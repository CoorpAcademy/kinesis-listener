#!/usr/bin/env node
const AWS = require('aws-sdk');
const Promise = require('bluebird');
const c = require('chalk');
const _ = require('lodash');
const fs = require('fs');
const logUpdate = require('log-update');
const argv = require('yargs').argv

const processors = require('./processors');
const cliView = require('./cli-view');

const kinesis = Promise.promisifyAll(new AWS.Kinesis({
    apiVersion: '2013-12-02',
    region: process.env.AWS_REGION || 'eu-west-1'
}), {suffix: 'P'});

const kinesisStream = argv._[0] || 'bricklane-central-development';
const batchSize = argv.batchSize || 22; // maybe: slow mode option

const file = '/tmp/kinesis-listener.log'
const fileStream = fs.createWriteStream(file)

const STATE = {kinesisStream, batchSize, count: 0, shardCount: []}
const updateRate = 1000 / 30; //TODO option + change

const streamProcessor = processors.streamProcessorMaker(fileStream, file);
const processorsList = [...processors.BASICS, streamProcessor]





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
}

const getStreamShards = (kinesisStream) => kinesis.describeStreamP({StreamName: kinesisStream})
    .then(streamConf => {
        const shardsIds = _.map(streamConf.StreamDescription.Shards, 'ShardId');
        STATE.shardsIds = shardsIds;
        return shardsIds;
    })

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
    })

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
    })
