const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');

router
    .post('/', ClientController.CreateClient)
    .patch('/', ClientController.UpdateLocation)
    .get('/notifications', ClientController.GetNotifications)
    .get('/:id', ClientController.GetClient)
    .get('/:page/:limit/:orderBy/:ascending', ClientController.GetClients)
    .get('/:page/:limit/:search/:status/:orderBy/:ascending', ClientController.GetClientsWithSearch)

module.exports = router;