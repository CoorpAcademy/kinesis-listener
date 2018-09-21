const util = require('util');
const readline = require('readline');
const _ = require('lodash/fp');
const c = require('chalk');
const indentString = require('indent-string');
const moment = require('moment');
const cliSpinners = require('cli-spinners');
const wrapAnsi = require('wrap-ansi');

const timeSpinner = cliSpinners.dots; // TODO later option
const speedSpinner = cliSpinners.arrow3;

const timeBasedSpin = (spinner, speedFactor = 1) =>
  spinner.frames[
    Math.floor(new Date().getTime() / spinner.interval * speedFactor) % spinner.frames.length
  ];

const view = subviews => (config, state) => {
  const statuses = _.compact(_.map(v => v(config, state), subviews));
  const details = _.join(
    '\n',
    _.map(status => indentString(wrapAnsi(status, 88), 2).replace(/^ /, '-'), statuses)
  );
  return `${c.bold(
    `${c.red(timeBasedSpin(timeSpinner))} Listening ${c.blue.underline(
      config.kinesisStream
    )} kinesis`
  )}
${details}`;
};

const streamDetails = (config, state) =>
  `stream with ${c.blue.bold(_.size(config.shardsIds))} shards: ${c.dim.grey(
    _.join(', ', config.shardsIds)
  )}`;

const receivedCounter = (config, state) =>
  `received so far ${c.blue.bold(state.count)} records (${c.grey.dim(
    _.map(si => state.shardCount[si] || 0, config.shardsIds).join(', ')
  )})`;

const streamingFile = (config, state) => {
  if (!state.fileStreaming) return null;
  return `${state.fileStreamingMessage} ${c.cyan(timeBasedSpin(timeSpinner, 0.5))} ${
    state.fileStreamingFile ? c.dim.underline(state.fileStreamingFile) : ''
  }`;
};
const speedEstimation = (config, state) => {
  if (!state.count) return null;
  // TODO change speed implementation
  return `Speed Estimation: ${c.bold.yellow(
    speedSpinner.frames[state.count % speedSpinner.frames.length]
  )}`;
};
const lastReceiveRecord = (config, state) => {
  if (!state.count) return null;
  return `last received record ${moment(state.timestampLastReceived).fromNow()} (at ${c.dim.grey(
    moment(state.timestampLastReceived).format(config.dateFormat)
  )}) :
${indentString(
    util.inspect(_.omit(['content'], state.lastJsonRecord), {depth: null, colors: true}),
    // TODO make _.omit a filter function!! (in config)
    2
  )}`;
};

const detailedViews = [
  streamDetails,
  receivedCounter,
  streamingFile,
  speedEstimation,
  lastReceiveRecord
];

const checkpoint = (config, state) => {
  const deltaCount = state.count - (state.lastCheckpointCount || 0);
  state.lastCheckpointCount = state.count;
  return `Checkpoint at ${c.dim.grey(moment().format(config.dateFormat))}: ${
    // eslint-disable-next-line no-nested-ternary
    !state.lastJsonRecord
      ? `No record received so far`
      : !deltaCount
        ? 'No new record since last checkpoint'
        : `${deltaCount} new records, last being:\n${util.inspect(
            _.omit(['content'], state.lastJsonRecord),
            {depth: null, colors: true}
          )}`
  }`;
};

const keypressHandler = (logUpdate, exit) => (config, state) => (str, key) => {
  if (key.ctrl && (key.name === 'c' || key.name === 'd')) {
    logUpdate.done();
    logUpdate(c.red(`Exiting ${c.bold('kinesis-listener')}`));
    exit();
  }
  if (key.ctrl && key.name === 'l') {
    logUpdate(`${'\r\n'.repeat(process.stdout.getWindowSize()[1])}\u001B[0f`);
    logUpdate.done();
    logUpdate(view(config, state));
  }
  if (key.name === 'return') {
    logUpdate(checkpoint(config, state));
    logUpdate.done();
    logUpdate(view(config, state));
  }
  // TODO add help message for ?
};

const setUpKeyboardInteraction = (logUpdate, exit) => (config, state) => {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', keypressHandler(logUpdate, exit)(config, state));
  process.stdin.resume();
};

module.exports = {
  view: view(detailedViews),
  checkpoint,
  keypressHandler,
  setUpKeyboardInteraction,
  detailedViews
};
