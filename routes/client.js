const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/ClientController');

router
    .post('/', ClientController.CreateClient)
    .patch('/', ClientController.UpdateStatus)
    .patch('/:plate', ClientController.UpdateLocation)
    .get('/:id', ClientController.GetClient)
    .get('/:page&:limit', ClientController.GetClients)

module.exports = router;