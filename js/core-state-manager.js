/**
 * ============================================================================
 * CORE STATE MANAGER - Global State Management System for Mangrove WebGIS
 * ============================================================================
 * 
 * Provides centralized, event-driven state management for:
 * - Dashboard state (current filters, year, view mode)
 * - Cached Excel data and statistics
 * - UI component synchronization
 * - Event propagation to all listeners
 * 
 * Architecture:
 * - Reactive state store with immutable updates
 * - Event-based observer pattern
 * - Lazy loading with caching
 * - Computed properties (derived state)
 * 
 * Usage:
 *   const manager = new CoreStateManager();
 *   await manager.loadExcelData('data/Dashboard.xlsx');
 *   manager.subscribe('filter-change', callback);
 *   manager.setFilter('kabkota', 'Makassar');
 */

class CoreStateManager {
  constructor() {
    // ===== MAIN STATE =====
    this.state = {
      // Data cache
      excelData: {
        '2016Mangrove': [],
        '2026Mangrove': [],
        'LajuForestasiKab': [],
        'LajuForestasiDesa': [],
        'ZonaKawasan': [],
        'StokKarbon': [],
        'StokKarbonDesa': [],
        'MatrixPerubahan': [],
        'PerubahanTutupan': [],
        'PerubahanTuplah': [],
      },
      allowedExcelData: {
        '2016Mangrove': [],
        '2026Mangrove': [],
        'LajuForestasiKab': [],
        'LajuForestasiDesa': [],
        'ZonaKawasan': [],
        'StokKarbon': [],
        'StokKarbonDesa': [],
        'MatrixPerubahan': [],
        'PerubahanTutupan': [],
        'PerubahanTuplah': [],
      },
      
      // Current filters
      filters: {
        year: 2026,
        provinsi: '',
        kabkota: '',
        kecamatan: '',
        desa: '',
        kelas_ndvi: '',
        zona: '',
        viewMode: 'all' // all, byDistrict, byVillage, etc
      },
      
      // Computed statistics (cached)
      statistics: {
        current: {},
        previous: {},
        byYear: {},
        byRegion: {},
        byClass: {}
      },
      
      // UI state
      ui: {
        activeTab: 'ringkasan',
        expandedPanels: [],
        selectedRegion: null,
        highlightedFeature: null,
        mapCenter: [-5.65, 119.75],
        mapZoom: 10,
        timeSliderPosition: 0.5 // 0 = 2016, 1 = 2026
      },
      
      // Layer visibility state
      layers: {
        '2016Mangrove': true,
        '2026Mangrove': true,
        'ZonaKawasan': false,
        'StokKarbon': false,
        'LajuForestasi': false,
        'PerubahanLahan': false
      },
      
      // Data loading state
      loading: {
        excelData: false,
        statistics: false,
        mapLayers: false
      },
      
      // Error state
      errors: []
    };
    
    // Event listeners registry
    this.listeners = new Map();
    
    // Computed properties cache
    this.computedCache = new Map();
    this.cacheVersion = 0;
  }

