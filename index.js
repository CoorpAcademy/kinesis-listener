const AWS = require('aws-sdk');

const kinesis = new AWS.Kinesis({apiVersion: '2013-12-02'});

const params = {
  // ShardId: 'STRING_VALUE', /* required */
  ShardIteratorType: 'LATEST',
  StreamName: 'bricklane-central-development'
};
kinesis.getShardIterator(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});
