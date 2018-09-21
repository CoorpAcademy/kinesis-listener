#!/usr/bin/env node
/* eslint-disable no-console, unicorn/process-exit */

const AWS = require('aws-sdk');
const Promise = require('bluebird');
const c = require('chalk');
const _ = require('lodash/fp');
const logUpdate = require('log-update');
const {getSettings, getOptions} = require('./lib/settings');
const {customChain} = require('./lib/aws-credentials-utils');
const cliView = require('./lib/cli-view');

const argv = getOptions();
const kinesis = Promise.promisifyAll(
  new AWS.Kinesis({
    apiVersion: '2013-12-02',
    endpoint: argv.endpoint,
    credentialProvider: customChain,
    region: process.env.AWS_REGION || 'eu-west-1'
  }),
  {suffix: 'P'}
);

const settings = getSettings(argv, kinesis);

const {resilientListener} = require('./lib/kinesis-listener')(kinesis, settings);
const {selectStream} = require('./lib/kinesis-selector')(kinesis);

const main = () => {
  const streamNameP = settings.config.kinesisStream
    ? Promise.resolve(settings.config.kinesisStream)
    : selectStream();
  return streamNameP.then(kinesisStream => {
    settings.config.kinesisStream = kinesisStream;
    cliView.setUpKeyboardInteraction(logUpdate, () => process.exit(0))(
      settings.config,
      settings.state
    );

    return resilientListener(settings.config).catch(err => {
      if (err.name === 'ResourceNotFoundException') {
        console.log(err.message);
        process.exit(2);
      } else if (_.includes(err.name, ['UnknownEndpoint', 'NetworkingError'])) {
        if (argv.endpoint)
          console.log(c.red(`Provided Endpoint ${c.bold(argv.endpoint)} is not accessible`));
        else console.log(c.red('Unaccessible AWS region endpoint, check your internet connection'));
        console.log(err.message);
        process.exit(3);
      }
      console.log(c.red('Error Occured forcing us to shut down the program:'));
      console.log(err.message);
      process.exit(1);
    });
  });
};

module.exports = main;

if (!module.parent) {
  main();
}
