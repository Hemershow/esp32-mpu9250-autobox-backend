const WebSocket = require('ws');

let wss = null;

function initializeWebSocketServer(server) {
    wss = new WebSocket.Server({ server });
    wss.on('connection', function connection(ws) {
        console.log('A new client connected!');
        ws.on('message', function incoming(message) {
            console.log('received: %s', message);
        });

        ws.on('close', function close() {
            console.log('A client disconnected');
        });

        ws.send('Welcome to the WebSocket server!');
    });
}

function sendMessageToAllClients(data) {
    if (!wss) {
        console.log('WebSocket server is not initialized.');
        return;
    }

    const cache = new Set();
    const dataString = JSON.stringify(data, function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                return;
            }
            cache.add(value);
        }
        return value;
    });

    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });

    cache.clear();
}

module.exports = { initializeWebSocketServer, sendMessageToAllClients };