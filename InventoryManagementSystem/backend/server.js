require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Allowed frontend origins
const allowedOrigins = [
    'http://localhost:3000',
    ...(process.env.FRONTEND_URL || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
];

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests without an Origin header, such as health checks.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Block unapproved browser origins.
        return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Reuse the MongoDB connection across serverless invocations.
let connectionPromise;

async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI environment variable is missing');
    }

    if (!connectionPromise) {
        connectionPromise = mongoose.connect(process.env.MONGO_URI)
            .catch((error) => {
                connectionPromise = null;
                throw error;
            });
    }

    await connectionPromise;
}

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Inventory Management System API is running',
        health: '/api/health'
    });
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await connectDB();

        res.status(200).json({
            status: 'OK',
            message: 'Inventory Management System API is running',
            database: 'Connected'
        });
    } catch (error) {
        console.error('Health check failed:', error.message);

        res.status(500).json({
            status: 'ERROR',
            message: 'Database connection failed'
        });
    }
});

// Connect to MongoDB before handling product requests.
app.use('/api/products', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('MongoDB connection error:', error.message);

        res.status(500).json({
            message: 'Unable to connect to the database'
        });
    }
});

// Preserve your existing product routes.
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

// Export Express app for Vercel.
module.exports = app;

// Start a local server during development only.
if (require.main === module) {
    const PORT = process.env.PORT || 5001;

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}