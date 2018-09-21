const test = require('ava');

const main = require('..');

test('main is a function', t => {
  t.deepEqual(typeof main, 'function');
});
