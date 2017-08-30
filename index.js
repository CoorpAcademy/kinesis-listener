#!/usr/bin/env node
const AWS = require('aws-sdk');
const Promise = require('bluebird');
const c = require('chalk');
const _ = require('lodash');
const fs = require('fs');
const moment = require('moment');

const argv = require('yargs')
    .usage('Usage: $0 [kinesis-stream-name]')
    .example('$0 log-stream --filename dump.log')
    .describe('endpoint', 'Specify an alternative endpoint for the kinesis sdk').alias('e', 'endpoint').string('e')
    .describe('forward', 'Forward kinesis record to file').alias('f', 'forward').boolean('f')
    .describe('filename', 'Filename to Forward kinesis records').alias('F', 'filename').string('F')
    .describe('retro', 'Start to read "00h11m2s" time ago').alias('r', 'retro').string('r')
    .describe('horizon', 'Trim Horizon read').alias('H', 'horizon').boolean('H')
    .describe('refresh-rate', 'Refresh rate of the dashboard, in time per second (default 10)')
    .alias('R', 'refresh-rate').string('R')
    .describe('batch-size', 'Size of batch for each kinesis getRecord (default 100)').alias('b', 'batch-size')
    .describe('time-format', 'Format to print date with').alias('t', 'time-format').string('t')
    .describe('day-format', 'Use hh:mm:ss day date format').alias('d', 'day-format').boolean('d')
    .number(['refresh-rate', 'batch-size'])
    .help('h').alias('h', 'help')
    .argv;

const processors = require('./lib/processors');
const cliView = require('./lib/cli-view');

const kinesis = Promise.promisifyAll(new AWS.Kinesis({
    apiVersion: '2013-12-02',
    endpoint: argv.endpoint,
    region: process.env.AWS_REGION || 'eu-west-1'
}), {suffix: 'P'});

const kinesisStream = argv._[0];
const batchSize = argv['batch-size'] || 100; // maybe: slow mode option
let ShardIteratorType = 'LATEST';
let Timestamp = new Date();

const updateRate = 1000 / (argv['refresh-rate'] || 10);
const processorsList = [...processors.BASICS];
const dateFormat = argv['time-format'] || (argv.d && 'hh:mm:ss');

const settings = {}; // maybe rename global
settings.state = {count: 0, shardCount: []};
// TODO: maybe encapsulate in the kinesis-listener
settings.config = {batchSize, dateFormat, updateRate};

const {resilientListener} = require('./lib/kinesis-listener')(kinesis, settings);
const {selectStream} = require('./lib/kinesis-selector')(kinesis);

if (argv.filename || argv.forward) {
    const file = argv.filename || '/tmp/kinesis-listener.log';
    const fileStream = fs.createWriteStream(file);
    const streamProcessor = processors.streamProcessorMaker(fileStream, file);
    processorsList.push(streamProcessor);
}

if (argv.retro) {
    setting.config.retro = true;
    const timeRegexp = /^(?=\d\d*[hms])(?:(\d\d?)h)?(?:(\d\d*)m)?(?:(\d\d*)s)?$/;
    if (!argv.retro.match(timeRegexp)) throw new Error(`Invalide retro time format: ${argv.retro}`);
    const match = timeRegexp.exec(argv.retro);
    const hours = match[1] || 0;
    const minutes = match[2] || 0;
    const seconds = match[3] || 0;
    const timestamp = moment().subtract(hours, 'hours').subtract(minutes, 'minutes').subtract(seconds, 'seconds');
    ShardIteratorType = 'AT_TIMESTAMP';
    Timestamp = timestamp.toDate();
} else if (argv.horizon) {
    ShardIteratorType = 'TRIM_HORIZON';
}

const main = () => {
  const streamNameP = kinesisStream ? Promise.resolve(kinesisStream) : selectStream()
  return streamNameP
    .then(kinesisStream => {
      settings.kinesisStream = kinesisStream;
      cliView.setUpKeyboardInteraction(settings.config, settings.state);
      return resilientListener({kinesisStream, ShardIteratorType, Timestamp, processorsList})
        .catch(err => err.name === "ResourceNotFoundException", err => {
          console.log(err.message);
          process.exit(2);
        })
        .catch(err => _.includes(['UnknownEndpoint', 'NetworkingError'], err.name), err => {
          if (argv.endpoint)
            console.log(c.red(`Provided Endpoint ${c.bold(argv.endpoint)} is not accessible`));
          else
            console.log(c.red('Unaccessible AWS region endpoint, check your internet connection'));
          console.log(err.message);
          process.exit(3);
        })
        .catch(err => {
          console.log(c.red('Error Occured forcing us to shut down the program:'));
          console.log(err.message);
          process.exit(1);
        });
    })
};

module.exports = main;

if(!module.parent) {
  main();
}
