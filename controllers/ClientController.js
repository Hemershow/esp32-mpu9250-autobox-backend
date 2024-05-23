const Client = require("../models/Client");
const Event = require('../models/Event');
const { sendMessageToAllClients } = require('../config/websocketManager');
const HostedService = require('../hostedServices/test');

class ClientController {
    static async CreateClient(req, res) {
        const { name, email, number, vehicle, plate } = req.body;

        if (!name || !email || !number || !vehicle || !plate) {
            return res.status(400)
                .send({ message: "One or more elements were not provided" })
        }

        const client = new Client({
            name: name,
            email: email,
            number: number,
            vehicle: vehicle,
            status: "Sem Sinal",
            plate: plate
        });

        try {
            await client.save();
            return res.status(201).send({ message: "Client created successfully" });
        } catch (error) {
            return res.status(500).send({ message: "Something failed" + error })
        }
    }

    static async UpdateLocation(req, res) {
        const { plate, location } = req.body;

        if (!location) {
            return res.status(400)
                .send({ message: "One or more elements were not provided" })
        }

        try {
            var clientId = (await Client.findOne({ 'plate': plate })).id;

            const client = await Client.findByIdAndUpdate(clientId, {
                lastLocation: location,
                status: "Rodando",
                lastUpdated: new Date()
            });

            if (!client) {
                return res.status(404).send({ message: "Client not found" });
            }

            const statusUpdateMessage = {
                newClient: client
            }

            HostedService.notifyHostedService({ type: "locationUpdate", data: statusUpdateMessage })

            return res.status(200).send({ message: "Client updated successfully" });
        } catch (error) {
            return res.status(500).send({
                message: "Something failed",
                erros: error.message
            });
        }
    }

    static async GetClient(req, res) {
        const { id } = req.params;

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

    static async GetNotifications(req, res) {
        try {
            const clients = await Client.find({ status: "Em Crise" })

            const mappedClients = []

            for (let i = 0; i < clients.length; i++) {
                const arised = await Event.findOne({ plate: clients[i].plate })
                mappedClients.push([clients[i].plate, clients[i].status, arised.arised])
            }

            return res.status(200).json({
                notifications: mappedClients
            })
        } catch (error) {
            return res.status(500).send({
                message: "Something failed",
                errors: error.message
            });
        }
    }

    static async GetClients(req, res) {
        const { page, limit, orderBy, ascending } = req.params;

        try {
            let query = Client.find();

            if (orderBy != "None") {
                query = query.sort({ [orderBy]: ascending });
            }

            query = query
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const clients = await query.exec();
            const count = await Client.countDocuments();

            return res.status(200).json({
                clients,
                totalPages: Math.ceil(count / limit),
                totalElements: count
            });
        } catch (error) {
            return res.status(500).send({ message: error.message });
        }
    }


    static async GetClientsWithSearch(req, res) {
        let { page, limit, search, status, orderBy, ascending } = req.params;

        if (search == "ALL") {
            search = "";
        }

        try {
            let query = Client.find();

            if (status == "Todos") {
                query = query.find({
                    $or: [
                        { vehicle: { $regex: search, $options: 'i' } },
                        { plate: { $regex: search, $options: 'i' } },
                        { name: { $regex: search, $options: 'i' } }
                    ]
                });
            } else {
                query = query.find({
                    $and: [
                        {
                            $or: [
                                { vehicle: { $regex: search, $options: 'i' } },
                                { plate: { $regex: search, $options: 'i' } },
                                { name: { $regex: search, $options: 'i' } }
                            ]
                        },
                        { status: status }
                    ]
                });
            }

            if (orderBy != "None") {
                query = query.sort({ [orderBy]: ascending });
            }

            const clients = await query.exec();
            const count = clients.length;

            const paginatedClients = clients
                .slice((page - 1) * limit, (page - 1) * limit + limit);

            return res.status(200).json({
                clients: paginatedClients,
                totalPages: Math.ceil(count / limit),
                totalElements: count
            });
        } catch (error) {
            return res.status(500).send({
                message: "Something failed",
                errors: error.message
            });
        }
    }
}

module.exports = ClientController;