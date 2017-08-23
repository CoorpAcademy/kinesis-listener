#!/usr/bin/env node
const AWS = require('aws-sdk');
const Promise = require('bluebird');
const c = require('chalk');
const _ = require('lodash');
const logUpdate = require('log-update');
const ora = require('ora');
const util = require('util');
const argv = require('yargs').argv

const processors = require('./processors');

const kinesis = Promise.promisifyAll(new AWS.Kinesis({
    apiVersion: '2013-12-02',
    region: process.env.AWS_REGION || 'eu-west-1'
}), {suffix: 'P'});

const kinesisStream = argv._[0] || 'bricklane-central-development';
const batchSize = argv.batchSize || 22; // maybe: slow mode option

const STATE = {kinesisStream, batchSize}
const updateRate = 1000 / 30;

const readIterator = recordProcessors => ShardIterator => {
    return kinesis.getRecordsP({ShardIterator, Limit: batchSize})
        .then(data => {
            const iterator = data.NextShardIterator;
            // TODO: see MillisBehind Latest to determine batchsize
                const records = _.map(data.Records, record => {
                    const payload = new Buffer(record.Data, 'base64').toString('utf-8');
                    return payload;
                    // TODO: json parsing option
                });
               _.map(recordProcessors,
                   recordProcessor => _.map(records, recordProcessor(STATE))); // maybe: later async
             return iterator;
            })
}

const getStreamShards = (kinesisStream) => kinesis.describeStreamP({StreamName: kinesisStream})
    .then(streamConf => {
            const shardsIds = _.map(streamConf.StreamDescription.Shards, 'ShardId')
            console.log('stream', c.blue.bold.underline(kinesisStream), 'has',
                        c.blue.bold(shardsIds.length), 'shards:', shardsIds.join(', '));
            STATE.shardsId = shardsIds
            return shardsIds;
        })

getStreamShards(kinesisStream)
    .map(shardId => kinesis.getShardIteratorP({StreamName: kinesisStream,
        ShardId: shardId, // TODO: type later configurable -> X minutes ago
        ShardIteratorType: 'LATEST'}).then(si => si.ShardIterator))
    .then(shardIterators => {
        logUpdate(c.red.bold('► Entering listening mode'))
        const kinesisIterator = readIterator(processors.ALL); //TODO configurable
        const readLoop = (initialIterators) => {
            // TODO graceful STOP
            return Promise.map(initialIterators, kinesisIterator)
                .then(readLoop)
        }
        const printLoop = () => {
            logUpdate(
                `
${c.bold(`${c.red('►')} Listening ${c.blue.underline(STATE.kinesisStream)} kinesis stream `)}                
  - received so far ${c.blue.bold(STATE.count || 0)} records
${!STATE.count ? '':
`  - last received record (at ${c.dim.grey(STATE.timestampLastReceived)}) :
${util.inspect(_.omit(STATE.lastJsonRecord, ['content']), {depth: null, colors: true})}`
                    }` // TODO: handle pading
                // TODO: maybe extract in view:
            )
            return Promise.delay(updateRate).then(printLoop)
        }

        return Promise.all(readLoop(shardIterators), printLoop());
    })
    .catch(err => err.name ===  "ResourceNotFoundException", err => {
        console.log(err.message);
        process.exit(2);
    })
