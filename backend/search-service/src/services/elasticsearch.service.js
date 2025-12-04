/**
 * Elasticsearch Service
 */

const { Client } = require('@elastic/elasticsearch');
const config = require('../config');
const { medicineIndexSettings, pharmacyIndexSettings, inventoryIndexSettings } = require('../utils/analyzers');
const { createLogger } = require('@medassist/shared/logging/logger');
const { cacheSearchResults, getCachedSearchResults } = require('@medassist/shared/database/redis');
const { incrementSearchQueries } = require('@medassist/shared/metrics/prometheus');
const crypto = require('crypto');

const logger = createLogger('elasticsearch-service');

let client = null;

/**
 * Initialize Elasticsearch client
 */
function initElasticsearch() {
  client = new Client({
    node: config.elasticsearchUri,
    requestTimeout: 30000
  });
  
  return client;
}

/**
 * Get Elasticsearch client
 */
function getClient() {
  if (!client) {
    initElasticsearch();
  }
  return client;
}

/**
 * Create hash for cache key
 */
function createCacheHash(query) {
  return crypto.createHash('md5').update(JSON.stringify(query)).digest('hex');
}

/**
 * Create indices if they don't exist
 */
async function setupIndices() {
  const es = getClient();
  
  const indices = [
    { name: config.elasticsearch.medicineIndex, settings: medicineIndexSettings },
    { name: config.elasticsearch.pharmacyIndex, settings: pharmacyIndexSettings },
    { name: config.elasticsearch.inventoryIndex, settings: inventoryIndexSettings }
  ];
  
  for (const index of indices) {
    try {
      const exists = await es.indices.exists({ index: index.name });
      if (!exists) {
        await es.indices.create({
          index: index.name,
          body: index.settings
        });
        logger.info(`Created index: ${index.name}`);
      }
    } catch (error) {
      logger.error(`Error creating index ${index.name}:`, { error: error.message });
    }
  }
}

/**
 * Search medicines
 */
async function searchMedicines(query, options = {}) {
  const { page = 1, size = 20 } = options;
  
  incrementSearchQueries('medicine');
  
  // Check cache
  const cacheKey = createCacheHash({ type: 'medicine', query, page, size });
  const cached = await getCachedSearchResults(cacheKey);
  if (cached) {
    return cached;
  }
  
  const es = getClient();
  
  try {
    const result = await es.search({
      index: config.elasticsearch.medicineIndex,
      body: {
        from: (page - 1) * size,
        size,
        query: {
          multi_match: {
            query,
            fields: [
              'name^3',
              'brand^2',
              'generic_name^2',
              'salt',
              'tags',
              'search_synonyms'
            ],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        }
      }
    });
    
    const response = {
      hits: result.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        ...hit._source
      })),
      total: result.hits.total.value,
      page,
      size
    };
    
    // Cache results
    await cacheSearchResults(cacheKey, response);
    
    return response;
  } catch (error) {
    logger.error('Medicine search error:', { error: error.message });
    throw error;
  }
}

/**
 * Autocomplete for medicines
 */
async function autocomplete(query, options = {}) {
  const { size = 10 } = options;
  
  incrementSearchQueries('autocomplete');
  
  const es = getClient();
  
  try {
    const result = await es.search({
      index: config.elasticsearch.medicineIndex,
      body: {
        size,
        query: {
          multi_match: {
            query,
            fields: ['name^3', 'brand^2', 'generic_name'],
            type: 'bool_prefix'
          }
        },
        _source: ['name', 'brand', 'generic_name', 'dosage_form', 'strength', 'prescription_required']
      }
    });
    
    return result.hits.hits.map(hit => ({
      id: hit._id,
      ...hit._source
    }));
  } catch (error) {
    logger.error('Autocomplete error:', { error: error.message });
    throw error;
  }
}

/**
 * Search pharmacies by location
 */
