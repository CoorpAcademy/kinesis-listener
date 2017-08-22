const AWS = require('aws-sdk');
const Promise = require('bluebird');
const _ = require('lodash');
const ora = require('ora');
const argv = require('yargs').argv

const processors = require('./processors');

const kinesis = Promise.promisifyAll(new AWS.Kinesis({
    apiVersion: '2013-12-02',
    region: process.env.AWS_REGION || 'eu-west-1'
}), {suffix: 'P'});

const kinesisStream = argv._[0] || 'bricklane-central-development';
const batchSize = argv.batchSize || 12; // maybe: slow mode option

const readIterator = recordProcessor => ShardIterator => {
    return kinesis.getRecordsP({ShardIterator, Limit: batchSize})
        .then(data => {
            const iterator = data.NextShardIterator;
            // TODO: see MillisBehind Latest to determine batchsize
                const records = _.map(data.Records, record => {
                    const payload = new Buffer(record.Data, 'base64').toString('utf-8');
                    return JSON.parse(payload);
                    // TODO: json parsing option
                });
               _.map(records, recordProcessor); // maybe: later async
             return iterator;
            })
}


kinesis.describeStreamP({StreamName: kinesisStream})
    .then(streamConf => {
            const shardsId = _.map(streamConf.StreamDescription.Shards, 'ShardId')
            console.log('stream', kinesisStream, 'has', shardsId.length, 'shards:', shardsId);
            return shardsId;
        })
    .map(shardId => kinesis.getShardIteratorP({StreamName: kinesisStream,
        ShardId: shardId, // TODO: type later configurable -> X minutes ago
        ShardIteratorType: 'LATEST'}).then(si => si.ShardIterator))
    .then(shardIterators => {
        // const spinner = ora('Entering listening mode:').start();
        // const updateSpinner = count => { spinner.text = `${count} records received so far`};
        console.log('Entering listening mode')
        const kinesisIterator = readIterator(processors.lastItemAndCountProcessor()); //TODO configurable
        // maybe list of processors?
        const  readLoop = (initialIterators) => {
            // TODO graceful STOP
            return Promise.map(initialIterators, kinesisIterator)
                .then(readLoop)
        }
        return readLoop(shardIterators);


    })
    .catch(err => err.name ===  "ResourceNotFoundException", err => {
        console.log(err.message);
        process.exit(2);
    })
