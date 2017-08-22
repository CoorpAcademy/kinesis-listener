const logUpdate = require('log-update');
const _ = require('lodash');
const util = require('util');

const counterProcessor = (updateCount = console.log) => {
    let count = 0;
    return record => {
        count++;
        updateCount(count);
    }
}

// const simpleLogProcessor

const lastItemAndCountProcessor = () => {
    let count = 0;
    return record => {
        count++;
        logUpdate(`${count} records received so far, last record:
${util.inspect(_.omit(record, ['content']), {depth: null, colors: true})}
`
        );
    }

}

module.exports.counterProcessor = counterProcessor;
module.exports.lastItemAndCountProcessor = lastItemAndCountProcessor;
