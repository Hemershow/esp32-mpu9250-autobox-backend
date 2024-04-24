const mongoose = require('mongoose');

const EventVideo = mongoose.model('EventVideo', {    
    plate: String,
    data: String
});


module.exports = EventVideo;