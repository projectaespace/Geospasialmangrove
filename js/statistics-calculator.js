/**
 * ============================================================================
 * STATISTICS CALCULATOR - Real-time Statistical Computation
 * ============================================================================
 * 
 * Computes all statistics and KPIs used across dashboards:
 * - Mangrove area statistics
 * - NDVI class distribution
 * - Forest rate statistics
 * - Carbon stock aggregation
 * - Zone distribution
 * - Change analysis
 * 
 * Works in conjunction with CoreStateManager for reactive updates
 * Uses DataUtilities for aggregation functions
 */

class StatisticsCalculator {
  constructor(stateManager) {
    this.state = stateManager;
    this.cache = new Map();
  }
  
  /**
   * ===== MAIN STATISTICS =====
   */
  
  /**
   * Calculate comprehensive statistics for current filter state
   */
  calculateStatistics() {
    const cacheKey = this.getCacheKey();
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const data = this.state.getFilteredData();
    
    const stats = {
      // Basic metrics
      totalArea: DataUtilities.sum(data, 'sq_ha'),
      polygonCount: data.length,
      
      // Geographic distribution
      provinceCount: DataUtilities.distinct(data, 'provinsi').length,
      regencyCount: DataUtilities.distinct(data, 'kabkota').length,
      districtCount: DataUtilities.distinct(data, 'kecamatan').length,
      villageCount: DataUtilities.distinct(data, 'desa').length,
      
      // NDVI statistics
      ndviMean: DataUtilities.avg(data, 'ndvi'),
      ndviMedian: DataUtilities.median(data, 'ndvi'),
      ndviMin: DataUtilities.min(data, 'ndvi'),
      ndviMax: DataUtilities.max(data, 'ndvi'),
      ndviStdDev: DataUtilities.stdDev(data, 'ndvi'),
      
      // Class distribution
      byClass: this.getClassDistribution(data),
      
      // Geographic breakdown
      byRegency: this.getRegencyBreakdown(data),
      byDistrict: this.getDistrictBreakdown(data),
      byVillage: this.getVillageBreakdown(data),
      
      // Year comparison (if applicable)
      yearComparison: this.getYearComparison(),
      
      // Degradation severity
      severity: this.calculateSeverity(data),
      
      // Trend indicators
      trend: this.calculateTrend()
    };
    
    this.cache.set(cacheKey, stats);
    return stats;
  }
  
  /**
   * ===== MANGROVE CLASS DISTRIBUTION =====
   */
  
  /**
   * Get distribution of mangrove classes
   */
  getClassDistribution(data) {
    const grouped = DataUtilities.groupBy(data, 'kelas');
    const result = {};
    
    for (const [kelas, items] of Object.entries(grouped)) {
      result[kelas] = {
        area: DataUtilities.sum(items, 'sq_ha'),
        polygonCount: items.length,
        percentage: 0
      };
    }
    
    const totalArea = Object.values(result).reduce((sum, item) => sum + item.area, 0);
    for (const key in result) {
      result[key].percentage = totalArea > 0 ? (result[key].area / totalArea) * 100 : 0;
    }
    
    return result;
  }
  
  /**
   * ===== GEOGRAPHIC BREAKDOWN =====
   */
  
  /**
   * Get statistics by regency
   */
  getRegencyBreakdown(data) {
    const grouped = DataUtilities.groupBy(data, 'kabkota');
    const result = {};
    
    for (const [kabkota, items] of Object.entries(grouped)) {
      result[kabkota] = {
        area: DataUtilities.sum(items, 'sq_ha'),
        polygonCount: items.length,
        ndviMean: DataUtilities.avg(items, 'ndvi'),
        districtCount: DataUtilities.distinct(items, 'kecamatan').length,
        villageCount: DataUtilities.distinct(items, 'desa').length,
        byClass: this.getClassDistribution(items)
      };
    }
    
    return result;
  }
  
