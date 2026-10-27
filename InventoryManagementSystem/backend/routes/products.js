
const express = require('express');
const router = express.Router();

const {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

// ========================================
// PRODUCT CRUD ROUTES
// ========================================

// GET /api/products - Fetch all products
router.get('/', getProducts);

// POST /api/products - Create a product
router.post('/', createProduct);

// PUT /api/products/:id - Update a product
router.put('/:id', updateProduct);

// DELETE /api/products/:id - Delete a product
router.delete('/:id', deleteProduct);

module.exports = router;
