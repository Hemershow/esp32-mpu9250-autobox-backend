const { sendMessageToAllClients } = require("../config/websocketManager");
const Client = require("../models/Client");
const { getClientStatus, updateClientStatus } = require("./clientStatus");

async function fillStatus() {
    try {
        const clients = await Client.find();
        const newClientStatus = clients.map((client) => {
            newStatus = {
                plate: client.plate,
                lastUpdated: client.lastUpdated,
                lastLocation: client.lastLocation,
                notification: {
                    type: "eventUpdate",
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

function checkIfExpired() {
    const statusClients = getClientStatus();

    updateClientStatus(statusClients.map((client) => {
        if ((new Date().getTime() - new Date(client.lastUpdated).getTime() > 13000 || client.lastUpdated == undefined) &&
            client.notification.type == "eventUpdate") {
            console.log(client)
            client.notification = {
                type: "lostSignal",
                data: {
                    plate: client.plate,
                    location: client.lastLocation,
                }
            }
            sendMessageToAllClients(client.notification);
        }

        return client;
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
    notifyHostedService: function doSomething(notification) {
        const allClients = getClientStatus(); // Assuming getClientStatus returns an array of clients
        console.log("here")
        const updatedClients = allClients.map(client => {
            if (client.plate === notification.data.plate &&
                (new Date().getTime() - new Date(client.lastUpdated).getTime() < 13000 || client.lastUpdated == undefined) &&
                client.notification.type === "lostSignal") {
                console.log("Entrei");
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

        console.log(updatedClients)
        updateClientStatus(updatedClients); // Update the status of all clients
        console.log()

        const updatedClient = updatedClients.find(client =>
            client.plate === notification.data.plate &&
            client.notification.type === "eventUpdate"
        );

        if (updatedClient) {
            sendMessageToAllClients(updatedClient.notification); // Send message to all clients
        }
    },
    checkIfExpired: checkIfExpired,
    fillStatus: fillStatus
};
