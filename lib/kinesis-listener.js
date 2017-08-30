const c = require('chalk');
const _ = require('lodash');

module.exports = (kinesis, STATE) => {


  const readIterator = recordProcessors => ({ShardId, ShardIterator}) => {
    return kinesis.getRecordsP({ShardIterator, Limit: batchSize})
      .then(data => {
        const iterator = data.NextShardIterator;
        const context = {
          ShardId, ShardIterator, nRecords: data.Records.length
        };
        // TODO: see MillisBehind Latest to determine batchsize?
        const records = _.map(data.Records,
          record => Object.assign(record, {Data: new Buffer(record.Data, 'base64').toString('utf-8')}));
        _.map(recordProcessors, recordProcessor => _.map(records, recordProcessor(STATE, context)));
        // maybe: later async record processor
        return {ShardId, ShardIterator: iterator};
      })
  };

  const getStreamShards = (kinesisStream) => kinesis.describeStreamP({StreamName: kinesisStream})
    .then(streamConf => {
      const shardsIds = _.map(streamConf.StreamDescription.Shards, 'ShardId');
      STATE.shardsIds = shardsIds;
      return shardsIds;
    });

  const launchListener = (kinesisStream) => getStreamShards(kinesisStream)
    .map(shardId => kinesis.getShardIteratorP({
      StreamName: kinesisStream,
      ShardId: shardId, // TODO: type later configurable -> X minutes ago
      ShardIteratorType,
      Timestamp
    }).then(si => ({ShardId: shardId, ShardIterator: si.ShardIterator})))
    .then((shardIterators) => {
      const kinesisIterator = readIterator(processorsList);
      const readLoop = (initialIterators) => {
        // TODO graceful STOP
        return Promise.map(initialIterators, kinesisIterator)
          .then(readLoop)
      }
      const printLoop = () => {
        logUpdate(cliView.view(STATE));
        return Promise.delay(updateRate).then(printLoop);
      }

      return Promise.all([readLoop(shardIterators), printLoop()]);
    });

  const resilientListener = (kinesisStream) =>
    launchListener(kinesisStream).catch(
      err => _.includes(['ProvisionedThroughputExceededException', 'ExpiredIteratorException'], err.code),
      err => {
        logUpdate.clear()
        console.log(c.red.bold('Error Occured'));
        console.log(err.message);
        console.log(c.blue.bold('Relaunching listener'));
        return resilientListener()
      });


  return {
    readIterator, getStreamShards, launchListener, resilientListener
  }

}
