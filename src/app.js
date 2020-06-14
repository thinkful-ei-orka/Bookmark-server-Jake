require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const {NODE_ENV} = require('./config');
const app = express();
const { v4: uuid } = require('uuid');
const logger = require('./logger');

const bookmarkRouter = require('./bookmark/bookmark-router');

const morganOption = (NODE_ENV === 'production')
    ? 'tiny'
    : 'common';

app.use(morgan(morganOption));
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(function validateBearerToken(req, res, next) {
    const apiToken = process.env.API_TOKEN;
    const authToken = req.get('Authorization');
    logger.error("Server token:  " + apiToken + "  "  + "Client token:  " + authToken);
    if (!authToken || authToken.split(' ')[1] !== apiToken) {
        logger.error(`Unauthorized request to path: ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized request' });
    }
    // move to the next middleware
    next();
});

app.use(bookmarkRouter);



app.get('/xss', (req, res) => {
    res.cookie('secretToken', '1234567890');
    res.sendFile(__dirname + '/xss-example.html');
});

app.use(function errorHandler(error, req, res, next) {
    let response;
    if (NODE_ENV === 'production') {
        console.error(error);
        response = { error: { message: 'server error' } };
    } else {
        
        response = { message: error.message, error };
    }
    res.status(500).json(response);
});


module.exports = app;
