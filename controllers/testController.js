const { wss } = require('../index');

class EventController{
    static async test(req, res){
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "eventUpdate", data: "eventData" }));
            }
        });
    }
}

module.exports = EventController;