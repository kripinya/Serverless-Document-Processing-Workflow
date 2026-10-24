// app.js => MAIN EXPRESS APP

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

//MIDDLEWARE
//allow frontend to call api
app.use(cors());
//parse json bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//LOGGING MIDDLEWARE
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

//routes
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const processingRoutes = require('./routes/processingRoutes');
const healthRoutes = require('./routes/healthRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/processing', processingRoutes);
app.use('/api/health', healthRoutes);

//root route
app.get('/', (req, res) => {
    res.json({
        message: 'Serverless Document Processing API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            documents: '/api/documents',
            processing: '/api/processing',
            health: '/api/health'
        }
    });
});

// global error handler
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`, err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});

module.exports = app;