  /**
   * Get statistics by district
   */
  getDistrictBreakdown(data) {
    const grouped = DataUtilities.groupBy(data, 'kecamatan');
    const result = {};
    
    for (const [kecamatan, items] of Object.entries(grouped)) {
      result[kecamatan] = {
        area: DataUtilities.sum(items, 'sq_ha'),
        polygonCount: items.length,
        ndviMean: DataUtilities.avg(items, 'ndvi'),
        regency: items[0]?.kabkota,
        villageCount: DataUtilities.distinct(items, 'desa').length
      };
    }
    
    return result;
  }
  
  /**
   * Get statistics by village
   */
  getVillageBreakdown(data) {
    const grouped = DataUtilities.groupBy(data, 'desa');
    const result = {};
    
    for (const [desa, items] of Object.entries(grouped)) {
      result[desa] = {
        area: DataUtilities.sum(items, 'sq_ha'),
        polygonCount: items.length,
        ndviMean: DataUtilities.avg(items, 'ndvi'),
        district: items[0]?.kecamatan,
        regency: items[0]?.kabkota
      };
    }
    
    return result;
  }
  
  /**
   * ===== YEAR COMPARISON =====
   */
  
  /**
   * Compare statistics between 2016 and 2026
   */
  getYearComparison() {
    const data2016 = this.state.getSheetData('2016Mangrove');
    const data2026 = this.state.getSheetData('2026Mangrove');
    
    // Apply current filters to both years
    const filtered2016 = this.applyFiltersToData(data2016);
    const filtered2026 = this.applyFiltersToData(data2026);
    
    const area2016 = DataUtilities.sum(filtered2016, 'sq_ha');
    const area2026 = DataUtilities.sum(filtered2026, 'sq_ha');
    
    const change = area2026 - area2016;
    const percentChange = DataUtilities.percentageChange(area2016, area2026);
    
    return {
      area2016,
      area2026,
      change,
      percentChange,
      trend: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'stable',
      ndvi2016: DataUtilities.avg(filtered2016, 'ndvi'),
      ndvi2026: DataUtilities.avg(filtered2026, 'ndvi')
    };
  }
  
  /**
   * Apply current filters to dataset
   */
  applyFiltersToData(data) {
    const filters = this.state.getFilters();
    return DataUtilities.filterByCriteria(data, {
      provinsi: filters.provinsi,
      kabkota: filters.kabkota,
      kecamatan: filters.kecamatan,
      desa: filters.desa
    });
  }
  
  /**
   * ===== DEGRADATION SEVERITY =====
   */
  
  /**
   * Calculate degradation severity score
   */
  calculateSeverity(data) {
    const byClass = this.getClassDistribution(data);
    return DataUtilities.calculateDegradationSeverity(this.restructureForSeverity(byClass));
  }
  
  /**
   * Restructure class distribution for severity calculation
   */
  restructureForSeverity(classDistribution) {
    const result = {};
    for (const [kelas, info] of Object.entries(classDistribution)) {
      result[kelas] = Array(info.polygonCount).fill({ sq_ha: info.area / info.polygonCount });
    }
    return result;
  }
  
  /**
   * ===== TREND CALCULATIONS =====
   */
  
  /**
   * Calculate trend for current period
   */
  calculateTrend() {
    const comparison = this.getYearComparison();
    
    return {
      direction: comparison.trend,
      magnitude: Math.abs(comparison.percentChange),
      status: comparison.percentChange > 5 ? 'increasing' :
              comparison.percentChange < -5 ? 'decreasing' : 'stable'
    };
  }
  
  /**
   * ===== FOREST RATE STATISTICS (LajuForestasi) =====
   */
  
  /**
   * Get regency-level forest rate statistics
   */
  getForestRateByRegency() {
    const data = this.state.getSheetData('LajuForestasiKab');
    return DataUtilities.sortBy(data, 'perubahan_persen', false);
  }
  
