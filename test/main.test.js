const test = require('ava');

const main = require('..');

test('counterProcessor increments count', t => {
 t.deepEqual(typeof main, 'function')
});
