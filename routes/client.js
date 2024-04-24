const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');

router
    .post('/', ClientController.CreateClient)
    .patch('/', ClientController.UpdateLocation)
    .get('/notifications', ClientController.GetNotifications)
    .get('/:id', ClientController.GetClient)
    .get('/:page/:limit', ClientController.GetClients)
    .get('/:page/:limit/:search/:status', ClientController.GetClientsWithSearch)

module.exports = router;