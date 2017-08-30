const test = require('ava');

const {checkpoint, view} = require('../lib/cli-view');


test('basic checkpoint with no record', t => {
  const checkpointView = checkpoint({}, {});
  t.true(/Checkpoint at .*: No record received so far/.test(checkpointView) )
});

test.todo('check checkpoint with no new record');
test.todo('checkpoint with some new record');

test.todo('view with no record');
test.todo('view with some record');
test.todo('view with file streaming');
