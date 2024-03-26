const Event = require('../models/Event');
const MpuState = require('../models/MpuState');

class EventController{
    static async CreateEvent(req, res){
        const { plate, readingLenght, arised, readings } = req.body;

        if(!plate || !readingLenght || !arised || !readings) 
        {
            return res.status(400)
                .send({ message: "One or more elements were not provided" })
        }

        const impactSpeed = (Math.max(...readings.map(o => o.maxAcceleration)) * 9.80665) * 3.6;
        let fatalityLikelyhood = 0.0106564 * Math.pow((impactSpeed*0.621371), 2.27587) - 3.38848;

        if (fatalityLikelyhood < 5)
            fatalityLikelyhood = 4;
        if (fatalityLikelyhood > 95)
            fatalityLikelyhood = 96;

        let mpuStates = readings.map(item => new MpuState(item.q0, item.q1, item.q2, item.q3, item.maxAcceleration, item.timestamp));
        let mpuStatesInterpolated = interpolateMpuStates(mpuStates);
        
		const event = new Event({
            plate: plate,
            readingLenght: readingLenght,
            arised: arised,
            impactSpeed: impactSpeed,
            fatalityLikelyhood: fatalityLikelyhood,
            readings: mpuStatesInterpolated
        });

        try {
            await event.save();
            return res.status(201).send({ 
                message: "Event created successfully",
                object: event
            });
        } catch (error) {
            return res.status(500).send({ message: "Something failed" + error })
        }
    }

    static async GetEvent(req, res) {
        const plate = req.params;

        try {
            const event = await Event.findOne({ 'plate': plate });
    
            if (!event) {
                return res.status(404).send({ message: "Event not found" });
            }
    
            return res.status(200).send(event);
        } catch (error) {
            console.error(error);
            return res.status(500).send({ message: "Something failed" });
        }
    }

    static async DeleteEvent(req, res) {
        const plate = req.params;
    
        try {
            const event = await Event.findOne({ 'plate': plate });

            if (!event) {
                return res.status(404).send({ message: "Event not found" });
            }
            
            // 

            return res.status(200).send({ message: "Event deleted successfully" });
        } catch (error) {
            return res.status(500).send({ message: "Something failed" });
        }
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

module.exports = EventController;