  /**
   * Get forest rate with enrichment from mangrove data
   */
  getForestRateEnriched() {
    const kabData = this.state.getSheetData('LajuForestasiKab');
    const mangrove2016 = this.state.getSheetData('2016Mangrove');
    const mangrove2026 = this.state.getSheetData('2026Mangrove');
    
    return kabData.map(kab => {
      const data2016 = DataUtilities.filterByCriteria(mangrove2016, { kabkota: kab.kabupaten });
      const data2026 = DataUtilities.filterByCriteria(mangrove2026, { kabkota: kab.kabupaten });
      
      return {
        ...kab,
        polygonCount2016: data2016.length,
        polygonCount2026: data2026.length,
        ndvi2016: DataUtilities.avg(data2016, 'ndvi'),
        ndvi2026: DataUtilities.avg(data2026, 'ndvi')
      };
    });
  }
  
  /**
   * Get village-level forest rate statistics with kabkota/kecamatan lookup
   */
  getForestRateByVillage() {
    const desaData = this.state.getSheetData('LajuForestasiDesa');
    const mangrove2016 = this.state.getSheetData('2016Mangrove');
    
    // Enrich with geographic hierarchy via lookup
    return desaData.map(desa => {
      const match = DataUtilities.lookup(mangrove2016, { desa: desa.desa });
      return {
        ...desa,
        desa: desa.desa,
        kecamatan: match?.kecamatan || 'Unknown',
        kabupaten: match?.kabkota || 'Unknown'
      };
    });
  }
  
  /**
   * ===== ZONE STATISTICS (ZonaKawasan) =====
   */
  
  /**
   * Get zone distribution statistics
   */
  getZoneStatistics() {
    const data = this.state.getSheetData('ZonaKawasan');
    const result = {};

    const normalizeZona = (zona) => {
      const z = (zona || '').toString().trim().toLowerCase();
      if (z.includes('konservasi') || z.includes('cagar') || z.includes('lindung')) return 'Konservasi';
      if (z.includes('rehabilitasi') || z.includes('restorasi') || z.includes('pemulihan')) return 'Rehabilitasi';
      return z || 'Unknown';
    };

    const getAreaValue = (row) => {
      return parseFloat(row['sq_ha'] || row['Area'] || row['area'] || row['Luas_Ha'] || row['LUAS_HA'] || 0) || 0;
    };

    const getZoneName = (row) => {
      return row['zona'] || row['Zona'] || row['zona_nama'] || row['ZonaNama'] || row['Zona Kawasan'] || row['zone'] || '';
    };

    for (const row of data) {
      const area = getAreaValue(row);
      if (area <= 0) continue;
      const zona = getZoneName(row);
      const normalizedZona = normalizeZona(zona);
      if (normalizedZona.toLowerCase() === 'air' || normalizedZona === 'Unknown') continue;

      if (!result[normalizedZona]) {
        result[normalizedZona] = {
          area: 0,
          polygonCount: 0,
          percentage: 0,
          regencies: new Set()
        };
      }
      result[normalizedZona].area += area;
      result[normalizedZona].polygonCount += 1;

      const regencyCandidates = [row['kabkota'], row['KabKota'], row['Kabupaten'], row['kabupaten'], row['kabupaten_kota']];
      regencyCandidates.forEach(k => {
        if (k && k.toString().trim()) {
          result[normalizedZona].regencies.add(k.toString().trim());
        }
      });
    }

    const totalArea = Object.values(result).reduce((sum, item) => sum + item.area, 0);
    for (const key in result) {
      result[key].percentage = totalArea > 0 ? (result[key].area / totalArea) * 100 : 0;
      result[key].regencies = result[key].regencies.size;
    }

    return result;
  }
  
