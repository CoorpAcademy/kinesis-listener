const util = require('util');
const readline = require('readline');
const _ = require('lodash/fp');
const c = require('chalk');
const indentString = require('indent-string');
const moment = require('moment');
const cliSpinners = require('cli-spinners');
const logUpdate = require('log-update');

const timeSpinner = cliSpinners.dots; // TODO later option
const speedSpinner = cliSpinners.arrow3;

const timeBasedSpin = (spinner, speedFactor = 1) =>
  spinner.frames[
    Math.floor(new Date().getTime() / spinner.interval * speedFactor) % spinner.frames.length
  ];

// TODO: make the view a combo of title, and list of statuses (that could be reordered and test independantly)
const view = (config, state) =>
  `${c.bold(
    `${c.red(timeBasedSpin(timeSpinner))} Listening ${c.blue.underline(
      config.kinesisStream
    )} kinesis`
  )}
  - stream with ${c.blue.bold(_.size(config.shardsIds))} shards: ${c.dim.grey(
    _.join(', ', config.shardsIds)
  )}
  - received so far ${c.blue.bold(state.count)} records (${c.grey.dim(
    _.map(si => state.shardCount[si] || 0, config.shardsIds).join(', ')
  )})
${
    !state.fileStreaming
      ? ''
      : `  - ${state.fileStreamingMessage} ${c.cyan(timeBasedSpin(timeSpinner, 0.5))} ${
          state.fileStreamingFile ? c.dim.underline(state.fileStreamingFile) : ''
        }
`
  }${
    !state.count
      ? ''
      : `  - Speed Estimation: ${c.bold.yellow(
          speedSpinner.frames[state.count % speedSpinner.frames.length]
        )}
  - last received record ${moment(state.timestampLastReceived).fromNow()} (at ${c.dim.grey(
          moment(state.timestampLastReceived).format(config.dateFormat)
        )}) :
${indentString(
          util.inspect(_.omit(['content'], state.lastJsonRecord), {depth: null, colors: true}),
          // TODO make _.omit a filter function!! (in config)
          4
        )}`
  }`;

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

const setUpKeyboardInteraction = (config, state) => {
  /* eslint-disable no-console, unicorn/no-process-exit */
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && (key.name === 'c' || key.name === 'd')) {
      console.log(c.red(`Exiting ${c.bold('kinesis-listener')}`));
      process.exit(0);
    }
    if (key.ctrl && key.name === 'l') {
      logUpdate.clear();
      console.log(`${'\r\n'.repeat(process.stdout.getWindowSize()[1])}\u001B[0f`);
      logUpdate(view(config, state));
    }
    if (key.name === 'return') {
      logUpdate.clear();
      console.log(checkpoint(config, state));
      logUpdate(view(config, state));
    }
    // TODO add help message for ?
  });
  process.stdin.resume();
  /* eslint-enable no-console unicorn/no-process-exit */
};

module.exports.view = view;
module.exports.checkpoint = checkpoint;
module.exports.setUpKeyboardInteraction = setUpKeyboardInteraction;
