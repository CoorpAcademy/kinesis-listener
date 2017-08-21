const AWS = require('aws-sdk');
const Promise = require('bluebird');
const _ = require('lodash');

const kinesis = Promise.promisifyAll(new AWS.Kinesis({
    apiVersion: '2013-12-02',
    region: process.env.AWS_REGION || 'eu-west-1'
}), {suffix: 'P'});

const kinesisStream = 'bricklane-central-development'

kinesis.describeStreamP({StreamName: kinesisStream})
    .then(streamConf => {
            const shardsId = _.map(streamConf.StreamDescription.Shards, 'ShardId')
            console.log('stream', kinesisStream, 'a', shardsId.length, 'shards:', shardsId);
            return shardsId;
        }
    )
