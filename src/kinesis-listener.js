const c = require('chalk');
const _ = require('lodash/fp');
const pMap = require('p-map');
const delay = require('delay');

const logUpdate = require('log-update');
const logSymbols = require('log-symbols');

const cliView = require('./cli-view');

module.exports = (kinesis, settings) => {
  const {state, config} = settings;

  const readIterator = recordProcessors => async ({ShardId, ShardIterator}) => {
    const data = await kinesis.getRecords({ShardIterator, Limit: config.batchSize}).promise();
    const iterator = data.NextShardIterator;
    const context = {
      ShardId,
      ShardIterator,
      nRecords: data.Records.length
    };
    // TODO: see MillisBehind Latest to determine batchsize?
    const records = _.map(
      record => Object.assign(record, {Data: Buffer.from(record.Data, 'base64').toString('utf-8')}),
      data.Records
    );
    _.forEach(recordProcessor => _.map(recordProcessor(state, context), records), recordProcessors);
    // maybe: later async record processor
    return {ShardId, ShardIterator: iterator};
  };

  const getStreamShards = async kinesisStream => {
    const streamConfig = await kinesis.describeStream({StreamName: kinesisStream}).promise();
    const shardsIds = _.map('ShardId', streamConfig.StreamDescription.Shards);
    config.shardsIds = shardsIds;
    return shardsIds;
  };

  const launchListener = async conf => {
    const shards = await getStreamShards(config.kinesisStream);
    const shardIterators = await pMap(shards, async shardId => {
      const {ShardIterator} = await kinesis
        .getShardIterator({
          StreamName: conf.kinesisStream,
          ShardId: shardId,
          ShardIteratorType: conf.ShardIteratorType,
          Timestamp: conf.Timestamp
        })
        .promise();
      return {ShardId: shardId, ShardIterator};
    });

    const kinesisIterator = readIterator(conf.processorsList);

    const readLoop = async initialIterators => {
      const [iterators] = await Promise.all([
        pMap(initialIterators, kinesisIterator),
        delay(conf.fetchInterval)
      ]);
      return readLoop(iterators);
    };
    const printLoop = async () => {
      logUpdate(cliView.view(config, state));
      await delay(config.updateRate);
      return printLoop();
    };
    return Promise.all([readLoop(shardIterators), printLoop()]);
  };

  const resilientListener = async conf => {
    try {
      await launchListener(conf);
    } catch (err) {
      if (
        !_.includes(err.code, [
          'ProvisionedThroughputExceededException',
          'ExpiredIteratorException'
        ])
      )
        throw err;
      logUpdate(`${logSymbols.error} ${c.red.bold('Error Occured')}
  ${err.message}
${logSymbols.info} ${c.blue.bold('Relaunching listener')}`);
      logUpdate.done();
      return resilientListener(conf);
    }
  };

  return {
    readIterator,
    getStreamShards,
    launchListener,
    resilientListener
  };
};
