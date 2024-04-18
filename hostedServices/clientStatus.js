let clientStatus = [
    {
        plate: "absc213",
        lastUpdated: 1978236123,
        lastLocation: "",
        notification: {}
    }
];

function getClientStatus() {
    return clientStatus;
}

function updateClientStatus(newStatus) {
    clientStatus = newStatus;
}

module.exports = {
    getClientStatus,
    updateClientStatus
};