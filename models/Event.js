const mongoose = require('mongoose');

const Event = mongoose.model('Event', {    
    plate: String,
    readingLength: Number,
    arised: Date,
    fatalityLikelyhood: Number,
    impactSpeed: Number,
    readings: {
        type: [Object],
        required: true
    }
});

// reading:
// struct MpuState {
//     float q0, q1, q2, q3; 
//     float maxAcceleration;
//     unsigned long timestamp; 
// };

module.exports = Event;