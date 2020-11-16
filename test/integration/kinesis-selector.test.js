const test = require('ava');
const {Kinesis} = require('aws-sdk');

const kinesisSelector = require('../../src/kinesis-selector');

const testKinesis = new Kinesis({
  apiVersion: '2013-12-02',
  endpoint: 'http://localhost:4567',
  region: process.env.AWS_REGION || 'eu-west-1',
  accessKeyId: 'local',
  secretAccessKey: 'local'
});

test('getListOfStream see the kinesis', async t => {
  const {getListOfStream} = kinesisSelector(testKinesis);
  t.is(typeof getListOfStream, 'function');
  t.deepEqual(await getListOfStream(), ['kinesis-test-one', 'kinesis-test-two']);
});
