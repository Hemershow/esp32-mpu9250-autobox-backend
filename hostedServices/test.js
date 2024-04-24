const Logger = require("nodemon/lib/utils/log");
const { sendMessageToAllClients } = require("../config/websocketManager");
const Client = require("../models/Client");
const { getClientStatus, updateClientStatus } = require("./clientStatus");

async function fillStatus() {
    try {
        const clients = await Client.find();
        const newClientStatus = clients.map((client) => {
            newStatus = {
                id: client.id,
                plate: client.plate,
                lastUpdated: client.lastUpdated,
                lastLocation: client.lastLocation,
                notification: {
                    type: client.status != "Em Crise" ? "eventUpdate" : "",
                    data: {
                        plate: client.plate,
                        location: client.lastLocation,
                    }
                },
            }

            return newStatus;
        })
        updateClientStatus(newClientStatus);
    } catch (error) {
        console.error(error);
    }
}

async function checkIfExpired() {
    const statusClients = getClientStatus();
    await Promise.all(statusClients.map(async (client) => {
        if ((new Date().getTime() - new Date(client.lastUpdated).getTime() > 13000 || client.lastUpdated == undefined) &&
            client.notification.type == "eventUpdate") {
            client.lastUpdated = new Date();
            client.notification = {
                type: "lostSignal",
                data: {
                    plate: client.plate,
                    location: client.lastLocation,
                }
            };

            await Client.findByIdAndUpdate(client.id, {
                lastLocation: client.lastLocation,
                status: "Sem Sinal",
                lastUpdated: client.lastUpdated
            });

            sendMessageToAllClients(client.notification);
        }
    }));
}


setInterval(() => {
    checkIfExpired();
}, 5000);

(async () => {
    try {
        await fillStatus();
    } catch (error) {
        console.error("Error filling status:", error);
    }
})();

module.exports = {
    notifyHostedService: async function doSomething(notification) {
        const allClients = getClientStatus(); 
        const updatedClients = allClients.map(client => {
            if (client.plate === notification.data.plate) {
                client.lastUpdated = new Date(),
                client.notification = {
                    type: "eventUpdate",
                    data: {
                        plate: client.plate,
                        location: client.lastLocation,
                    }
                };
            }
            return client;
        });

        updateClientStatus(updatedClients); // Update the status of all clients

        const updatedClient = updatedClients.find(client => client.plate === notification.data.plate);
        
        await Client.findByIdAndUpdate(updatedClient.id, {
            lastLocation: updatedClient.lastLocation,
            status: "Rodando",
            lastUpdated: updatedClient.lastUpdated
        });

        if (updatedClient) {
            sendMessageToAllClients(updatedClient.notification); // Send message to all clients
        }
    },
    checkIfExpired: checkIfExpired,
    fillStatus: fillStatus
};
