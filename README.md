kinesis-listener
================
[![Build Status](https://travis-ci.com/CoorpAcademy/kinesis-listener.svg?token=KnYzxEMEXjZwczDR8x2L&branch=master)](https://travis-ci.com/CoorpAcademy/kinesis-listener)

`kinesis-listener` is a cli to listen to kinesis stream and have
an idea of the messages that transit

## Installation

Install it globaly with npm 

```sh
npm install -g @coorpacademy/kinesis-listener
```

then you can call it with a simple

```
kinesis-listener my-kinesis [--options]
```


## Usage

`kinesis-listener` is to be invoked with the desired option.
It will run in the foreground keeping a dashboard updated with the 
last record received:

```
⠴ Listening my-kinesis kinesis
   - stream with 3 shards: shardId-000000000032, shardId-000000000036, shardId-000000000042
   - received so far 42 records (12, 10, 20)
   - Speed Estimation: ▹▹▹▹▸
   - last received record a few seconds ago (at 2017-08-28T14:18:05+02:00) :
     { message: 'last message so far' }
```

At any time you can exit with a <kbd>Ctrl-C</kbd> or <kbd>Ctrl-D</kbd>.

If you it <kbd>RETURN</kbd> it will print a checkpoint with the last 
message received. This checkpoint wont be erase.

With <kbd>Ctrl-L</kbd> you can recenter the program to the dashboard and 
hence hide the last checkpoint. this will not erase them 

By default `kinesis-listener` start to listen now, but it possible to start at 
*TRIM_HORIZON* with option `-H/---horizon`, or to precise some relative time with
the retro option `-r/--retro` (ex: `-r=4m12s`, `--retro 2h`).

By default `kinesis-listener` only display the last message, but it's possible to forward them 
to a file with the `-f/--forward` option, `/tmp/kinesis-listener.log` with can be 
customized with the `-F/--filename` option.

### Detailled options:

```
Usage: kinesis-listener [kinesis-stream-name]

Options:
  -h, --help          Show help                                        [boolean]
  -e, --endpoint      Specify an alternative endpoint for the kinesis sdk
                                                                        [string]
  -f, --forward       Forward kinesis record to file                   [boolean]
  -F, --filename      Filename to Forward kinesis records               [string]
  -r, --retro         Start to read "00h11m2s" time ago                 [string]
  -H, --horizon       Trim Horizon read                                [boolean]
  -R, --refresh-rate  Refresh rate of the dashboard, in time per second (default
                      10)                                               [number]
  -b, --batch-size    Size of batch for each kinesis getRecord (default 100)
                                                                        [number]
  -t, --time-format   Format to print date with                         [string]
  -d, --day-format    Use hh:mm:ss day date format                     [boolean]

Examples:
  index.js log-stream --filename dump.log

```
