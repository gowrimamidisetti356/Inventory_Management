
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.disable('x-powered-by');

// ========================================
// 1. CORS CONFIGURATION
// ========================================

// IMPORTANT: Use plain URLs, without Markdown formatting.
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://inventory-management-tau-sage.vercel.app',
    'https://inventory-management-gowri9.vercel.app'
];

// Add additional frontend origins through Vercel environment variables.
const environmentOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(origin => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const permittedOrigins = [
    ...new Set([...allowedOrigins, ...environmentOrigins])
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests without an Origin header, such as
        // direct server-to-server requests.
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = origin.replace(/\/+$/, '');

        if (permittedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }

        console.warn('Blocked CORS origin:', normalizedOrigin);

        return callback(
            new Error('Origin not allowed by CORS')
        );
    },

    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization'
    ],

    optionsSuccessStatus: 204
}));

// Parse JSON only after registering CORS.
app.use(express.json({ limit: '1mb' }));

// ========================================
// 2. MONGODB CONNECTION
// ========================================

let connectionPromise = null;

async function connectDB() {
    // Reuse an established connection.
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // Validate the required environment variable.
    if (!process.env.MONGO_URI) {
        throw new Error(
            'MONGO_URI environment variable is missing'
        );
    }

    // Reuse an existing connection attempt.
    if (!connectionPromise) {
        connectionPromise = mongoose.connect(
            process.env.MONGO_URI,
            {
                serverSelectionTimeoutMS: 10000
            }
        )
            .then(() => {
                console.log('MongoDB connected successfully');
                return mongoose.connection;
            })
            .catch((error) => {
                connectionPromise = null;

                console.error(
                    'MongoDB connection failed:',
                    error.message
                );

                throw error;
            });
    }

    return connectionPromise;
}

// ========================================
// 3. ROOT ROUTE
// ========================================

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Inventory Management System API is running',
        endpoints: {
            health: '/api/health',
            products: '/api/products'
        }
    });
});

// ========================================
// 4. HEALTH CHECK
// ========================================

app.get('/api/health', async (req, res) => {
    try {
        await connectDB();

        return res.status(200).json({
            success: true,
            status: 'OK',
            message: 'Inventory Management System API is running',
            database: 'Connected'
        });
    } catch (error) {
        console.error(
            'Health check failed:',
            error.message
        );

        return res.status(500).json({
            success: false,
            status: 'ERROR',
            message: 'Database connection failed'
        });
    }
});

// ========================================
// 5. LOAD PRODUCT ROUTES
// ========================================

const productRoutes = require('./routes/products');

// Connect to MongoDB before processing product requests.
app.use('/api/products', async (req, res, next) => {
    try {
        await connectDB();
        return next();
    } catch (error) {
        console.error(
            'Product database connection failed:',
            error.message
        );

        return res.status(500).json({
            success: false,
            message: 'Unable to connect to the database'
        });
    }
});

// Register existing product routes.
app.use('/api/products', productRoutes);

// ========================================
// 6. HANDLE UNKNOWN ROUTES
// ========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    });
});

// ========================================
// 7. GLOBAL ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
    console.error('Application error:', err.message);

    if (res.headersSent) {
        return next(err);
    }

    if (err.message === 'Origin not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'Request origin is not allowed'
        });
    }

    if (err instanceof SyntaxError && err.status === 400) {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON request body'
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// ========================================
// 8. EXPORT APPLICATION FOR VERCEL
// ========================================

module.exports = app;

// ========================================
// 9. LOCAL DEVELOPMENT SERVER
// ========================================

// Vercel imports the app without calling app.listen().
if (require.main === module) {
    const PORT = process.env.PORT || 5001;

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}
