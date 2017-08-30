const c = require('chalk');
const _ = require('lodash');
const Promise = require('bluebird');
const inquirer = require('inquirer');

const prompt = inquirer.createPromptModule();

module.exports = (kinesis) => {

  const getListOfStream = () => {
    return kinesis.listStreamsP()
      .then(sa => sa.StreamNames)
  }

  const promptForStream = (listOfStream) => {
      return prompt({type: 'list', name: 'stream', choices: listOfStream,
        message: 'Select which stream you want to listen:'})
        .then(res => res.stream)
  }

  const selectStream = () => getListOfStream()
    .then(streams => promptForStream(streams));

  return {getListOfStream, promptForStream, selectStream}
}
