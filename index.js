const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: '*'
}));

require('./startup/db')();
require('./startup/routes')(app);
 
const port = 8080;
const server = app.listen(port, () => console.log(`Listening on port ${port}`));
 
module.exports = server;