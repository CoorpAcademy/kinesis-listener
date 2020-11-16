const inquirer = require('inquirer');

const prompt = inquirer.createPromptModule();

const promptForStream = async listOfStream => {
  const streamPrompt = await prompt({
    type: 'list',
    name: 'stream',
    choices: listOfStream,
    message: 'Select which stream you want to listen:'
  });
  return streamPrompt.stream;
};

module.exports = kinesis => {
  const getListOfStream = async () => {
    const {StreamNames} = await kinesis.listStreams().promise();
    return StreamNames;
  };

  const selectStream = async () => promptForStream(await getListOfStream());

  return {getListOfStream, promptForStream, selectStream};
};
