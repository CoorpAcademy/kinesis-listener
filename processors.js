const counterProcessor = state => record => {
    state.count = (state.count || 0) + 1;
}

const lastRecordProcessor = state => record => {
    state.lastRecord = record.Data;
}

const lastJsonRecordProcessor = state => record => {
    try {
        state.lastJsonRecord = JSON.parse(record.Data);
    } catch (err) {
        state.lastJsonRecord = undefined;
    }
}

const timestampProcessor = state => record => {
    state.timestampLastReceived = record.ApproximateArrivalTimestamp;
}

const streamProcessor = stream => state => record => {
    // TODO: info that is streaming to x file? / message
    stream.write(record.Data);
    stream.write('\n');
}

module.exports.counterProcessor = counterProcessor;
module.exports.lastRecordProcessor = lastRecordProcessor;
module.exports.lastJsonRecordProcessor = lastJsonRecordProcessor;
module.exports.timestampProcessor = timestampProcessor;
module.exports.streamProcessor = streamProcessor;
module.exports.BASICS = [counterProcessor, lastRecordProcessor, lastJsonRecordProcessor, timestampProcessor]
