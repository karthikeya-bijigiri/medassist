/**
 * Pharmacies Routes
 */

const express = require('express');
const router = express.Router();
const pharmaciesController = require('../controllers/pharmacies.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.get('/', optionalAuth, pharmaciesController.getPharmacies);
router.get('/:id', optionalAuth, pharmaciesController.getPharmacy);
router.get('/:id/inventory', optionalAuth, pharmaciesController.getPharmacyInventory);

module.exports = router;
