const counterProcessor = (state, context) => record => {
  state.count = (state.count || 0) + 1;
  state.shardCount[context.ShardId] = (state.shardCount[context.ShardId] || 0) + 1;
};

const lastRecordProcessor = state => record => {
  state.lastRecord = record.Data;
};

const lastJsonRecordProcessor = state => record => {
  try {
    state.lastJsonRecord = JSON.parse(record.Data);
  } catch (err) {
    state.lastJsonRecord = undefined;
  }
};

const timestampProcessor = state => record => {
  state.timestampLastReceived = record.ApproximateArrivalTimestamp;
};

const streamProcessorMaker = (stream, file, message) => state => {
  state.fileStreaming = true;
  state.fileStreamingFile = file;
  state.fileStreamingMessage = 'Streaming record to specified file';
  return record => {
    // TODO: info that is streaming to x file? / message
    stream.write(record.Data);
    stream.write('\n');
  };
};

module.exports.counterProcessor = counterProcessor;
module.exports.lastRecordProcessor = lastRecordProcessor;
module.exports.lastJsonRecordProcessor = lastJsonRecordProcessor;
module.exports.timestampProcessor = timestampProcessor;
module.exports.streamProcessorMaker = streamProcessorMaker;
module.exports.BASICS = [
  counterProcessor,
  lastRecordProcessor,
  lastJsonRecordProcessor,
  timestampProcessor
];
