const test = require('ava');
const stripAnsi = require('strip-ansi');

const {checkpoint, view} = require('../../src/cli-view');

const BASIC_CONFIG = {
  kinesisStream: 'test-stream'
};
const EMPTY_STATE = {count: 0, shardCount: []};

test('basic checkpoint with no record', t => {
  const checkpointView = checkpoint(BASIC_CONFIG, EMPTY_STATE);
  t.regex(checkpointView, /Checkpoint at .*: No record received so far/);
});

test.todo('check checkpoint with no new record');
test.todo('checkpoint with some new record');

test('view with no record', t => {
  const dashboardView = stripAnsi(view(BASIC_CONFIG, EMPTY_STATE));
  t.regex(dashboardView, /Listening test-stream kinesis/);
  t.regex(dashboardView, /- stream with /);
  t.regex(dashboardView, /- received so far 0 records/);
});
view; // TODO do not please linter, write test!
test.todo('view with some record');
test.todo('view with file streaming');
