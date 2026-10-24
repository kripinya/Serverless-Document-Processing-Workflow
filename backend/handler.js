const serverless = require('serverless-http');
const app = require('./src/app');

module.exports.api = serverless(app);
