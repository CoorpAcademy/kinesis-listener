

const counterProcessor = () => {
    let count = 0;
    return record => {
        count++;
        console.log(`${count} records so far`);
    }
}


module.exports.counterProcessor = counterProcessor;
