

const counterProcessor = (updateCount = console.log) => {
    let count = 0;
    return record => {
        count++;
        updateCount(count);
    }
}



module.exports.counterProcessor = counterProcessor;
