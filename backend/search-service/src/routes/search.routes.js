/**
 * Search Routes
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');

router.get('/medicines', searchController.searchMedicines);
router.get('/autocomplete', searchController.autocomplete);
router.get('/pharmacies', searchController.searchPharmacies);

module.exports = router;
