/**
 * Medicines Controller
 */

const Medicine = require('../models/Medicine');
const Inventory = require('../models/Inventory');
const Pharmacy = require('../models/Pharmacy');
const { asyncHandler } = require('@medassist/shared/errors/AppError');
const { PAGINATION, GEO } = require('@medassist/shared/constants');

/**
 * Search medicines
 * GET /api/v1/medicines/search
 */
const searchMedicines = asyncHandler(async (req, res) => {
  const {
    q,
    lat,
    lon,
    radius = GEO.DEFAULT_RADIUS,
    page = PAGINATION.DEFAULT_PAGE,
    size = PAGINATION.DEFAULT_SIZE
  } = req.query;

  let medicines;
  let total;

  if (q) {
    // Text search
    medicines = await Medicine.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .skip((page - 1) * size)
      .limit(parseInt(size, 10));

    total = await Medicine.countDocuments({ $text: { $search: q } });
  } else {
    // List all medicines
    medicines = await Medicine.find()
      .skip((page - 1) * size)
      .limit(parseInt(size, 10))
      .sort({ name: 1 });

    total = await Medicine.countDocuments();
  }

  // If geo coordinates provided, get availability at nearby pharmacies
  let availability = {};
  if (lat && lon) {
    const pharmacies = await Pharmacy.find({
      is_active: true,
      geo: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
        }
      }
    }).limit(10);

    const pharmacyIds = pharmacies.map(p => p._id);
    const medicineIds = medicines.map(m => m._id);

    const inventoryItems = await Inventory.find({
      pharmacy_id: { $in: pharmacyIds },
      medicine_id: { $in: medicineIds },
      quantity_available: { $gt: 0 },
      expiry_date: { $gt: new Date() }
    });

    for (const item of inventoryItems) {
      const medId = item.medicine_id.toString();
      if (!availability[medId]) {
        availability[medId] = [];
      }
      availability[medId].push({
        pharmacy_id: item.pharmacy_id,
        price: item.selling_price,
        quantity: item.quantity_available
      });
    }
  }

  res.json({
    success: true,
    data: {
      medicines: medicines.map(m => ({
        ...m.toObject(),
        availability: availability[m._id.toString()] || []
      })),
      pagination: {
        page: parseInt(page, 10),
        size: parseInt(size, 10),
        total,
        pages: Math.ceil(total / size)
      }
    }
  });
});

/**
 * Get medicine by ID
 * GET /api/v1/medicines/:id
 */
const getMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    return res.status(404).json({
      error_code: 'NOT_FOUND',
      message: 'Medicine not found'
    });
  }

  res.json({
    success: true,
    data: { medicine }
  });
});

module.exports = {
  searchMedicines,
  getMedicine
};
