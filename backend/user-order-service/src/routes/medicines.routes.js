/**
 * Medicines Routes
 */

const express = require('express');
const router = express.Router();
const medicinesController = require('../controllers/medicines.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.get('/search', optionalAuth, medicinesController.searchMedicines);
router.get('/:id', optionalAuth, medicinesController.getMedicine);

module.exports = router;
