const Client = require("../models/Client");

class ClientController{
    static async CreateClient(req, res){
        const { name, email, number, vehicle, plate } = req.body;

        if(!name || !email || !number || !vehicle || !plate) 
        {
            return res.status(400)
                .send({ message: "One or more elements were not provided" })
        }

		const client = new Client({
            name: name,
            email: email,
            number: number,
            vehicle: vehicle,
            plate: plate
        });

        try {
            await client.save();
            return res.status(201).send({ message: "Client created successfully" });
        } catch (error) {
            return res.status(500).send({ message: "Something failed" + error })
        }
    }

    static async UpdateStatus(req, res) {
        // const { plate, status } = req.body;
        // var attraction = await Attraction.findOne({ '_id': id });
    }

    static async UpdateLocation(req, res) {
        const { plate } = req.params;
        const { location } = req.body;
    
        try {
            var clientId = (await Client.findOne({ 'plate': plate })).id;
    
            const client = await Client.findByIdAndUpdate(clientId, {
                location: location,
                lastUpdated: new Date()
            });
    
            if (!client) {
                return res.status(404).send({ message: "Client not found" });
            }
    
            return res.status(200).send({ message: "Client updated successfully" });
        } catch (error) {
            return res.status(500).send({ message: "Something failed" });
        }
    }

    static async GetClient(req, res) {
        const id = req.params;

        try {
            const client = await Client.findById(id);
    
            if (!client) {
                return res.status(404).send({ message: "Client not found" });
            }
    
            return res.status(200).send(client);
        } catch (error) {
            console.error(error);
            return res.status(500).send({ message: "Something failed" });
        }
    }

    static async GetClients(req, res) {
        const { page, limit } = req.params;

        try {
            const clients = await Client.find()
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();
    
            const count = await Client.countDocuments();
    
            return res.status(200).json({
                clients,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            });
        } catch (error) {
            return res.status(500).send({ message: "Something failed" });
        }
    }
}

module.exports = ClientController;