  /**
   * Get zone statistics by regency
   */
  getZoneByRegency() {
    const data = this.state.getSheetData('ZonaKawasan');
    const byRegency = DataUtilities.groupBy(data, 'kabkota') || DataUtilities.groupBy(data, 'KabKota') || DataUtilities.groupBy(data, 'Kabupaten');
    const result = {};
    
    for (const [kabkotaKey, items] of Object.entries(byRegency)) {
      if (!kabkotaKey) continue;
      const byZone = DataUtilities.groupBy(items, 'zona') || DataUtilities.groupBy(items, 'Zona');
      result[kabkotaKey] = {};
      
      for (const [zonaKey, zoneItems] of Object.entries(byZone)) {
        let zona = (zonaKey || 'Unknown').toString().trim();
        if (!zona) zona = 'Unknown';
        const normalizedZona = zona.toLowerCase().includes('konservasi') || zona.toLowerCase().includes('cagar') || zona.toLowerCase().includes('lindung')
          ? 'Konservasi'
          : zona.toLowerCase().includes('rehabilitasi') || zona.toLowerCase().includes('restorasi') || zona.toLowerCase().includes('pemulihan')
            ? 'Rehabilitasi'
            : zona;
        if (normalizedZona.toLowerCase() === 'air') continue;
        if (!result[kabkotaKey][normalizedZona]) {
          result[kabkotaKey][normalizedZona] = {
            area: 0,
            percentage: 0
          };
        }
        result[kabkotaKey][normalizedZona].area += DataUtilities.sum(zoneItems, 'sq_ha') || DataUtilities.sum(zoneItems, 'Area') || DataUtilities.sum(zoneItems, 'area');
      }
      
      const totalArea = Object.values(result[kabkotaKey]).reduce((sum, item) => sum + item.area, 0);
      for (const zona in result[kabkotaKey]) {
        result[kabkotaKey][zona].percentage = totalArea > 0 ? 
          (result[kabkotaKey][zona].area / totalArea) * 100 : 0;
      }
    }
    
    return result;
  }
  
  /**
   * ===== CARBON STOCK STATISTICS =====
   */
  
  /**
   * Get carbon stock statistics
   */
  getCarbonStockStatistics() {
    const carbonData = this.state.getSheetData('StokKarbonDesa');
    const source = carbonData.length > 0 ? carbonData : this.state.getSheetData('StokKarbon');
    
    const normalized = source.map(row => {
      const totalStock = parseFloat(row['Total Stock (C Ton)'] || row['total_stock_c_ton'] || row['Total_Stock_C_Ton'] || 0) || 0;
      const stockDensity = parseFloat(row['Stock (C Ton/Ha)'] || row['stock_c_tonha'] || row['Stock C Ton/Ha'] || row['Stock_C_TonHa'] || 0) || 0;
      const sqHaRaw = parseFloat(row['Luas_Ha'] || row['Area'] || row['sq_ha'] || row['SqHa'] || 0) || 0;
      const sqHa = sqHaRaw > 0 ? sqHaRaw : (stockDensity > 0 ? totalStock / stockDensity : 0);

      return {
        desa: row['desa'] || row['Desa'] || 'Unknown',
        kecamatan: row['kecamatan'] || row['Kecamatan'] || 'Unknown',
        kabkota: row['kabkota'] || row['KabKota'] || row['Kabupaten'] || 'Unknown',
        sq_ha: sqHa,
        total_stock_c_ton: totalStock,
        stock_c_tonha: stockDensity > 0 ? stockDensity : (sqHa > 0 ? totalStock / sqHa : 0)
      };
    });
    
    return {
      totalCarbonStock: DataUtilities.sum(normalized, 'total_stock_c_ton'),
      averageCarbonDensity: DataUtilities.avg(normalized, 'stock_c_tonha'),
      medianCarbonDensity: DataUtilities.median(normalized, 'stock_c_tonha'),
      minCarbonDensity: DataUtilities.min(normalized, 'stock_c_tonha'),
      maxCarbonDensity: DataUtilities.max(normalized, 'stock_c_tonha'),
      stdDevCarbonDensity: DataUtilities.stdDev(normalized, 'stock_c_tonha'),
      byVillage: this.getCarbonByVillage(normalized),
      byDistrict: this.getCarbonByDistrict(normalized),
      byRegency: this.getCarbonByRegency(normalized)
    };
  }
  
