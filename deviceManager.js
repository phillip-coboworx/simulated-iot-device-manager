require('dotenv').config();
const device = require('./device');

const deviceConfigFiles = ['./config_files/eventsDev1.yml', './config_files/eventsDev2.yml']
// const deviceConfigFiles = ['./config_files/eventsDev1.yml'];

const connectionStrings = process.env.CONNECTION_STRINGS.split(' ');
const deviceIds = connectionStrings.map((conn) => conn
  .split(';')
  .find((params) => params.split('=')[0] === 'DeviceId')
  .split('=')[1]);

for (let i = 0; i < connectionStrings.length; i += 1) {
  device(connectionStrings[i], deviceIds[i], deviceConfigFiles[i], false);
}
