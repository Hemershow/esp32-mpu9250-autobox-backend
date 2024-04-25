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

let browserInstance;
let pagePool = [];
const taskQueue = [];
const maxPages = 20;

async function getOrCreatePage() {
    if (pagePool.length < maxPages) {
        const page = await browserInstance.newPage();
        page.isInUse = false;
        pagePool.push(page);
    }
}

async function launchBrowser() {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: true,
            
        });
    }
}

async function processQueue() {
    pagePool.forEach(async (page) => {
        if (!page.isInUse && taskQueue.length > 0) {
            const task = taskQueue.shift();
            page.isInUse = true;
            try {
                await task(page);
            } finally {
                page.isInUse = false;
                processQueue(); 
            }
        }
    });
}

async function deleteFiles(videoImages) {
    for (let i = 0; i < videoImages.length; i++) {
        try {
            await fsPromises.unlink(videoImages[i]);
        } catch (err) {
            console.error(`Error deleting file ${videoImages[i]}:`, err);
        }
    }
}

function enqueueTask(task) {
    taskQueue.push(task);
    processQueue(); 
}

function captureFrame(index, plate, q0, q1, q2, q3) {
    return new Promise((resolve, reject) => {
        const task = async (page) => {
            try {
                let url = `https://autobox-videobackend.onrender.com/${q2},${q3},${q1},${q0}`;
                await page.goto(url, { waitUntil: 'networkidle0' });
                const screenshot = await page.screenshot({ type: 'png' });
                const filename = plate + "-" + index + ".png";
                fs.writeFileSync(filename, screenshot);
                resolve(filename);
            } catch (error) {
                reject(error);
            }
        };
        enqueueTask(task);
    });
}

async function initialize() {
    await launchBrowser();
    const pagePromises = [];
    for (let i = 0; i < maxPages; i++) {
        pagePromises.push(getOrCreatePage());
    }
    await Promise.all(pagePromises);
}

function createVideoFromImages(imagePaths, outputPath, fps) {
  return new Promise((resolve, reject) => {
      const images = imagePaths.join('|');
      const command = `ffmpeg -framerate ${fps} -i "concat:${images}" -c:v libx264 -pix_fmt yuv420p ${outputPath}`;

      exec(command, (error, stdout, stderr) => {
          if (error) {
              reject(error);
              return;
          }
          if (stderr) {
              reject(stderr);
              return;
          }
          resolve();
      });
  })
  .catch(error => {
    }); 
}

function encodeFileToBase64(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                reject(err);
            } else {
                const base64 = data.toString('base64');
                resolve(base64);
            }
        });
    });
}

function deleteFilesWithContent(searchString) {
    const directory = __dirname;  
    fs.readdir(directory, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error('Failed to read directory:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(directory, file.name);
            if (file.isDirectory()) {
            } else {
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        console.error('Failed to read file:', err);
                        return;
                    }

                    if (data.includes(searchString)) {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                console.error('Failed to delete file:', err);
                            } else {
                                console.log(`Deleted file: ${filePath}`);
                            }
                        });
                    }
                });
            }
        });
    });
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
    saveVideo: async function saveVideo(event) {
        console.log("Deleting old files if needed");
        deleteFilesWithContent(event.plate);
        console.log("Deleted them");
        
        let videoImages = [];
        let outputFile = `${event.plate}.mp4`;
        let fps = event.readings.length / event.readingLength * 1000;
    
        console.log("Initializing");

        await initialize();
    
        const capturePromises = [];

        for (let i = 0; i < event.readings.length; i++) {
            let q = event.readings[i];
            capturePromises.push(captureFrame(i, event.plate, q.q0, q.q1, q.q2, q.q3));
        }

        console.log("Finished creating promises")

        try {
            const filenames = await Promise.all(capturePromises);
            
            videoImages.push(...filenames);

            console.log("Closing browser");

            await browserInstance.close();
            try {
                await createVideoFromImages(videoImages, outputFile, fps);
            } catch (error) {
            }
            console.log("Video created successfully");
    
            deleteFiles(videoImages).then(() => {
                console.log('All files deleted successfully');
            }).catch(err => {
                console.error('An error occurred:', err);
            });

            base64Video = await encodeFileToBase64(`${event.plate}.mp4`)

            await EventVideo.findOneAndUpdate(
                { plate: event.plate }, 
                { plate: event.plate, data: base64Video }, 
                { upsert: true, new: true } 
            );

            fs.unlinkSync(`${event.plate}.mp4`,function(err){
                if(err) 
                    return console.log(err);
            });
        } catch (error) {
            console.error("An error occurred during processing:", error);
        }
    },
    interpolate: function interpolateMpus(mpuStates)
    {
        return interpolateMpuStates(mpuStates)
    }
};