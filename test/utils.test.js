const test = require('ava');
const moment = require('moment');

const {parseRetroDate} = require('../lib/utils');

const noms = (date) => date.format('MMMM Do YYYY, h:mm:ss')

test('simple retro date', t => {
  const douzeHoursAgo = moment().subtract(12, 'hours');
  const computedRetro = moment(parseRetroDate('12h'));
  t.deepEqual(noms(douzeHoursAgo), noms(computedRetro));
});

test('simple retro date', t => {
  const taleur = moment().subtract(2, 'hours').subtract(14, 'minutes').subtract(3, 'seconds');
  const computedRetro = moment(parseRetroDate('2h14m3s'));
  t.deepEqual(noms(taleur), noms(computedRetro));
});

test('invalid retro date', t => {
  t.throws(() => parseRetroDate('bullshit'));
  t.throws(() => parseRetroDate('146o'));
  t.throws(() => parseRetroDate('d12m'));
  t.throws(() => parseRetroDate('12'));
});
