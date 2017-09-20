#!/usr/bin/env node
const AWS = require('aws-sdk');
const Promise = require('bluebird');
const c = require('chalk');
const _ = require('lodash');
const fs = require('fs');
const {parseRetroDate} = require('./lib/utils');
const {customChain} = require('./lib/aws-credentials-utils');

const argv = require('yargs')
  .usage('Usage: $0 [kinesis-stream-name]')
  .example('$0 log-stream --filename dump.log')
  .describe('endpoint', 'Specify an alternative endpoint for the kinesis sdk').alias('e', 'endpoint').string('e')
  .describe('forward', 'Forward kinesis record to file').alias('f', 'forward').boolean('f')
  .describe('filename', 'Filename to Forward kinesis records').alias('F', 'filename').string('F')
  .describe('retro', 'Start to read "00h11m2s" time ago').alias('r', 'retro').string('r')
  .describe('horizon', 'Trim Horizon read').alias('H', 'horizon').boolean('H')
  .describe('refresh-rate', 'Refresh rate of the dashboard, in time per second (default 10)')
  .alias('R', 'refresh-rate').number('R')
  .describe('batch-size', 'Size of batch for each kinesis getRecord (default 100)').alias('b', 'batch-size')
  .describe('time-format', 'Format to print date with').alias('t', 'time-format').string('t')
  .describe('day-format', 'Use hh:mm:ss day date format').alias('d', 'day-format').boolean('d')
  .describe('fetch-interval', 'fetch-rate of kinesis records in ms').alias('i', 'fetch-interval').number('1')
  .number(['refresh-rate', 'batch-size'])
  .help('h').alias('h', 'help')
  .argv;

const processors = require('./lib/processors');
const cliView = require('./lib/cli-view');

const kinesis = Promise.promisifyAll(new AWS.Kinesis({
  apiVersion: '2013-12-02',
  endpoint: argv.endpoint,
  credentialProvider: customChain,
  region: process.env.AWS_REGION || 'eu-west-1'
}), {suffix: 'P'});

const settings = {}; // maybe rename global
settings.state = {count: 0, shardCount: []}; // TODO: maybe encapsulate in the kinesis-listener
settings.config = {
  kinesisStream: argv._[0],
  ShardIteratorType: 'LATEST',
  Timestamp: new Date(),
  dateFormat: argv['time-format'] || (argv.d && 'hh:mm:ss'),
  batchSize: argv['batch-size'] || 100,
  updateRate: 1000 / (argv['refresh-rate'] || 10),
  fetchInterval: argv['fetch-interval'] || 100,
  processorsList: [...processors.BASICS]
};

const {resilientListener} = require('./lib/kinesis-listener')(kinesis, settings);
const {selectStream} = require('./lib/kinesis-selector')(kinesis);

if (argv.filename || argv.forward) {
  const file = argv.filename || '/tmp/kinesis-listener.log';
  const fileStream = fs.createWriteStream(file);
  const streamProcessor = processors.streamProcessorMaker(fileStream, file);
  settings.config.processorsList.push(streamProcessor);
}

if (argv.retro) {
  settings.config.Timestamp = parseRetroDate(argv.retro);
  settings.config.retro = true;
  settings.config.ShardIteratorType = 'AT_TIMESTAMP';
} else if (argv.horizon) {
  settings.config.ShardIteratorType = 'TRIM_HORIZON';
}

const main = () => {
  const streamNameP = settings.config.kinesisStream ? Promise.resolve(settings.config.kinesisStream) : selectStream()
  return streamNameP
    .then(kinesisStream => {
      settings.config.kinesisStream = kinesisStream;
      cliView.setUpKeyboardInteraction(settings.config, settings.state);

      return resilientListener(settings.config)
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

if (!module.parent) {
  main();
}
