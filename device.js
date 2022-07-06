require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
// const { argv } = require('process');

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const { Client } = require('azure-iot-device');
const { Message } = require('azure-iot-device');
// const passedArguments = require('./utilities/commandLineArgsProcessor').Processor(argv);
const parser = require('./utilities/fileParser');

let events;

let keepAliveSendInterval;
let intervalLimit;
let runInLoop;
let deviceId;

let client = null;
let intervalCount = 0;
let intervalLength;

function devicInit(connectionString, devId, configFilePath, loop) {
  if (connectionString === '') {
    throw new Error('Device connection string not set!');
  }

  events = parser.FileParser(configFilePath);
  deviceId = devId;
  keepAliveSendInterval = events.keep_alive_send_interval;
  intervalLimit = events.intervals.length;
  runInLoop = loop;
  client = Client.fromConnectionString(connectionString, Protocol);
  client.on('connect', connectHandler);
  client.on('error', errorHandler);
  client.on('disconnect', disconnectHandler);
  client.on('message', messageHandler);

  client.open()
    .catch((err) => {
      console.error(`Could not connect: ${err.message}`);
    });
}

function errorHandler(err) {
  disconnectAndCloseConn();
  throw new Error(`Error: ${err}`);
}

function disconnectHandler() {
  client.open().catch((err) => {
    disconnectAndCloseConn();
    throw new Error(`Disconnection Err: ${err}`);
  });
}

function messageHandler(msg) {
  console.log(`Id: ${msg.messageId} Body: ${msg.data}`);
  client.complete(msg, callbackHandler('completed'));
}

function connectHandler() {
  intervalLength = events.intervals[intervalCount].interval_length * 1000 || 2000;
  setTimeout(() => setIntervalActions(), intervalLength);
}

function setIntervalActions() {
  const message = generateMessage();
  console.log(`Sending message: \n ${message.getData()} \n`);
  client.sendEvent(message, callbackHandler('send'));

  intervalCount = runInLoop ? (intervalCount + 1) % intervalLimit : intervalCount += 1;
}

function generateMessage() {
  const intervalEvents = [];
  events.intervals[intervalCount].events.forEach((event) => {
    if (!(event.randomized || false) || Math.random() >= 0.5) {
      intervalEvents.push(
        JSON.stringify(generateMessageContent(event.event_type, event.payload)),
      );
    }
  });

  if ((intervalCount + 1) % keepAliveSendInterval === 0) {
    intervalEvents.push(JSON.stringify(generateMessageContent('keep_alive', { connection_status_code: 1 })));
  }

  const message = new Message(`[${intervalEvents.join(',')}]`);
  console.log(`\nMSSG: ${JSON.stringify(message)}\n`);
  return message;
}

function generateMessageContent(eventType, payload) {
  const data = {};
  data.eventId = uuidv4();
  data.nodeId = deviceId;
  data.timestamp = Date.now();
  data.event = eventType;
  data.payload = payload;

  return data;
}

function callbackHandler(op) {
  return function printResult(err, res) {
    if (err) console.log(`${op} error: ${err.toString()}`);
    if (res) {
      console.log(`${op} status ${res.constructor.name}`);
      if (intervalCount >= intervalLimit) {
        disconnectAndCloseConn();
      } else {
        intervalLength = events.intervals[intervalCount].interval_length * 1000 || 2000;
        setTimeout(() => setIntervalActions(), intervalLength);
      }
    }
  };
}

function disconnectAndCloseConn() {
  client.close();
  process.exit();
}

module.exports = devicInit;
