const _ = require('lodash');
const c = require('chalk');
const indentString = require('indent-string');
const util = require('util');

const view = state =>
`${
c.bold(`${c.red('►')} Listening ${c.blue.underline(state.kinesisStream)} kinesis`)}
  - stream with ${c.blue.bold(state.shardsIds.length) } shards: ${c.dim.grey(state.shardsIds.join(', '))}
  - received so far ${c.blue.bold(state.count || 0)} records
${!state.count ? '':
`  - last received record (at ${c.dim.grey(state.timestampLastReceived)}) :
${util.inspect(_.omit(state.lastJsonRecord, ['content']), {depth: null, colors: true})}`
                    }`; // TODO: handle pading

module.exports = view
