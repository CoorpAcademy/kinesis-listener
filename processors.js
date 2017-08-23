const c = require('chalk');
const _ = require('lodash');
const logUpdate = require('log-update');
const util = require('util');

const counterProcessor = (state) => {
    let count = 0;
    return record => {
        count++;
        state.count = count;
    }
}

// const simpleLogProcessor

const lastRecordProcessor = (state) => {
    return record => {
        state.lastRecord = record;
    }
}

const lastJsonRecordProcessor = (state) => {
    return record => {
        try {
            state.lastJsonRecord = JSON.parse(record);
        } catch(err) {
            state.lastJsonRecord = undefined;
        }
    }
}

module.exports.counterProcessor = counterProcessor;
module.exports.lastRecordProcessor = lastRecordProcessor;
module.exports.lastJsonRecordProcessor = lastJsonRecordProcessor;
module.exports.ALL = [counterProcessor, lastRecordProcessor, lastJsonRecordProcessor]
