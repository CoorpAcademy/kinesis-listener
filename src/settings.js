const fs = require('fs');
const yargs = require('yargs');
const {parseRetroDate} = require('./utils');
const processors = require('./processors');

const getOptions = () =>
  yargs
    .usage('Usage: $0 [kinesis-stream-name]')
    .example('$0 log-stream --filename dump.log')
    .describe('endpoint', 'Specify an alternative endpoint for the kinesis sdk')
    .alias('e', 'endpoint')
    .string('e')
    .describe('forward', 'Forward kinesis record to file')
    .alias('f', 'forward')
    .boolean('f')
    .describe('filename', 'Filename to Forward kinesis records')
    .alias('F', 'filename')
    .string('F')
    .describe('retro', 'Start to read "00h11m2s" time ago')
    .alias('r', 'retro')
    .string('r')
    .describe('horizon', 'Trim Horizon read')
    .alias('H', 'horizon')
    .boolean('H')
    .describe('refresh-rate', 'Refresh rate of the dashboard, in time per second (default 10)')
    .alias('R', 'refresh-rate')
    .number('R')
    .describe('batch-size', 'Size of batch for each kinesis getRecord (default 100)')
    .alias('b', 'batch-size')
    .describe('time-format', 'Format to print date with')
    .alias('t', 'time-format')
    .string('t')
    .describe('day-format', 'Use hh:mm:ss day date format')
    .alias('d', 'day-format')
    .boolean('d')
    .describe('fetch-interval', 'fetch-rate of kinesis records in ms')
    .alias('i', 'fetch-interval')
    .number('1')
    .number(['refresh-rate', 'batch-size'])
    .help('h')
    .alias('h', 'help').argv;

const getSettings = (argv, kinesis) => {
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

  if (argv.filename || argv.forward) {
    const file = argv.filename || '/tmp/kinesis-listener.log';
    const fileStream = fs.createWriteStream(file);
    const streamProcessor = processors.streamProcessorMaker(fileStream, file);
    settings.config.processorsList.push(streamProcessor);
    // TODO: clean up call
  }

  if (argv.retro) {
    settings.config.Timestamp = parseRetroDate(argv.retro);
    settings.config.retro = true;
    settings.config.ShardIteratorType = 'AT_TIMESTAMP';
  } else if (argv.horizon) {
    settings.config.ShardIteratorType = 'TRIM_HORIZON';
  }
  return settings;
};

module.exports = {getSettings, getOptions};
