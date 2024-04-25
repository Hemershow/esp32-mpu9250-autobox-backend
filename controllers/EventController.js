const Event = require('../models/Event');
const MpuState = require('../models/MpuState');
const Client = require("../models/Client");
const { sendMessageToAllClients } = require('../config/websocketManager');
const utils = require('../utils');
const EventVideo = require('../models/EventVideo');
class EventController{

    static async CreateEvent(req, res){
        const { plate, readingLength, arised, readings } = req.body;

        if(!plate || !readingLength || !arised || !readings) 
        {
            return res.status(400)
            .send({ message: "One or more elements were not provided" })
        }

        console.log("Creating event with plate: " + plate);
        
        const impactSpeed = (Math.max(...readings.map(o => o.maxAcceleration)) * 9.80665) * 3.6;
        let fatalityLikelyhood = 0.0106564 * Math.pow((impactSpeed*0.621371), 2.27587) - 3.38848;

        if (fatalityLikelyhood < 5)
            fatalityLikelyhood = 4;
        if (fatalityLikelyhood > 99)
            fatalityLikelyhood = 99;

        let mpuStates = readings.map(item => new MpuState(item.q0, item.q1, item.q2, item.q3, item.maxAcceleration, item.timestamp));
        let mpuStatesInterpolated = utils.interpolate(mpuStates);

		const event = {
            plate: plate,
            readingLength: readingLength,
            arised: arised,
            impactSpeed: impactSpeed,
            fatalityLikelyhood: fatalityLikelyhood,
            readings: mpuStatesInterpolated
        };

        try {

            await Event.findOneAndUpdate(
                { plate: plate }, 
                { $set: event }, 
                {
                    new: true, 
                    upsert: true, 
                    runValidators: true 
                }
            );

            utils.saveVideo(event);

            var clientId = (await Client.findOne({ 'plate': plate })).id;
            
            await Client.findByIdAndUpdate(clientId, {
                status: "Em Crise",
                lastUpdated: new Date()
            });

            const eventMessage = {
                plate: event.plate
            }

            sendMessageToAllClients({ type: "eventUpdate", data: eventMessage });

            return res.status(201).send({ 
                message: "Event created successfully",
                object: event
            });
        } catch (error) {
            return res.status(500).send({ message: "Something failed" + error })
        }
    }

    static async GetVideo(req, res) {
        const plate = req.params;
        
        try {
            const video = await EventVideo.findOne({'plate': plate.plate});

            if (!video)
            {
                return res.status(404).send({ message: "Video not found"});
            }

            return res.status(200).send(video);
        } catch (error) {
            console.log(error)
            return res.status(500).send({ message: "Something failed" })
        }
    }

    static async GetEvent(req, res) {
        const plate = req.params;

        try {
            const event = await Event.findOne({ 'plate': plate.plate });
    
            if (!event) {
                return res.status(404).send({ message: "Event not found" });
            }
    
            return res.status(200).send(event);
        } catch (error) {
            console.error(error);
            return res.status(500).send({ message: "Something failed" });
        }
    }
}

module.exports = EventController;