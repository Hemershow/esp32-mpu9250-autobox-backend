const express = require('express');
const EventController = require('../controllers/EventController');
const router = express.Router();
 
router
    .post('/', EventController.CreateEvent)
    .get('/:plate', EventController.GetEvent)
    .delete('/:plate', EventController.DeleteEvent)
 
module.exports = router;