const YAMLParser = require('./YAMLParser').Parser;

module.exports.FileParser = (filePath) => {
  let events = {};

  function GetFileExtension(file) {
    return (file.match(/[^\\/]\.([^\\/.]+)$/) || [null]).pop();
  }

  if (filePath) {
    const fileExtension = GetFileExtension(filePath).toLowerCase();
    switch (fileExtension) {
      case 'yml':
      case 'yaml':
        events = YAMLParser(filePath);
        break;

      case 'json':
      case 'js':
        events = require(filePath);
        break;

      default:
        throw new Error('Invalid format!');
    }
  } else {
    throw new Error('No config file path found!');
  }

  return events;
};
