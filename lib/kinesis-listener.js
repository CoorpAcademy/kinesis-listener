const c = require('chalk');
const _ = require('lodash');
const Promise = require('bluebird');

const logUpdate = require('log-update');

const cliView = require('./cli-view');

module.exports = (kinesis, settings) => {
  const {state, config} = settings;

  const readIterator = recordProcessors => ({ShardId, ShardIterator}) => {
    return kinesis.getRecordsP({ShardIterator, Limit: config.batchSize})
      .then(data => {
        const iterator = data.NextShardIterator;
        const context = {
          ShardId, ShardIterator, nRecords: data.Records.length
        };
        // TODO: see MillisBehind Latest to determine batchsize?
        // console.log(JSON.stringify(data.Records, null, 4));
        const records = _.map(data.Records,
          record => Object.assign(
            record,
            record.Data ? {
              Data: new Buffer(record.Data, 'base64').toString('utf-8')
            }: record.dynamodb
          )
        );
        _.map(recordProcessors, recordProcessor => _.map(records, recordProcessor(state, context)));
        // maybe: later async record processor
        return {ShardId, ShardIterator: iterator};
      })
  };

  const getStreamShards = kinesisStream =>
    kinesis.describeStreamP({
      StreamName: kinesisStream
    }).catch(() =>
      kinesis.describeStreamP({
        StreamArn: kinesisStream
      })
    ).then(streamConf => {
      console.log(JSON.stringify({streamConf}, null, 4))
      const shardsIds = _.map(streamConf.StreamDescription.Shards, 'ShardId');
      config.shardsIds = shardsIds;
      return shardsIds;
    });

  const launchListener = conf => console.log(JSON.stringify({conf}, null, 4))||getStreamShards(config.kinesisStream)
    .map(shardId => console.log(JSON.stringify({shardId}, null, 4))||kinesis.getShardIteratorP({
      StreamName: conf.kinesisStream,
      ShardId: shardId,
      ShardIteratorType: conf.ShardIteratorType,
      Timestamp: conf.Timestamp
    }).catch(() =>
      kinesis.getShardIteratorP({
        StreamArn: conf.kinesisStream,
        ShardId: shardId,
        ShardIteratorType: conf.ShardIteratorType
        // Timestamp: conf.Timestamp
      })
    ).then(si => ({ShardId: shardId, ShardIterator: si.ShardIterator})))
    .then((shardIterators) => {
      const kinesisIterator = readIterator(conf.processorsList);

      const readLoop = (initialIterators) => {
        return Promise.all([
          Promise.map(initialIterators, kinesisIterator),
          Promise.delay(conf.fetchInterval)
        ]).then(([iterators, noop]) => iterators)
          .then(readLoop)
      };
      const printLoop = () => {
        logUpdate(cliView.view(config, state));
        return Promise.delay(config.updateRate).then(printLoop);
      };
      return Promise.all([readLoop(shardIterators), printLoop()]);
    });

  const resilientListener = conf =>
    launchListener(conf).catch(
      err => _.includes(['ProvisionedThroughputExceededException', 'ExpiredIteratorException'], err.code),
      err => {
        logUpdate.clear()
        console.log(c.red.bold('Error Occured'));
        console.log(err.message);
        console.log(c.blue.bold('Relaunching listener'));
        return resilientListener(conf)
      });

  return {
    readIterator, getStreamShards, launchListener, resilientListener
  }

}
