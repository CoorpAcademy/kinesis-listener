const counterProcessor = state => record => {
    state.count = (state.count || 0) + 1;
}

const lastRecordProcessor = state => record => {
    state.lastRecord = record;
}

const lastJsonRecordProcessor = state => record => {
    try {
        state.lastJsonRecord = JSON.parse(record);
    } catch (err) {
        state.lastJsonRecord = undefined;
    }
}

const timestampProcessor = state => record => {
    state.timestampLastReceived = new Date();
}

const streamProcessor = stream => state => record => {
    // TODO: info that is streaming to x file? / message
    stream.write(record);
    stream.write('\n');
}

module.exports.counterProcessor = counterProcessor;
module.exports.lastRecordProcessor = lastRecordProcessor;
module.exports.lastJsonRecordProcessor = lastJsonRecordProcessor;
module.exports.timestampProcessor = timestampProcessor;
module.exports.streamProcessor = streamProcessor;
module.exports.BASICS = [counterProcessor, lastRecordProcessor, lastJsonRecordProcessor, timestampProcessor]
