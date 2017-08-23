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

const timestampProcessor = state = state => record => {
    state.timestampLastReceived = new Date();
}
module.exports.counterProcessor = counterProcessor;
module.exports.lastRecordProcessor = lastRecordProcessor;
module.exports.lastJsonRecordProcessor = lastJsonRecordProcessor;
module.exports.timestampProcessor = timestampProcessor;
module.exports.ALL = [counterProcessor, lastRecordProcessor, lastJsonRecordProcessor, timestampProcessor]
