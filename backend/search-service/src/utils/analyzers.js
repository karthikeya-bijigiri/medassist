/**
 * Elasticsearch analyzers configuration
 */

// Edge n-gram analyzer for autocomplete
const autocompleteAnalyzer = {
  type: 'custom',
  tokenizer: 'autocomplete_tokenizer',
  filter: ['lowercase', 'asciifolding']
};

const autocompleteTokenizer = {
  type: 'edge_ngram',
  min_gram: 2,
  max_gram: 20,
  token_chars: ['letter', 'digit']
};

// Search analyzer for query time
const searchAnalyzer = {
  type: 'custom',
  tokenizer: 'standard',
  filter: ['lowercase', 'asciifolding']
};

// Medicine index settings
const medicineIndexSettings = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        autocomplete: autocompleteAnalyzer,
        search_analyzer: searchAnalyzer
      },
      tokenizer: {
        autocomplete_tokenizer: autocompleteTokenizer
      }
    }
  },
  mappings: {
    properties: {
      name: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'search_analyzer',
        fields: {
          keyword: { type: 'keyword' }
        }
      },
      brand: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'search_analyzer'
      },
      generic_name: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'search_analyzer'
      },
      salt: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'search_analyzer'
      },
      dosage_form: { type: 'keyword' },
      strength: { type: 'keyword' },
      prescription_required: { type: 'boolean' },
      tags: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'search_analyzer'
      },
      search_synonyms: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'search_analyzer'
      },
      manufacturer: { type: 'keyword' },
      created_at: { type: 'date' }
    }
  }
};

// Pharmacy index settings
const pharmacyIndexSettings = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        autocomplete: autocompleteAnalyzer,
        search_analyzer: searchAnalyzer
      },
      tokenizer: {
        autocomplete_tokenizer: autocompleteTokenizer
      }
    }
  },
  mappings: {
    properties: {
      name: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'search_analyzer',
        fields: {
          keyword: { type: 'keyword' }
        }
      },
      address: { type: 'text' },
      location: { type: 'geo_point' },
      is_active: { type: 'boolean' },
      rating: { type: 'float' },
      opening_hours: { type: 'text' },
      created_at: { type: 'date' }
    }
  }
};

// Pharmacy inventory index settings (for combined search)
const inventoryIndexSettings = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        autocomplete: autocompleteAnalyzer,
        search_analyzer: searchAnalyzer
      },
      tokenizer: {
        autocomplete_tokenizer: autocompleteTokenizer
      }
    }
  },
  mappings: {
    properties: {
      medicine_id: { type: 'keyword' },
      medicine_name: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'search_analyzer'
      },
      medicine_brand: { type: 'text' },
      medicine_generic_name: { type: 'text' },
      pharmacy_id: { type: 'keyword' },
      pharmacy_name: { type: 'text' },
      pharmacy_location: { type: 'geo_point' },
      selling_price: { type: 'float' },
      quantity_available: { type: 'integer' },
      expiry_date: { type: 'date' },
      is_active: { type: 'boolean' }
    }
  }
};

module.exports = {
  autocompleteAnalyzer,
  autocompleteTokenizer,
  searchAnalyzer,
  medicineIndexSettings,
  pharmacyIndexSettings,
  inventoryIndexSettings
};
