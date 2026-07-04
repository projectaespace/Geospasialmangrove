/**
 * ============================================================================
 * DATA UTILITIES - Aggregation, Filtering, and Statistical Functions
 * ============================================================================
 * 
 * Provides reusable functions for:
 * - Data aggregation (sum, count, average, etc.)
 * - Filtering and grouping
 * - Statistical calculations
 * - Data transformation
 * - Lookup and matching operations
 * 
 * All functions are pure and stateless for easy testing and composition
 */

class DataUtilities {
  /**
   * ===== AGGREGATION FUNCTIONS =====
   */
  
  /**
   * Sum values from array of objects
   */
  static sum(data, field) {
    return data.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
  }
  
  /**
   * Count items
   */
  static count(data) {
    return data.length;
  }
  
  /**
   * Average of field values
   */
  static avg(data, field) {
    if (data.length === 0) return 0;
    return this.sum(data, field) / data.length;
  }
  
  /**
   * Min value of field
   */
  static min(data, field) {
    if (data.length === 0) return 0;
    return Math.min(...data.map(d => parseFloat(d[field]) || 0));
  }
  
  /**
   * Max value of field
   */
  static max(data, field) {
    if (data.length === 0) return 0;
    return Math.max(...data.map(d => parseFloat(d[field]) || 0));
  }
  
