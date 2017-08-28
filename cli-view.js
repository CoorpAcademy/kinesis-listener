const _ = require('lodash');
const c = require('chalk');
const indentString = require('indent-string');
const moment = require('moment');
const util = require('util');
const cliSpinners = require('cli-spinners');

const timeSpinner = cliSpinners.dots; // later option
const speedSpinner = cliSpinners.arrow3;

const timeBasedSpin = (spinner, speedFactor = 1) =>
    spinner.frames[Math.floor(new Date().getTime() / spinner.interval * speedFactor) % spinner.frames.length];

const view = state =>
    `${c.bold(`${c.red(timeBasedSpin(timeSpinner))} Listening ${c.blue.underline(state.kinesisStream)} kinesis`)}
  - stream with ${c.blue.bold(state.shardsIds.length) } shards: ${c.dim.grey(state.shardsIds.join(', '))}
  - received so far ${c.blue.bold(state.count)} records (${
        c.grey.dim(_.map(state.shardsIds, si => state.shardCount[si] || 0).join(', '))})
${!state.fileStreaming ? '' :
        `  - ${state.fileStreamingMessage} ${c.cyan(timeBasedSpin(timeSpinner, 0.5))
            } ${state.fileStreamingFile ? c.dim.underline(state.fileStreamingFile) : ''}
`}${!state.count ? '' :
        `  - Speed Estimation: ${c.bold.yellow(speedSpinner.frames[state.count % speedSpinner.frames.length])}
  - last received record (at ${c.dim.grey(moment(state.timestampLastReceived).format(state.dateFormat))}) :
${indentString(util.inspect(_.omit(state.lastJsonRecord, ['content']), {depth: null, colors: true}), 4)}`}`;

const checkpoint = state => {
    const deltaCount = state.count - (state.lastCheckpointCount || 0);
    state.lastCheckpointCount = state.count;
    return `Checkpoint at ${c.dim.grey(moment().format(state.dateFormat))}: ` +
        (!state.lastJsonRecord ?
            `No record received so far` :
            (!deltaCount ? 'No new record since last checkpoint' :
                `${deltaCount} new records, last being:\n` +
                util.inspect(_.omit(state.lastJsonRecord, ['content']), {depth: null, colors: true})));
};

module.exports.view = view;
module.exports.checkpoint = checkpoint;
