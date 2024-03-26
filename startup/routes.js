const express = require('express');
const client = require('../routes/client');
const event = require('../routes/event');

module.exports = function(app) {
    app.use(express.json());
    app.use('/api/client', client);
    app.use('/api/event', event);
}