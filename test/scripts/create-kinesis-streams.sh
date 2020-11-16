#!/bin/sh

AWS_ENDPOINT_URL=${AWS_ENDPOINT_URL:-http://localhost:4567}

echo "Ensuring Kinesis streams are set up"
STREAMS="${KINESIS_STREAMS}";
SHARD_COUNT="${KINESIS_SHARD_COUNT:-1}";
for STREAM_NAME in $STREAMS
do
    until aws kinesis --endpoint-url ${AWS_ENDPOINT_URL}  describe-stream --stream-name ${STREAM_NAME}  > /dev/null 2> /dev/null
    do
    echo "Creating stream $STREAM_NAME"
    aws kinesis --endpoint-url ${AWS_ENDPOINT_URL} create-stream \
        --stream-name ${STREAM_NAME} \
        --shard-count $SHARD_COUNT \
        > /dev/null 2> /dev/null
    done
done
echo 'Kinesis streams are set up!'
