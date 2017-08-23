const _ = require('lodash');
const c = require('chalk');
const indentString = require('indent-string');
const util = require('util');
const cliSpinners = require('cli-spinners');

const timeSpinner = cliSpinners.dots; // later option
const speedSpinner = cliSpinners.arrow3;

const view = state =>
`${
c.bold(`${c.red(timeSpinner.frames[Math.floor(new Date().getTime() / timeSpinner.interval) % timeSpinner.frames.length])
} Listening ${c.blue.underline(state.kinesisStream)} kinesis`)}
  - stream with ${c.blue.bold(state.shardsIds.length) } shards: ${c.dim.grey(state.shardsIds.join(', '))}
  - received so far ${c.blue.bold(state.count || 0)} records
${!state.count ? '':
`  - Speed Estimation: ${c.bold.yellow(speedSpinner.frames[state.count % speedSpinner.frames.length])}
  - last received record (at ${c.dim.grey(state.timestampLastReceived)}) :
${indentString(util.inspect(_.omit(state.lastJsonRecord, ['content']), {depth: null, colors: true}), 4)}`}`;

module.exports = view
