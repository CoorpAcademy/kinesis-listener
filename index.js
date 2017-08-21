const AWS = require('aws-sdk');
const Promise = require('bluebird');

const kinesis = Promise.promisifyAll(new AWS.Kinesis({
    apiVersion: '2013-12-02',
    region: process.env.AWS_REGION || 'eu-west-1'
}), {suffix: 'P'});

const kinesisStream = 'bricklane-central-development'

kinesis.describeStreamP({StreamName: kinesisStream})
    .then(streamConf =>
        console.log(streamConf))
