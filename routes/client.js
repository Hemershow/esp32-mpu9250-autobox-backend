const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');

router
    .post('/', ClientController.CreateClient)
    .patch('/:plate', ClientController.UpdateLocation)
    .get('/notifications', ClientController.GetNotifications)
    .get('/:id', ClientController.GetClient)
    .get('/:page/:limit', ClientController.GetClients)
    .get('/:page/:limit/:search', ClientController.GetClientsWithSearch)

module.exports = router;