async function searchPharmacies(lat, lon, radius = 10, options = {}) {
  const { page = 1, size = 20 } = options;
  
  incrementSearchQueries('pharmacy');
  
  const es = getClient();
  
  try {
    const result = await es.search({
      index: config.elasticsearch.pharmacyIndex,
      body: {
        from: (page - 1) * size,
        size,
        query: {
          bool: {
            must: [
              { term: { is_active: true } }
            ],
            filter: {
              geo_distance: {
                distance: `${radius}km`,
                location: {
                  lat: parseFloat(lat),
                  lon: parseFloat(lon)
                }
              }
            }
          }
        },
        sort: [
          {
            _geo_distance: {
              location: {
                lat: parseFloat(lat),
                lon: parseFloat(lon)
              },
              order: 'asc',
              unit: 'km'
            }
          }
        ]
      }
    });
    
    return {
      hits: result.hits.hits.map(hit => ({
        id: hit._id,
        distance: hit.sort ? hit.sort[0] : null,
        ...hit._source
      })),
      total: result.hits.total.value,
      page,
      size
    };
  } catch (error) {
    logger.error('Pharmacy search error:', { error: error.message });
    throw error;
  }
}

/**
 * Index a medicine
 */
async function indexMedicine(medicine) {
  const es = getClient();
  
  try {
    await es.index({
      index: config.elasticsearch.medicineIndex,
      id: medicine._id.toString(),
      body: {
        name: medicine.name,
        brand: medicine.brand,
        generic_name: medicine.generic_name,
        salt: medicine.salt,
        dosage_form: medicine.dosage_form,
        strength: medicine.strength,
        prescription_required: medicine.prescription_required,
        tags: medicine.tags,
        search_synonyms: medicine.search_synonyms,
        manufacturer: medicine.manufacturer,
        created_at: medicine.created_at
      },
      refresh: true
    });
    
    logger.info(`Indexed medicine: ${medicine._id}`);
  } catch (error) {
    logger.error('Index medicine error:', { error: error.message });
    throw error;
  }
}

/**
 * Index a pharmacy
 */
async function indexPharmacy(pharmacy) {
  const es = getClient();
  
  try {
    await es.index({
      index: config.elasticsearch.pharmacyIndex,
      id: pharmacy._id.toString(),
      body: {
        name: pharmacy.name,
        address: pharmacy.address,
        location: {
          lat: pharmacy.geo.coordinates[1],
          lon: pharmacy.geo.coordinates[0]
        },
        is_active: pharmacy.is_active,
        rating: pharmacy.rating,
        opening_hours: pharmacy.opening_hours,
        created_at: pharmacy.created_at
      },
      refresh: true
    });
    
    logger.info(`Indexed pharmacy: ${pharmacy._id}`);
  } catch (error) {
    logger.error('Index pharmacy error:', { error: error.message });
    throw error;
  }
}

/**
 * Reindex all data from MongoDB
 */
async function reindexAll(mongoose) {
  const Medicine = mongoose.model('Medicine');
  const Pharmacy = mongoose.model('Pharmacy');
  
  logger.info('Starting full reindex...');
  
  // Reindex medicines
  const medicines = await Medicine.find();
  for (const medicine of medicines) {
    await indexMedicine(medicine);
  }
  logger.info(`Reindexed ${medicines.length} medicines`);
  
  // Reindex pharmacies
  const pharmacies = await Pharmacy.find();
  for (const pharmacy of pharmacies) {
    await indexPharmacy(pharmacy);
  }
  logger.info(`Reindexed ${pharmacies.length} pharmacies`);
  
  return {
    medicines: medicines.length,
    pharmacies: pharmacies.length
  };
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    const es = getClient();
    const health = await es.cluster.health();
    return {
      status: health.status === 'red' ? 'unhealthy' : 'healthy',
      cluster: health.status
    };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

module.exports = {
  initElasticsearch,
  getClient,
  setupIndices,
  searchMedicines,
  autocomplete,
  searchPharmacies,
  indexMedicine,
  indexPharmacy,
  reindexAll,
  healthCheck
};
