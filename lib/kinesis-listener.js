const c = require('chalk');
const _ = require('lodash/fp');
const Promise = require('bluebird');

const logUpdate = require('log-update');

const cliView = require('./cli-view');

module.exports = (kinesis, settings) => {
  const {state, config} = settings;

  const readIterator = recordProcessors => ({ShardId, ShardIterator}) => {
    return kinesis.getRecordsP({ShardIterator, Limit: config.batchSize}).then(data => {
      const iterator = data.NextShardIterator;
      const context = {
        ShardId,
        ShardIterator,
        nRecords: data.Records.length
      };
      // TODO: see MillisBehind Latest to determine batchsize?
      const records = _.map(
        record =>
          Object.assign(record, {Data: Buffer.from(record.Data, 'base64').toString('utf-8')}),
        data.Records
      );
      _.forEach(
        recordProcessor => _.map(recordProcessor(state, context), records),
        recordProcessors
      );
      // maybe: later async record processor
      return {ShardId, ShardIterator: iterator};
    });
  };

  const getStreamShards = kinesisStream =>
    kinesis.describeStreamP({StreamName: kinesisStream}).then(streamConf => {
      const shardsIds = _.map('ShardId', streamConf.StreamDescription.Shards);
      config.shardsIds = shardsIds;
      return shardsIds;
    });

  const launchListener = conf =>
    getStreamShards(config.kinesisStream)
      .map(shardId =>
        kinesis
          .getShardIteratorP({
            StreamName: conf.kinesisStream,
            ShardId: shardId,
            ShardIteratorType: conf.ShardIteratorType,
            Timestamp: conf.Timestamp
          })
          .then(si => ({ShardId: shardId, ShardIterator: si.ShardIterator}))
      )
      .then(shardIterators => {
        const kinesisIterator = readIterator(conf.processorsList);

        const readLoop = initialIterators => {
          return Promise.all([
            Promise.map(initialIterators, kinesisIterator),
            Promise.delay(conf.fetchInterval)
          ])
            .then(([iterators, noop]) => iterators)
            .then(readLoop);
        };
        const printLoop = () => {
          logUpdate(cliView.view(config, state));
          return Promise.delay(config.updateRate).then(printLoop);
        };
        return Promise.all([readLoop(shardIterators), printLoop()]);
      });

  const resilientListener = conf =>
    launchListener(conf).catch(
      err =>
        _.includes(err.code, [
          'ProvisionedThroughputExceededException',
          'ExpiredIteratorException'
        ]),
      err => {
        logUpdate.clear();
        /* eslint-disable no-console */
        console.log(c.red.bold('Error Occured'));
        console.log(err.message);
        console.log(c.blue.bold('Relaunching listener'));
        return resilientListener(conf);
        /* eslint-enable no-console */
      }
    );

  return {
    readIterator,
    getStreamShards,
    launchListener,
    resilientListener
  };
};
