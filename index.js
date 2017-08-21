const AWS = require('aws-sdk');
const Promise = require('bluebird');
const _ = require('lodash');

const kinesis = Promise.promisifyAll(new AWS.Kinesis({
    apiVersion: '2013-12-02',
    region: process.env.AWS_REGION || 'eu-west-1'
}), {suffix: 'P'});

const kinesisStream = 'bricklane-central-development'
const batchSize = 4;

const readIterator = recordProcessor => ShardIterator => {
    return kinesis.getRecordsP({ShardIterator, Limit: batchSize})
        .then(data => {
            const iterator = data.NextShardIterator;
            // TODO: see MillisBehind Latest
                const records = _.map(data.Records, record => record.Data);
                console.log(records)
                _.map(records, recordProcessor);
            // NEXT
            // iterate.
             return Promise.delay(0.1)
                 .then(() => readIterator(recordProcessor)(iterator))
            })
}


kinesis.describeStreamP({StreamName: kinesisStream})
    .then(streamConf => {
            const shardsId = _.map(streamConf.StreamDescription.Shards, 'ShardId')
            console.log('stream', kinesisStream, 'a', shardsId.length, 'shards:', shardsId);
            return shardsId;
        })
    .map(shardId => kinesis.getShardIteratorP({StreamName: kinesisStream,
        ShardId: shardId, // TODO: type later configurble
        ShardIteratorType: 'LATEST'}).then(si => si.ShardIterator))
    .then( shardIterators => {
// For now only consider the first shard
    console.log(shardIterators)
        readIterator(console.log)(shardIterators[0])
    })
// TODO: later count