  /**
   * Normalize kabupaten names for comparison
   */
  normalizeKabupaten(value) {
    if (value === undefined || value === null) return '';
    const str = String(value || '').trim().toLowerCase();
    return str
      .replace(/^kabupaten\s*/i, '')
      .replace(/^kab\.\s*/i, '')
      .replace(/^kota\s*/i, '')
      .replace(/^kot\.\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check whether a kabupaten is part of the allowed list
   */
  isAllowedKabupaten(value) {
    const allowed = ['jeneponto', 'maros', 'barru', 'sinjai'];
    const normalized = this.normalizeKabupaten(value);
    return allowed.includes(normalized);
  }

  /**
   * Return possible row values for kabupaten keys
   */
  getRowKabupaten(row) {
    if (!row || typeof row !== 'object') return '';
    const possibleKeys = ['Kabupaten', 'kabupaten', 'KabKota', 'kabkota', 'WADMKK', 'WADMKOTA', 'KABUPATEN', 'kabkota'];
    for (const key of possibleKeys) {
      if (row.hasOwnProperty(key)) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value || '').trim()) {
          return String(value || '').trim();
        }
      }
    }
    // fallback to any key containing kabupaten/kabkota
    for (const key of Object.keys(row)) {
      const lower = key.toLowerCase();
      if (lower.includes('kabupaten') || lower.includes('kabkota') || lower.includes('wadmkk')) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value || '').trim()) {
          return String(value || '').trim();
        }
      }
    }
    return '';
  }

  /**
   * Filter rows so only allowed kabupaten remain
   */
  filterRowsByAllowedKabupaten(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.filter(row => this.isAllowedKabupaten(this.getRowKabupaten(row)));
  }

  /**
   * ===== EXCEL DATA MANAGEMENT =====
   */
   
  /**
   * Load Excel data from file with caching
   */
  async loadExcelData(excelPath) {
    this.setLoading('excelData', true);
    this.emit('loading-start', 'excelData');
    
    try {
      const response = await fetch(excelPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const sheets = [
        '2016Mangrove',
        '2026Mangrove',
        'LajuForestasiKab',
        'LajuForestasiDesa',
        'ZonaKawasan',
        'StokKarbon',
        'StokKarbonDesa',
        'MatrixPerubahan',
        'PerubahanTutupan',
        'PerubahanTuplah'
      ];
      
      for (const sheetName of sheets) {
        if (workbook.SheetNames.includes(sheetName)) {
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet);
          const allowedRows = this.filterRowsByAllowedKabupaten(rawRows);
          this.state.excelData[sheetName] = rawRows;
          this.state.allowedExcelData[sheetName] = allowedRows;
          console.log(`✅ Loaded ${sheetName}: ${rawRows.length} rows → ${allowedRows.length} allowed rows`);
        }
      }
      
      // Invalidate computed cache after data load
      this.cacheVersion++;
      this.emit('excel-data-loaded', this.state.excelData);
      
    } catch (error) {
      this.addError(`Excel loading failed: ${error.message}`);
      this.emit('error', error);
      throw error;
    } finally {
      this.setLoading('excelData', false);
      this.emit('loading-end', 'excelData');
    }
  }
  
  /**
   * Get raw data from specific sheet
   */
  getSheetData(sheetName) {
    const aliases = {
      'PerubahanLahan': ['PerubahanTuplah', 'PerubahanTutupan'],
      'PerubahanTuplah': ['PerubahanTutupan', 'PerubahanLahan'],
      'PerubahanTutupan': ['PerubahanTuplah', 'PerubahanLahan']
    };

    if (Object.prototype.hasOwnProperty.call(this.state.allowedExcelData, sheetName)) {
      return this.state.allowedExcelData[sheetName];
    }

    for (const alias of aliases[sheetName] || []) {
      if (Object.prototype.hasOwnProperty.call(this.state.allowedExcelData, alias)) {
        return this.state.allowedExcelData[alias];
      }
    }

    if (Object.prototype.hasOwnProperty.call(this.state.excelData, sheetName)) {
      return this.state.excelData[sheetName];
    }

    for (const alias of aliases[sheetName] || []) {
      if (Object.prototype.hasOwnProperty.call(this.state.excelData, alias)) {
        return this.state.excelData[alias];
      }
    }

    return [];
  }

  /**
   * Get only rows for allowed kabupaten
   */
  getAllowedSheetData(sheetName) {
    const aliases = {
      'PerubahanLahan': ['PerubahanTuplah', 'PerubahanTutupan'],
      'PerubahanTuplah': ['PerubahanTutupan', 'PerubahanLahan'],
      'PerubahanTutupan': ['PerubahanTuplah', 'PerubahanLahan']
    };

    if (Object.prototype.hasOwnProperty.call(this.state.allowedExcelData, sheetName)) {
      return this.state.allowedExcelData[sheetName];
    }

    for (const alias of aliases[sheetName] || []) {
      if (Object.prototype.hasOwnProperty.call(this.state.allowedExcelData, alias)) {
        return this.state.allowedExcelData[alias];
      }
    }

    return [];
  }
  
  /**
   * ===== FILTER MANAGEMENT =====
   */
  
  /**
   * Update single filter value
   */
  setFilter(filterName, value) {
    const oldValue = this.state.filters[filterName];
    
    if (oldValue === value) return; // No change
    
    // Reset dependent filters when parent changes
    if (filterName === 'provinsi') {
      this.state.filters.kabkota = '';
      this.state.filters.kecamatan = '';
      this.state.filters.desa = '';
    } else if (filterName === 'kabkota') {
      this.state.filters.kecamatan = '';
      this.state.filters.desa = '';
    } else if (filterName === 'kecamatan') {
      this.state.filters.desa = '';
    }
    
    this.state.filters[filterName] = value;
    this.cacheVersion++; // Invalidate computed cache
    
    this.emit('filter-change', {
      filterName,
      oldValue,
      newValue: value,
      allFilters: { ...this.state.filters }
    });
  }
  
  /**
   * Update multiple filters at once
   */
  setFilters(filterObj) {
    Object.entries(filterObj).forEach(([key, value]) => {
      this.setFilter(key, value);
    });
  }
  
  /**
   * Reset all filters to initial state
   */
  resetFilters() {
    const oldFilters = { ...this.state.filters };
    this.state.filters = {
      year: 2026,
      provinsi: '',
      kabkota: '',
      kecamatan: '',
      desa: '',
      kelas_ndvi: '',
      zona: '',
      viewMode: 'all'
    };
    this.cacheVersion++;
    this.emit('filters-reset', { oldFilters });
  }
  
  /**
   * Get current filter state
   */
  getFilters() {
    return { ...this.state.filters };
  }
  
  /**
   * Check if any filter is active
   */
  isFilterActive() {
    return !!(
      this.state.filters.provinsi ||
      this.state.filters.kabkota ||
      this.state.filters.kecamatan ||
      this.state.filters.desa ||
      this.state.filters.kelas_ndvi ||
      this.state.filters.zona
    );
  }
  
  /**
   * Get human-readable filter description
   */
  getFilterDescription() {
    const parts = [];
    if (this.state.filters.provinsi) parts.push(`Prov: ${this.state.filters.provinsi}`);
    if (this.state.filters.kabkota) parts.push(`Kab: ${this.state.filters.kabkota}`);
    if (this.state.filters.kecamatan) parts.push(`Kec: ${this.state.filters.kecamatan}`);
    if (this.state.filters.desa) parts.push(`Des: ${this.state.filters.desa}`);
    if (this.state.filters.kelas_ndvi) parts.push(`NDVI: ${this.state.filters.kelas_ndvi}`);
    if (this.state.filters.zona) parts.push(`Zona: ${this.state.filters.zona}`);
    return parts.length ? parts.join(' • ') : 'Semua wilayah';
  }
  
  /**
   * ===== UI STATE MANAGEMENT =====
   */
  
  /**
   * Set active tab
   */
  setActiveTab(tabName) {
    if (this.state.ui.activeTab !== tabName) {
      this.state.ui.activeTab = tabName;
      this.emit('tab-change', { activeTab: tabName });
    }
  }
  
  /**
   * Update UI state
   */
  setUIState(uiObj) {
    Object.assign(this.state.ui, uiObj);
    this.emit('ui-change', this.state.ui);
  }
  
  /**
   * Get UI state
   */
  getUIState() {
    return { ...this.state.ui };
  }
  
  /**
   * ===== LAYER VISIBILITY =====
   */
  
  /**
   * Toggle layer visibility
   */
  toggleLayer(layerName) {
    this.state.layers[layerName] = !this.state.layers[layerName];
    this.emit('layer-toggle', { layerName, visible: this.state.layers[layerName] });
  }
  
  /**
   * Set layer visibility
   */
  setLayerVisibility(layerName, visible) {
    if (this.state.layers[layerName] !== visible) {
      this.state.layers[layerName] = visible;
      this.emit('layer-toggle', { layerName, visible });
    }
  }
  
  /**
   * Get layer visibility state
   */
  getLayerVisibility(layerName) {
    return this.state.layers[layerName] ?? false;
  }
  
  /**
   * Get all layer visibility states
   */
  getAllLayerVisibility() {
    return { ...this.state.layers };
  }
  
  /**
   * ===== EVENT SYSTEM =====
   */
  
  /**
   * Subscribe to state changes
   * @param {string} eventName - Event to listen for
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventName).delete(callback);
    };
  }
  
  /**
   * Emit event to all listeners
   */
  emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${eventName}:`, error);
        }
      });
    }
  }
  
  /**
   * ===== LOADING STATE =====
   */
  
  /**
   * Set loading state
   */
  setLoading(key, isLoading) {
    this.state.loading[key] = isLoading;
    this.emit('loading-state-change', { key, isLoading });
  }
  
  /**
   * Get loading state
   */
  getLoading(key) {
    return this.state.loading[key] || false;
  }
  
  /**
   * ===== ERROR HANDLING =====
   */
  
  /**
   * Add error to state
   */
  addError(message, severity = 'warning') {
    this.state.errors.push({ message, severity, timestamp: Date.now() });
    this.emit('error-added', { message, severity });
  }
  
  /**
   * Clear all errors
   */
  clearErrors() {
    this.state.errors = [];
    this.emit('errors-cleared');
  }
  
  /**
   * Get all errors
   */
  getErrors() {
    return [...this.state.errors];
  }
  
  /**
   * ===== STATISTICS & COMPUTED PROPERTIES =====
   */
  
  /**
   * Get filtered data based on current filters
   * @returns {Array} Filtered records from the selected year
   */
  getFilteredData() {
    const sheetName = this.state.filters.year === 2016 ? '2016Mangrove' : '2026Mangrove';
    let data = this.getSheetData(sheetName);
    
    // Apply filters
    if (this.state.filters.provinsi) {
      data = data.filter(r => r.provinsi === this.state.filters.provinsi);
    }
    if (this.state.filters.kabkota) {
      data = data.filter(r => r.kabkota === this.state.filters.kabkota);
    }
    if (this.state.filters.kecamatan) {
      data = data.filter(r => r.kecamatan === this.state.filters.kecamatan);
    }
    if (this.state.filters.desa) {
      data = data.filter(r => r.desa === this.state.filters.desa);
    }
    if (this.state.filters.kelas_ndvi) {
      data = data.filter(r => r.kelas === this.state.filters.kelas_ndvi);
    }
    
    return data;
  }
  
  /**
   * Get complete state
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  /**
   * Get filter options (distinct values available)
   */
  getFilterOptions() {
    const sheetName = this.state.filters.year === 2016 ? '2016Mangrove' : '2026Mangrove';
    const data = this.getSheetData(sheetName);
    
    const options = {
      provinsi: [...new Set(data.map(r => r.provinsi).filter(Boolean))].sort(),
      kabkota: [],
      kecamatan: [],
      desa: [],
      kelas_ndvi: [...new Set(data.map(r => r.kelas).filter(Boolean))].sort()
    };
    
    // Cascading filter options
    if (this.state.filters.provinsi) {
      const provData = data.filter(r => r.provinsi === this.state.filters.provinsi);
      options.kabkota = [...new Set(provData.map(r => r.kabkota).filter(Boolean))].sort();
      
      if (this.state.filters.kabkota) {
        const kabData = provData.filter(r => r.kabkota === this.state.filters.kabkota);
        options.kecamatan = [...new Set(kabData.map(r => r.kecamatan).filter(Boolean))].sort();
        
        if (this.state.filters.kecamatan) {
          const kecData = kabData.filter(r => r.kecamatan === this.state.filters.kecamatan);
          options.desa = [...new Set(kecData.map(r => r.desa).filter(Boolean))].sort();
        }
      }
    }
    
    return options;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CoreStateManager;
}
