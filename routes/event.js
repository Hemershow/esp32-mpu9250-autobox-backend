const express = require('express');
const EventController = require('../controllers/EventController');
const router = express.Router();
 
router
    .post('/', EventController.CreateEvent)
    .get('/:plate', EventController.GetEvent)
    .get('/video/:plate', EventController.GetVideo)
 
module.exports = router;