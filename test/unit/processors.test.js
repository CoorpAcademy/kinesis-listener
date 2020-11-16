const test = require('ava');

const {counterProcessor} = require('../../src/processors');

const emptyRecord = {};
const context = {ShardId: 'sha1'};

test('counterProcessor increments count', t => {
  const state = {count: 3, shardCount: {sha1: 3}};
  const processor = counterProcessor(state, context);

  processor(emptyRecord);
  t.is(state.count, 4);
  t.is(state.shardCount.sha1, 4);

  processor(emptyRecord);
  t.is(state.count, 5);
  t.is(state.shardCount.sha1, 5);
});

test('counterProcessor start increment when no count', t => {
  const state = {shardCount: {}};
  const processor = counterProcessor(state, context);

  processor(emptyRecord);
  t.is(state.count, 1);
  t.is(state.shardCount.sha1, 1);
});