  /**
   * Median value of field
   */
  static median(data, field) {
    if (data.length === 0) return 0;
    const sorted = [...data]
      .map(d => parseFloat(d[field]) || 0)
      .sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  /**
   * Percentile value
   */
  static percentile(data, field, p) {
    if (data.length === 0) return 0;
    const sorted = [...data]
      .map(d => parseFloat(d[field]) || 0)
      .sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  /**
   * Standard deviation
   */
  static stdDev(data, field) {
    if (data.length <= 1) return 0;
    const mean = this.avg(data, field);
    const variance = data.reduce((acc, item) => {
      const val = parseFloat(item[field]) || 0;
      return acc + Math.pow(val - mean, 2);
    }, 0) / (data.length - 1);
    return Math.sqrt(variance);
  }
  
  /**
   * ===== GROUPING FUNCTIONS =====
   */
  
  /**
   * Group data by field value
   */
  static groupBy(data, field) {
    return data.reduce((acc, item) => {
      const key = item[field];
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }
  
  /**
   * Group by multiple fields (hierarchical)
   */
  static groupByMultiple(data, fields) {
    if (fields.length === 0) return data;
    
    const field = fields[0];
    const remaining = fields.slice(1);
    
    const grouped = this.groupBy(data, field);
    
    if (remaining.length === 0) {
      return grouped;
    }
    
    const result = {};
    for (const [key, group] of Object.entries(grouped)) {
      result[key] = this.groupByMultiple(group, remaining);
    }
    return result;
  }
  
  /**
   * Count items by field value
   */
  static countBy(data, field) {
    return data.reduce((acc, item) => {
      const key = item[field];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
  
  /**
   * ===== FILTERING FUNCTIONS =====
   */
  
  /**
   * Filter data by multiple criteria (object format)
   */
  static filterByCriteria(data, criteria) {
    return data.filter(item => {
      return Object.entries(criteria).every(([field, value]) => {
        if (!value) return true; // Skip empty values
        return item[field] === value;
      });
    });
  }
  
  /**
   * Filter data by range
   */
  static filterByRange(data, field, min, max) {
    return data.filter(item => {
      const val = parseFloat(item[field]) || 0;
      return val >= min && val <= max;
    });
  }
  
  /**
   * Filter unique values
   */
  static filterUnique(data, field) {
    const seen = new Set();
    return data.filter(item => {
      const val = item[field];
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  }
  
  /**
   * Get distinct values for field
   */
  static distinct(data, field) {
    return [...new Set(data.map(item => item[field]).filter(Boolean))];
  }
  
  /**
   * ===== SORTING FUNCTIONS =====
   */
  
  /**
   * Sort by field value
   */
  static sortBy(data, field, ascending = true) {
    return [...data].sort((a, b) => {
      const aVal = isNaN(a[field]) ? a[field] : parseFloat(a[field]);
      const bVal = isNaN(b[field]) ? b[field] : parseFloat(b[field]);
      
      if (typeof aVal === 'string') {
        return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return ascending ? aVal - bVal : bVal - aVal;
    });
  }
  
  /**
   * Sort by multiple fields
   */
  static sortByMultiple(data, sortConfig) {
    return [...data].sort((a, b) => {
      for (const { field, ascending = true } of sortConfig) {
        const aVal = isNaN(a[field]) ? a[field] : parseFloat(a[field]);
        const bVal = isNaN(b[field]) ? b[field] : parseFloat(b[field]);
        
        let comparison = 0;
        if (typeof aVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = aVal - bVal;
        }
        
        if (comparison !== 0) {
          return ascending ? comparison : -comparison;
        }
      }
      return 0;
    });
  }
  
  /**
   * ===== LOOKUP & MATCHING =====
   */
  
  /**
   * Lookup matching record from data array
   */
  static lookup(data, criteria) {
    return data.find(item => {
      return Object.entries(criteria).every(([field, value]) => item[field] === value);
    });
  }
  
  /**
   * Lookup all matching records
   */
  static lookupAll(data, criteria) {
    return data.filter(item => {
      return Object.entries(criteria).every(([field, value]) => item[field] === value);
    });
  }
  
  /**
   * Lookup by primary key and add additional fields
   * Useful for enriching data from multiple sources
   */
  static enrich(primaryData, enrichmentData, matchField, fieldsToAdd) {
    return primaryData.map(primary => {
      const match = this.lookup(enrichmentData, { [matchField]: primary[matchField] });
      if (match) {
        const enriched = { ...primary };
        fieldsToAdd.forEach(field => {
          enriched[field] = match[field];
        });
        return enriched;
      }
      return primary;
    });
  }
  
  /**
   * Reverse lookup - find from enrichment data based on primary match
   */
  static reverseLookup(primaryData, enrichmentData, primaryField, enrichmentField) {
    return primaryData.map(primary => ({
      ...primary,
      matched: enrichmentData.filter(enrich => enrich[enrichmentField] === primary[primaryField])
    }));
  }
  
  /**
   * ===== DATA TRANSFORMATION =====
   */
  
  /**
   * Pivot data - convert long to wide format
   */
  static pivot(data, rowField, colField, valueField, aggregateFn = 'sum') {
    const grouped = this.groupByMultiple(data, [rowField, colField]);
    const result = {};
    
    for (const [rowKey, colGroups] of Object.entries(grouped)) {
      result[rowKey] = {};
      for (const [colKey, items] of Object.entries(colGroups)) {
        if (aggregateFn === 'sum') {
          result[rowKey][colKey] = this.sum(items, valueField);
        } else if (aggregateFn === 'count') {
          result[rowKey][colKey] = items.length;
        } else if (aggregateFn === 'avg') {
          result[rowKey][colKey] = this.avg(items, valueField);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Normalize numeric values to 0-1 range (min-max normalization)
   */
  static normalize(data, field) {
    const min = this.min(data, field);
    const max = this.max(data, field);
    const range = max - min || 1;
    
    return data.map(item => ({
      ...item,
      [field + '_normalized']: (parseFloat(item[field]) - min) / range
    }));
  }
  
  /**
   * Categorize continuous data into intervals
   */
  static categorize(data, field, intervals) {
    return data.map(item => {
      const value = parseFloat(item[field]) || 0;
      let category = 'Unknown';
      
      for (let i = 0; i < intervals.length; i++) {
        if (value <= intervals[i].max) {
          category = intervals[i].label;
          break;
        }
      }
      
      return {
        ...item,
        [field + '_category']: category
      };
    });
  }
  
  /**
   * ===== STATISTICAL CALCULATIONS =====
   */
  
  /**
   * Calculate percentage change
   */
  static percentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }
  
  /**
   * Calculate year-over-year change
   */
  static yoyChange(data2016, data2026, field) {
    const val2016 = this.sum(data2016, field);
    const val2026 = this.sum(data2026, field);
    return {
      value2016: val2016,
      value2026: val2026,
      change: val2026 - val2016,
      percentChange: this.percentageChange(val2016, val2026),
      trend: val2026 > val2016 ? 'up' : val2026 < val2016 ? 'down' : 'stable'
    };
  }
  
  /**
   * Calculate severity score (for mangrove degradation)
   * Scores: Rusak=100, Jarang=75, Sedang=50, Lebat=25
   */
  static calculateDegradationSeverity(classData) {
    const scoreMap = {
      'Rusak': 100,
      'Jarang': 75,
      'Sedang': 50,
      'Lebat': 25,
      'Air': 0
    };
    
    let totalScore = 0;
    let totalArea = 0;
    
    for (const [kelas, items] of Object.entries(classData)) {
      const area = this.sum(items, 'sq_ha');
      const score = scoreMap[kelas] || 0;
      totalScore += score * area;
      totalArea += area;
    }
    
    const severity = totalArea > 0 ? totalScore / totalArea : 0;
    
    return {
      score: Math.round(severity),
      label: severity >= 75 ? 'SANGAT KRITIS' :
             severity >= 50 ? 'KRITIS' :
             severity >= 25 ? 'PERLU PERHATIAN' : 'BAIK',
      trend: severity > 60 ? 'menurun' : 'stabil'
    };
  }
  
  /**
   * ===== DATA VALIDATION =====
   */
  
  /**
   * Validate required fields in data
   */
  static validateFields(data, requiredFields) {
    const errors = [];
    
    data.forEach((item, idx) => {
      requiredFields.forEach(field => {
        if (!item[field]) {
          errors.push(`Row ${idx}: Missing field "${field}"`);
        }
      });
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Clean data - remove empty rows, trim strings
   */
  static cleanData(data) {
    return data
      .filter(item => Object.values(item).some(v => v != null && v !== ''))
      .map(item => {
        const cleaned = {};
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === 'string') {
            cleaned[key] = value.trim();
          } else {
            cleaned[key] = value;
          }
        }
        return cleaned;
      });
  }
  
  /**
   * ===== COMPARISON FUNCTIONS =====
   */
  
  /**
   * Compare two datasets and identify changes
   */
  static compareDatasets(data1, data2, matchField, compareFields) {
    const result = {
      added: [],
      removed: [],
      modified: [],
      unchanged: []
    };
    
    // Find removed and modified
    data1.forEach(item1 => {
      const item2 = this.lookup(data2, { [matchField]: item1[matchField] });
      if (!item2) {
        result.removed.push(item1);
      } else {
        const isModified = compareFields.some(field => item1[field] !== item2[field]);
        if (isModified) {
          result.modified.push({ old: item1, new: item2 });
        } else {
          result.unchanged.push(item1);
        }
      }
    });
    
    // Find added
    data2.forEach(item2 => {
      if (!this.lookup(data1, { [matchField]: item2[matchField] })) {
        result.added.push(item2);
      }
    });
    
    return result;
  }
  
  /**
   * ===== PAGINATION =====
   */
  
  /**
   * Paginate data
   */
  static paginate(data, pageSize, pageNumber = 1) {
    const totalPages = Math.ceil(data.length / pageSize);
    const start = (pageNumber - 1) * pageSize;
    const end = start + pageSize;
    
    return {
      data: data.slice(start, end),
      pageNumber,
      pageSize,
      totalItems: data.length,
      totalPages,
      hasNextPage: pageNumber < totalPages,
      hasPreviousPage: pageNumber > 1
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataUtilities;
}
