const express = require('express');
const cors = require('cors');
const http = require('http');
const url = require('url');
const fs = require('fs');
const { initializeWebSocketServer } = require('./config/websocketManager');

const app = express();

app.use(cors({ origin: '*' }));

require('dotenv').config();
require('./startup/db')();
require('./startup/routes')(app);

const port = 8080;
const server = http.createServer(app);

initializeWebSocketServer(server);

server.listen(port, () => console.log(`Listening on port ${port}`));

module.exports = server;