  /**
   * Get carbon stock by village
   */
  getCarbonByVillage(data) {
    const grouped = DataUtilities.groupBy(data, 'desa');
    const result = {};
    
    for (const [desa, items] of Object.entries(grouped)) {
      result[desa] = {
        totalStock: DataUtilities.sum(items, 'total_stock_c_ton'),
        averageDensity: DataUtilities.avg(items, 'stock_c_tonha'),
        area: DataUtilities.sum(items, 'sq_ha')
      };
    }
    
    return result;
  }
  
  /**
   * Get carbon stock by district
   */
  getCarbonByDistrict(data) {
    const grouped = DataUtilities.groupBy(data, 'kecamatan');
    const result = {};
    
    for (const [kecamatan, items] of Object.entries(grouped)) {
      result[kecamatan] = {
        totalStock: DataUtilities.sum(items, 'total_stock_c_ton'),
        averageDensity: DataUtilities.avg(items, 'stock_c_tonha'),
        area: DataUtilities.sum(items, 'sq_ha')
      };
    }
    
    return result;
  }
  
  /**
   * Get carbon stock by regency
   */
  getCarbonByRegency(data) {
    const grouped = DataUtilities.groupBy(data, 'kabkota');
    const result = {};
    
    for (const [kabkota, items] of Object.entries(grouped)) {
      result[kabkota] = {
        totalStock: DataUtilities.sum(items, 'total_stock_c_ton'),
        averageDensity: DataUtilities.avg(items, 'stock_c_tonha'),
        area: DataUtilities.sum(items, 'sq_ha')
      };
    }
    
    return result;
  }
  
  /**
   * ===== CHANGE ANALYSIS (MATRIX & TUTUPAN) =====
   */
  
  /**
   * Get land cover change matrix (2016 -> 2026)
   */
  getLandCoverChangeMatrix() {
    const data2016 = this.applyFiltersToData(this.state.getSheetData('2016Mangrove'));
    const data2026 = this.applyFiltersToData(this.state.getSheetData('2026Mangrove'));
    
    const changeData = this.state.getSheetData('MatrixPerubahan');
    
    // Group 2016 data by village
    const villages2016 = DataUtilities.groupBy(data2016, 'desa');
    
    const matrix = {};
    
    for (const [desa, items2016] of Object.entries(villages2016)) {
      const items2026 = DataUtilities.lookupAll(data2026, { desa });
      
      // Build class transition matrix
      if (!matrix[desa]) matrix[desa] = {};
      
      items2016.forEach(item => {
        const kelas2016 = item.kelas;
        if (!matrix[desa][kelas2016]) matrix[desa][kelas2016] = {};
        
        const match2026 = DataUtilities.lookup(items2026, { desa, sq_ha: item.sq_ha });
        if (match2026) {
          const kelas2026 = match2026.kelas;
          matrix[desa][kelas2016][kelas2026] = (matrix[desa][kelas2016][kelas2026] || 0) + item.sq_ha;
        }
      });
    }
    
    return matrix;
  }
  
  /**
   * Get land cover change summary
   */
  getLandCoverChangeSummary() {
    const data2016 = this.applyFiltersToData(this.state.getSheetData('2016Mangrove'));
    const data2026 = this.applyFiltersToData(this.state.getSheetData('2026Mangrove'));
    
    const byClass2016 = this.getClassDistribution(data2016);
    const byClass2026 = this.getClassDistribution(data2026);
    
    const result = {};
    
    for (const kelas of ['Lebat', 'Sedang', 'Jarang', 'Rusak']) {
      const area2016 = byClass2016[kelas]?.area || 0;
      const area2026 = byClass2026[kelas]?.area || 0;
      
      result[kelas] = {
        area2016,
        area2026,
        change: area2026 - area2016,
        percentChange: DataUtilities.percentageChange(area2016, area2026)
      };
    }
    
    return result;
  }
  
  /**
   * ===== UTILITY METHODS =====
   */
  
  /**
   * Get cache key based on current filter state
   */
  getCacheKey() {
    const filters = this.state.getFilters();
    return `stats_${filters.year}_${filters.provinsi}_${filters.kabkota}_${filters.kecamatan}_${filters.desa}`;
  }
  
  /**
   * Clear statistics cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatisticsCalculator;
}
