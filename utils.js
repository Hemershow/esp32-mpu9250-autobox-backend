const puppeteer = require('puppeteer');
const ffmpeg = require('fluent-ffmpeg');
const MpuState = require('./models/MpuState');
const fs = require('fs');
const { performance } = require('perf_hooks');
const fsPromises = require('fs').promises;
const path = require('path');
const videoshow = require('videoshow')
const { exec } = require('child_process');
const EventVideo = require('./models/EventVideo');
const axios = require('axios');

async function requestVideo(event) {
  try {
    const response = await axios.post(`${process.env.NGROK_VIDEO_URL}`, event);
    return response;
  } catch (error) {
    console.error('Error getting video:', error);
  }
}

function slerp(mpuState1, mpuState2, t) {
    let w1 = mpuState1.q0;
    let x1 = mpuState1.q1;
    let y1 = mpuState1.q2;
    let z1 = mpuState1.q3;

    let w2 = mpuState2.q0;
    let x2 = mpuState2.q1;
    let y2 = mpuState2.q2;
    let z2 = mpuState2.q3;

    let cosTheta = w1*w2 + x1*x2 + y1*y2 + z1*z2;
    let angle = Math.acos(cosTheta);
    
    if (cosTheta < 0) {
        w2 = -w2;
        x2 = -x2;
        y2 = -y2;
        z2 = -z2;
        cosTheta = -cosTheta;
    }
    
    if (1 - cosTheta > 0.001) {
        let sinTheta = Math.sqrt(1 - cosTheta*cosTheta);
        let angleDivSinTheta = angle / sinTheta;
        let ratioA = Math.sin((1 - t) * angleDivSinTheta);
        let ratioB = Math.sin(t * angleDivSinTheta);

        return new MpuState(
            (w1 * ratioA + w2 * ratioB), 
            (x1 * ratioA + x2 * ratioB), 
            (y1 * ratioA + y2 * ratioB), 
            (z1 * ratioA + z2 * ratioB), 
            (mpuState1.maxAcceleration + mpuState2.maxAcceleration)/2, 
            (mpuState1.timestamp + mpuState2.timestamp)/2, 
        )
    } else {
        return new MpuState(
            (w1 * (1 - t) + w2 * t), 
            (x1 * (1 - t) + x2 * t), 
            (y1 * (1 - t) + y2 * t), 
            (z1 * (1 - t) + z2 * t), 
            (mpuState1.maxAcceleration + mpuState2.maxAcceleration)/2, 
            (mpuState1.timestamp + mpuState2.timestamp)/2, 
        )
    }
}

function interpolateMpuStates(mpuStates) {
    let result = [];

    for (let i = 0; i < mpuStates.length - 1; i++) {
        result.push(mpuStates[i]);
        result.push(slerp(mpuStates[i], mpuStates[i+1], 0.5))
    }

    result.push(mpuStates[mpuStates.length - 1]);

    return result;
}

module.exports = {
    getVideo: async function getVideo(event)
    {
        return await requestVideo(event);
    },
    interpolate: function interpolateMpus(mpuStates)
    {
        return interpolateMpuStates(mpuStates)
    }
};