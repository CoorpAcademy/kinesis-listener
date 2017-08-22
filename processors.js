const logUpdate = require('log-update');

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
        logUpdate(`
${count} records received so far, last record:
${record}           
`
        );
    }

}

module.exports.counterProcessor = counterProcessor;
module.exports.lastItemAndCountProcessor = lastItemAndCountProcessor;
