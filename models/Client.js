const mongoose = require('mongoose');

const Client = mongoose.model('Client', {    
    name: String,
    email: String,
    number: String,
    status: String,
    lastLocation: String,
    lastUpdated: Date,
    vehicle: String,
    plate: String
});

module.exports = Client;