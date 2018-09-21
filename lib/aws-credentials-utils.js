const AWS = require('aws-sdk');
const c = require('chalk');

const customChain = new AWS.CredentialProviderChain();
customChain.providers.push(() => {
  // eslint-disable-next-line no-console
  console.log(`${c.bold.red('WARNING:')} you are relying on default auth!'`);
  return new AWS.Credentials('undefined', 'undefined');
});

module.exports.customChain = customChain;
