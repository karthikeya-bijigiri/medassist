/**
 * Pharmacies Controller
 */

const Pharmacy = require('../models/Pharmacy');
const inventoryService = require('../services/inventory.service');
const { asyncHandler } = require('@medassist/shared/errors/AppError');
const { PAGINATION, GEO } = require('@medassist/shared/constants');

/**
 * Get pharmacies with geo-filter
 * GET /api/v1/pharmacies
 */
const getPharmacies = asyncHandler(async (req, res) => {
  const {
    lat,
    lon,
    radius = GEO.DEFAULT_RADIUS,
    page = PAGINATION.DEFAULT_PAGE,
    size = PAGINATION.DEFAULT_SIZE
  } = req.query;

  let query = { is_active: true };
  let pharmacies;
  let total;

  if (lat && lon) {
    // Geo search
    pharmacies = await Pharmacy.find({
      ...query,
      geo: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000
        }
      }
    })
      .skip((parseInt(page, 10) - 1) * parseInt(size, 10))
      .limit(parseInt(size, 10));

    total = await Pharmacy.countDocuments({
      ...query,
      geo: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000
        }
      }
    });
  } else {
    // Regular search
    pharmacies = await Pharmacy.find(query)
      .skip((parseInt(page, 10) - 1) * parseInt(size, 10))
      .limit(parseInt(size, 10))
      .sort({ rating: -1 });

    total = await Pharmacy.countDocuments(query);
  }

  res.json({
    success: true,
    data: {
      pharmacies,
      pagination: {
        page: parseInt(page, 10),
        size: parseInt(size, 10),
        total,
        pages: Math.ceil(total / parseInt(size, 10))
      }
    }
  });
});

/**
 * Get pharmacy by ID
 * GET /api/v1/pharmacies/:id
 */
const getPharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.id);

  if (!pharmacy) {
    return res.status(404).json({
      error_code: 'NOT_FOUND',
      message: 'Pharmacy not found'
    });
  }

  res.json({
    success: true,
    data: { pharmacy }
  });
});

/**
 * Get pharmacy inventory
 * GET /api/v1/pharmacies/:id/inventory
 */
const getPharmacyInventory = asyncHandler(async (req, res) => {
  const { page, size } = req.query;
  
  const result = await inventoryService.getPharmacyInventory(req.params.id, {
    page: parseInt(page, 10) || 1,
    size: parseInt(size, 10) || 20
  });

  res.json({
    success: true,
    data: result
  });
});

module.exports = {
  getPharmacies,
  getPharmacy,
  getPharmacyInventory
};
