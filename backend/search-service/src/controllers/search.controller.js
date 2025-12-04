/**
 * Search Controller
 */

const elasticsearchService = require('../services/elasticsearch.service');
const { asyncHandler } = require('@medassist/shared/errors/AppError');
const { PAGINATION, GEO } = require('@medassist/shared/constants');

/**
 * Search medicines
 * GET /api/v1/search/medicines
 */
const searchMedicines = asyncHandler(async (req, res) => {
  const { q, page = PAGINATION.DEFAULT_PAGE, size = PAGINATION.DEFAULT_SIZE } = req.query;

  if (!q) {
    return res.status(400).json({
      error_code: 'VALIDATION_ERROR',
      message: 'Search query (q) is required'
    });
  }

  const result = await elasticsearchService.searchMedicines(q, {
    page: parseInt(page, 10),
    size: parseInt(size, 10)
  });

  res.json({
    success: true,
    data: result
  });
});

/**
 * Autocomplete
 * GET /api/v1/search/autocomplete
 */
const autocomplete = asyncHandler(async (req, res) => {
  const { q, size = 10 } = req.query;

  if (!q) {
    return res.status(400).json({
      error_code: 'VALIDATION_ERROR',
      message: 'Search query (q) is required'
    });
  }

  const suggestions = await elasticsearchService.autocomplete(q, {
    size: parseInt(size, 10)
  });

  res.json({
    success: true,
    data: { suggestions }
  });
});

/**
 * Search pharmacies
 * GET /api/v1/search/pharmacies
 */
const searchPharmacies = asyncHandler(async (req, res) => {
  const {
    lat,
    lon,
    radius = GEO.DEFAULT_RADIUS,
    page = PAGINATION.DEFAULT_PAGE,
    size = PAGINATION.DEFAULT_SIZE
  } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({
      error_code: 'VALIDATION_ERROR',
      message: 'Latitude (lat) and longitude (lon) are required'
    });
  }

  const result = await elasticsearchService.searchPharmacies(lat, lon, radius, {
    page: parseInt(page, 10),
    size: parseInt(size, 10)
  });

  res.json({
    success: true,
    data: result
  });
});

/**
 * Reindex (admin only)
 * POST /api/v1/admin/reindex
 */
const reindex = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  const result = await elasticsearchService.reindexAll(mongoose);

  res.json({
    success: true,
    data: {
      message: 'Reindex completed',
      indexed: result
    }
  });
});

module.exports = {
  searchMedicines,
  autocomplete,
  searchPharmacies,
  reindex
};
