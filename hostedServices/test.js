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
                notification: {},
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

    statusClients.map((client) => {
        if (new Date().getTime() - new Date(client.lastUpdated).getTime() > 13000 &&
            client.notification.type != "eventUpdate") {
            client.notification = {
                type: "lostSignal",
                data: {
                    plate: client.plate,
                    location: client.lastLocation,
                }
            }
            
            sendMessageToAllClients(client.notification);
        }
    })
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
        // atualiza quem eu receber
        // lastUpdated e clientStatusComPlacaX.notification = notification
        // obs, n atualiza se o atual for de crise
        // se estava sem sinal
        sendMessageToAllClients(dict[malandro].notification);
    },
    checkIfExpired: checkIfExpired,
    fillStatus: fillStatus
};
