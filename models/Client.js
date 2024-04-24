const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clientSchema = new Schema({
    name: String,
    email: String,
    number: String,
    status: String,
    lastLocation: String,
    lastUpdated: Date,
    vehicle: String,
    plate: String
});

clientSchema.index({
    vehicle: 'text',
    plate: 'text',
    name: 'text',
    status: 'text'
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;