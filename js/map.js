/**
 * Mangrove Dashboard Map v3 - Enhanced Analytics with Trends
 * Trend visualization, mobile responsive, improved interactivity
 */

// Global state
window.mapInstance = null;
let geojsonLayers = {
  2026: null,
  2016: null
};

let allData = {
  2026: null,
  2016: null
};

let filteredData = {
  2026: null,
  2016: null
};

let stats = {
  2026: { by_density: {}, by_district: {}, by_village: {}, by_regency: {}, total_area: 0, total_features: 0 },
  2016: { by_density: {}, by_district: {}, by_village: {}, by_regency: {}, total_area: 0, total_features: 0 }
};

let charts = {
  density2026: null,
  density2016: null,
  regencyTrend: null,
  densityTrend: null
};

let filterState = {
  year: 2026,
  regency: '',
  district: '',
  village: '',
  density: ''
};

// Color mapping for density (Air excluded from display)
const densityColors = {
  'Lebat': '#00b300',
  'Sedang': '#ffaa00',
  'Jarang': '#ff6600',
  'Rusak': '#ff3333'
};

// Density order for display (Air excluded)
const densityOrder = ['Lebat', 'Sedang', 'Jarang', 'Rusak'];

/**
 * Build a readable label for the currently selected filter set
 */
function getCurrentFilterLabel() {
  const parts = [];
  if (filterState.regency) parts.push(`Kabupaten: ${filterState.regency}`);
  if (filterState.district) parts.push(`Kecamatan: ${filterState.district}`);
  if (filterState.village) parts.push(`Desa: ${filterState.village}`);
  if (filterState.density) parts.push(`Kerapatan: ${filterState.density}`);
  return parts.length ? parts.join(' • ') : 'Semua wilayah';
}

/**
 * Initialize Map - ASYNC FUNCTION
 */
async function initMap() {
  try {
    console.log('🗺️ Initializing map...');
    
    // Create map instance
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('❌ Map container element not found!');
      return;
    }

    window.mapInstance = L.map('map', { zoomControl: false }).setView([-5.65, 119.75], 10);

    // Add base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(window.mapInstance);

    // Add zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(window.mapInstance);

    console.log('✅ Map container created');

    // Load data - wait for completion
    await loadAllData();
    
    console.log('✅ Data loading complete');
  } catch (error) {
    console.error('❌ Error initializing map:', error);
  }
}

/**
 * Load and verify data from Excel file via data loader
 * PRIORITY: Excel data (Dashboard.xlsx) > GeoJSON fallback
 */
async function loadAllData() {
  try {
    console.log('\n📊 Loading data...\n');

    // Wait for Excel data loader to be initialized (max 20 attempts = 10 seconds)
    let attempts = 0;
    const maxAttempts = 20;
    while (!window.excelDataLoader && attempts < maxAttempts) {
      console.log(`⏳ Waiting for Excel data loader... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (!window.excelDataLoader) {
      throw new Error('❌ Excel data loader not initialized after 10 seconds');
    }

    console.log('✅ Excel data loader ready');

    // Load Excel file - MAIN DATA SOURCE
    const loaded = await window.excelDataLoader.loadExcelFile('data/Dashboard.xlsx');
    
    if (!loaded) {
      throw new Error('❌ Failed to load Dashboard.xlsx - check file exists and has correct sheet names');
    }

    console.log('✅ Excel file loaded successfully');

    // Get statistics and print
    const excelStats = window.excelDataLoader.getStats();
    window.excelDataLoader.printStats();

    // Convert Excel data to GeoJSON format
    const data2026 = window.excelDataLoader.getYearData('2026');
    const data2016 = window.excelDataLoader.getYearData('2016');

    console.log(`\n📍 Converting Excel data to GeoJSON format...`);
    allData[2026] = convertExcelToGeoJSON(data2026, 2026);
    allData[2016] = convertExcelToGeoJSON(data2016, 2016);

    console.log(`✅ 2026: ${allData[2026].features.length} features`);
    console.log(`✅ 2016: ${allData[2016].features.length} features\n`);

    // Analyze data
    console.log('📊 Analyzing 2026 data...');
    analyzeData(2026);
    console.log('📊 Analyzing 2016 data...');
    analyzeData(2016);

    // Update UI
    console.log('\n🎨 Updating UI...');
    updateOverview();
    setupEventListeners();
    updateMapLayers(2026);
    updateFilteredCharts(2026); // Initialize charts

    console.log('✅ Data loading complete!\n');

  } catch (error) {
    console.error('❌ CRITICAL ERROR - Excel data loading failed:', error.message);
    console.error('   Full error:', error);
    console.error('\n📋 TROUBLESHOOTING CHECKLIST:');
    console.error('   ✓ File exists: data/Dashboard.xlsx');
    console.error('   ✓ Sheet names: "2016Mangrove", "2026Mangrove"');
    console.error('   ✓ Columns present: Ket (or kelas_ndvi), sq_ha (or sq_km, luas, area)');
    console.error('   ✓ Server running (not file:// protocol)');
    console.error('   ✓ XLSX library loaded (check Network tab)');
    
    // Show error in UI if possible
    const overviewContainer = document.getElementById('overviewContainer');
    if (overviewContainer) {
      overviewContainer.innerHTML = `
        <div style="background: #fee; border: 1px solid #f00; border-radius: 8px; padding: 16px; color: #c00;">
          <strong>❌ Gagal memuat data dari Excel</strong>
          <p>File: <code>data/Dashboard.xlsx</code></p>
          <p>Pesan: ${error.message}</p>
          <p style="font-size: 0.9em; margin-top: 10px;">Periksa browser console untuk detail lengkap</p>
        </div>
      `;
    }
    
    throw error; // Re-throw instead of silent fallback
  }
}

/**
 * Fallback: Load data from GeoJSON files
 */
function loadDataFromGeoJSON() {
  const isFileProtocol = window.location.protocol === 'file:';
  
  if (isFileProtocol) {
    console.warn('⚠️ File protocol detected - CORS restrictions prevent data loading');
    console.log('💡 To enable full functionality, please serve files through HTTP:');
    console.log('   Option 1: Use Node.js with simple-server.js');
    console.log('   Option 2: Use Python: python -m http.server 8000');
    console.log('   Option 3: Use Live Server VS Code extension\n');
  }

  console.log('📌 Loading from GeoJSON files (fallback)...');
  Promise.all([
    fetch('data/2026Mang.geojson').then(r => r.json()),
    fetch('data/2016Mang.geojson').then(r => r.json())
  ]).then(([data2026, data2016]) => {
    allData[2026] = data2026;
    allData[2016] = data2016;

    console.log('✅ GeoJSON files loaded successfully');
    console.log('=== 2026 Data Analysis ===');
    analyzeData(2026);
    console.log('=== 2016 Data Analysis ===');
    analyzeData(2016);

    updateOverview();
    setupEventListeners();
    updateMapLayers(2026);
    updateFilteredCharts(2026); // Initialize charts
  }).catch(err => {
    console.error('❌ Error loading GeoJSON data:', err);
    if (isFileProtocol) {
      console.error('❌ This is likely due to file:// protocol CORS restrictions');
    }
  });
}

/**
 * Convert Excel data format to GeoJSON format
 */
function convertExcelToGeoJSON(excelData, year) {
  if (!excelData || excelData.length === 0) {
    console.warn(`⚠️ No data for year ${year}`);
    return { type: 'FeatureCollection', features: [] };
  }

  const features = excelData.map((record, idx) => {
    // Get area value (in hectares)
    const sq_ha = parseFloat(record.sq_ha) || 0;
    const sq_km = parseFloat(record.sq_km) || 0;
    const area = sq_ha > 0 ? sq_ha : (sq_km > 0 ? sq_km * 100 : 0);

    return {
      type: 'Feature',
      properties: {
        id: `${year}_${idx}`,
        Ket: record.kelas_ndvi || 'Unknown',                    // Density class (used in map.js)
        sq_ha: area,                                             // Area in hectares (used in map.js)
        sq_km: area / 100,                                       // Area in sq km
        WADMKD: record.desa || 'Unknown',                        // Village (used in map.js)
        WADMKC: record.kecamatan || 'Unknown',                   // District (used in map.js)
        WADMKK: record.kabkota || 'Unknown',                     // Regency (used in map.js)
        provinsi: record.provinsi || 'Sulawesi Selatan',         // Province
        year: year
      },
      geometry: {
        type: 'Point',
        coordinates: [119.75, -5.65] // Default center of Maminasata (Barru regency)
      }
    };
  });

  console.log(`✅ Converted ${features.length} records to GeoJSON for year ${year}`);
  return {
    type: 'FeatureCollection',
    features: features
  };
}

/**
 * Analyze data with strict verification
 */
function analyzeData(year) {
  const data = allData[year];
  if (!data || !data.features) {
    console.error(`❌ No data available for year ${year}`);
    return;
  }

  const features = data.features;
  console.log(`📊 Analyzing ${features.length} features for year ${year}`);

  const analysis = {
    by_density: {},
    by_district: {},
    by_village: {},
    by_regency: {},
    total_area: 0,
    total_features: features.length,
    data_issues: []
  };

  features.forEach((feature, idx) => {
    const props = feature.properties;

    // Get area value
    let area = 0;
    if (props.sq_ha !== undefined && props.sq_ha !== null && props.sq_ha > 0) {
      area = parseFloat(props.sq_ha);
    } else if (props.sq_km !== undefined && props.sq_km !== null && props.sq_km > 0) {
      area = parseFloat(props.sq_km) * 100;
    }

    // Validate area
    if (area < 0 || !isFinite(area)) {
      analysis.data_issues.push({
        feature_idx: idx,
        issue: 'Invalid area value',
        sq_ha: props.sq_ha,
        sq_km: props.sq_km
      });
      area = 0;
    }

    // Get normalized values
    const density = (props.Ket || 'Tidak Diketahui').trim();
    const district = (props.WADMKC || 'Tidak Diketahui').trim();
    const village = (props.WADMKD || 'Tidak Diketahui').trim();
    const regency = (props.WADMKK || 'Tidak Diketahui').trim();

    // Add to total area
    analysis.total_area += area;

    // By NDVI Density
    if (!analysis.by_density[density]) {
      analysis.by_density[density] = { area: 0, count: 0, features: [] };
    }
    analysis.by_density[density].area += area;
    analysis.by_density[density].count += 1;
    analysis.by_density[density].features.push(idx);

    // By District
    if (!analysis.by_district[district]) {
      analysis.by_district[district] = { area: 0, count: 0, regency: regency };
    }
    analysis.by_district[district].area += area;
    analysis.by_district[district].count += 1;

    // By Village
    if (!analysis.by_village[village]) {
      analysis.by_village[village] = { area: 0, count: 0, district: district, regency: regency };
    }
    analysis.by_village[village].area += area;
    analysis.by_village[village].count += 1;

    // By Regency (MOST IMPORTANT FOR FILTERS)
    if (!analysis.by_regency[regency]) {
      analysis.by_regency[regency] = { area: 0, count: 0, by_density: {}, by_district: {} };
    }
    analysis.by_regency[regency].area += area;
    analysis.by_regency[regency].count += 1;

    // By Density per Regency
    if (!analysis.by_regency[regency].by_density[density]) {
      analysis.by_regency[regency].by_density[density] = 0;
    }
    analysis.by_regency[regency].by_density[density] += area;

    // By District per Regency
    if (!analysis.by_regency[regency].by_district[district]) {
      analysis.by_regency[regency].by_district[district] = 0;
    }
    analysis.by_regency[regency].by_district[district] += area;
  });

  // Store stats
  stats[year] = analysis;

  // Log analysis results
  console.log(`\n✅ Analysis complete for year ${year}:`);
  console.log(`   Total Features: ${analysis.total_features}`);
  console.log(`   Total Area: ${analysis.total_area.toFixed(2)} Sq_ha`);
  console.log(`   Density classes: ${Object.keys(analysis.by_density).length}`);
  console.log(`   Districts: ${Object.keys(analysis.by_district).length}`);
  console.log(`   Regencies: ${Object.keys(analysis.by_regency).length}`);
  console.log(`   Data issues: ${analysis.data_issues.length}`);

  // Log sample regencies
  const sampleRegencies = Object.keys(analysis.by_regency).slice(0, 3);
  sampleRegencies.forEach(regency => {
    console.log(`   📍 ${regency}: ${analysis.by_regency[regency].count} area, ${analysis.by_regency[regency].area.toFixed(2)} ha`);
  });

  // Update filter dropdowns
  updateFiltersFromData(year);
}

/**
 * Update filter dropdowns from data
 */
function updateFiltersFromData(year) {
  if (year !== filterState.year) {
    console.log(`⏭️ Skipping updateFiltersFromData for year ${year} (current: ${filterState.year})`);
    return;
  }

  const stats_data = stats[year];
  if (!stats_data) {
    console.error(`❌ No stats data for year ${year}`);
    return;
  }

  console.log(`🎯 Updating filter dropdowns for year ${year}`);
  console.log(`   Regencies available: ${Object.keys(stats_data.by_regency).length}`);

  const regencyFilter = document.getElementById('regencyFilter');
  if (!regencyFilter) {
    console.error('❌ regencyFilter element not found!');
    return;
  }

  // Clear existing options (except first default one)
  while (regencyFilter.options.length > 1) {
    regencyFilter.remove(1);
  }

  // Add regency options
  const regencies = Object.keys(stats_data.by_regency).sort();
  console.log(`   Adding ${regencies.length} regencies to dropdown`);
  
  regencies.forEach(regency => {
    const option = document.createElement('option');
    option.value = regency;
    option.text = `${regency} (${stats_data.by_regency[regency].count} area)`;
    regencyFilter.appendChild(option);
  });

  console.log(`✅ Filter dropdown updated with ${regencies.length} kabupaten`);
}

/**
 * Handle regency filter change - smart cascading
 */
function onRegencyChange() {
  filterState.regency = document.getElementById('regencyFilter').value;
  filterState.district = '';
  filterState.village = '';

  updateDistrictFilter();
  updateVillageFilter();
  applyFilters();
}

/**
 * Update district filter based on selected regency
 */
function updateDistrictFilter() {
  const year = filterState.year;
  const stats_data = stats[year];
  const regency = filterState.regency;

  const districtFilter = document.getElementById('districtFilter');
  districtFilter.innerHTML = '<option value="">Semua Kecamatan</option>';

  if (!regency) {
    const districts = Object.keys(stats_data.by_district).sort();
    districts.forEach(district => {
      const option = document.createElement('option');
      option.value = district;
      option.text = district;
      districtFilter.appendChild(option);
    });
  } else {
    const districts = Object.keys(stats_data.by_district).filter(d => {
      return stats_data.by_district[d].regency === regency;
    }).sort();
    districts.forEach(district => {
      const option = document.createElement('option');
      option.value = district;
      option.text = district;
      districtFilter.appendChild(option);
    });
  }
}

/**
 * Handle district filter change
 */
function onDistrictChange() {
  filterState.district = document.getElementById('districtFilter').value;
  filterState.village = '';

  updateVillageFilter();
  applyFilters();
}

/**
 * Update village filter based on selected district
 */
function updateVillageFilter() {
  const year = filterState.year;
  const stats_data = stats[year];
  const regency = filterState.regency;
  const district = filterState.district;

  const villageFilter = document.getElementById('villageFilter');
  villageFilter.innerHTML = '<option value="">Semua Desa/Kelurahan</option>';

  let villages = Object.keys(stats_data.by_village);

  if (regency) {
    villages = villages.filter(v => stats_data.by_village[v].regency === regency);
  }

  if (district) {
    villages = villages.filter(v => stats_data.by_village[v].district === district);
  }

  villages.sort().forEach(village => {
    const option = document.createElement('option');
    option.value = village;
    option.text = village;
    villageFilter.appendChild(option);
  });
}

/**
 * Handle village filter change
 */
function onVillageChange() {
  filterState.village = document.getElementById('villageFilter').value;
  applyFilters();
}

/**
 * Handle density filter change
 */
function onDensityChange() {
  filterState.density = document.getElementById('densityFilter').value;
  applyFilters();
}

/**
 * Apply all filters and update display
 */
function applyFilters() {
  const year = filterState.year;
  const data = allData[year];
  if (!data || !data.features) return;

  const regency = filterState.regency;
  const district = filterState.district;
  const village = filterState.village;
  const density = filterState.density;

  const filtered = {
    ...data,
    features: data.features.filter(feature => {
      const props = feature.properties;
      if (regency && props.WADMKK !== regency) return false;
      if (district && props.WADMKC !== district) return false;
      if (village && props.WADMKD !== village) return false;
      if (density && props.Ket !== density) return false;
      return true;
    })
  };

  filteredData[year] = filtered;

  updateFilteredStats(year, filtered);
  updateMapLayers(year);
  updateFilteredCharts(year);
}

/**
 * Calculate statistics for filtered data
 */
function updateFilteredStats(year, filtered) {
  const stats_filtered = {
    by_density: {},
    total_area: 0,
    total_features: filtered.features.length
  };

  filtered.features.forEach(feature => {
    const props = feature.properties;
    let area = parseFloat(props.sq_ha || props.sq_km * 100 || 0);
    const density = (props.Ket || 'Tidak Diketahui').trim();

    if (!stats_filtered.by_density[density]) {
      stats_filtered.by_density[density] = { area: 0, count: 0 };
    }
    stats_filtered.by_density[density].area += area;
    stats_filtered.by_density[density].count += 1;
    stats_filtered.total_area += area;
  });

  updateStatsDisplay(year, stats_filtered);
}

/**
 * Update statistics display in header
 */
function updateStatsDisplay(year, stats_filtered) {
  const regionLabel = getCurrentFilterLabel();
  const statsHtml = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
      <div class="stat-box-small">
        <div class="stat-label">Total Luas</div>
        <div class="stat-value">${stats_filtered.total_area.toFixed(2)}</div>
        <div class="stat-unit">Sq_ha</div>
      </div>
      <div class="stat-box-small">
        <div class="stat-label">Wilayah Statistik</div>
        <div class="stat-value" style="font-size:0.9rem; font-weight:600;">${regionLabel}</div>
        <div class="stat-unit">Filter Terapan</div>
      </div>
    </div>
  `;

  const container = document.getElementById('filteredStatsContainer');
  if (container) {
    container.innerHTML = statsHtml;
  }

  const densityStatsHtml = Object.entries(stats_filtered.by_density)
    .sort((a, b) => densityOrder.indexOf(a[0]) - densityOrder.indexOf(b[0]))
    .map(([density, data]) => {
      const percentage = stats_filtered.total_area > 0 
        ? ((data.area / stats_filtered.total_area) * 100).toFixed(1) 
        : '0.0';
      return `
        <div class="density-stat-row">
          <div class="density-label" style="border-left: 4px solid ${densityColors[density] || '#999'};">
            <span>${density}</span>
          </div>
          <div class="density-info">
            <div>${data.area.toFixed(2)} Sq_ha (${percentage}%)</div>
            <div class="density-count">${data.count} area</div>
          </div>
        </div>
      `;
    }).join('');

  const densityContainer = document.getElementById('densityStatsContainer');
  if (densityContainer) {
    densityContainer.innerHTML = densityStatsHtml;
  }
}

/**
 * Update map layers
 */
function updateMapLayers(year) {
  if (geojsonLayers[2026]) {
    try {
      window.mapInstance.removeLayer(geojsonLayers[2026]);
    } catch (e) {}
    geojsonLayers[2026] = null;
  }
  if (geojsonLayers[2016]) {
    try {
      window.mapInstance.removeLayer(geojsonLayers[2016]);
    } catch (e) {}
    geojsonLayers[2016] = null;
  }

  const data = filteredData[year] || allData[year];
  if (data && data.features.length > 0) {
    const layer = createLayer(data);
    if (layer) {
      geojsonLayers[year] = layer;
      geojsonLayers[year].addTo(window.mapInstance);
    }
  }
}

/**
 * Create GeoJSON layer
 */
function createLayer(data) {
  return L.geoJSON(data, {
    pointToLayer: function(feature, latlng) {
      const density = feature.properties.Ket;
      return L.circleMarker(latlng, {
        radius: 8,
        fillColor: densityColors[density] || '#999999',
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.8,
        fillOpacity: 0.85
      });
    },
    style: function(feature) {
      const density = feature.properties.Ket;
      return {
        color: densityColors[density] || '#999999',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.65
      };
    },
    onEachFeature: function(feature, layer) {
      const props = feature.properties;
      const area = (props.sq_ha || (props.sq_km ? props.sq_km * 100 : 0)).toFixed(2);
      const popup = `
        <div style="font-size: 12px; color: white; font-family: Poppins, sans-serif; font-weight: 500;">
          <b style="color: #4fc3f7; display: block; margin-bottom: 6px;">📍 Data Mangrove</b>
          <div style="line-height: 1.5;">
            <b>Desa:</b> ${props.WADMKD || props.desa || 'N/A'}<br>
            <b>Kecamatan:</b> ${props.WADMKC || props.kecamatan || 'N/A'}<br>
            <b>Kabupaten:</b> ${props.WADMKK || props.kabkota || 'N/A'}<br>
            <b>Kerapatan:</b> <span style="color: ${densityColors[props.Ket] || '#999'}">${props.Ket || props.kelas_ndvi || 'Unknown'}</span><br>
            <b>Luas:</b> <span style="color: #c8e6c9;">${area} Sq_ha</span>
          </div>
        </div>
      `;
      layer.bindPopup(popup, { className: 'mangrove-popup', maxWidth: 250 });
    }
  });
}

/**
 * Update filtered charts
 */
function updateFilteredCharts(year) {
  updateDensityBreakdownChart(year);
  updateRegencyTrendChart(year);
  updateDensityTrendChart(year);
}

/**
 * Update density breakdown chart - IMPROVED
 */
function updateDensityBreakdownChart(year) {
  const filtered = filteredData[year] || allData[year];
  const stats_filtered = {};

  filtered.features.forEach(feature => {
    const props = feature.properties;
    const area = parseFloat(props.sq_ha || (props.sq_km ? props.sq_km * 100 : 0) || 0);
    const density = (props.Ket || 'Tidak Diketahui').trim();

    if (!stats_filtered[density]) {
      stats_filtered[density] = 0;
    }
    stats_filtered[density] += area;
  });

  const ctx = document.getElementById('densityBreakdownChart');
  if (!ctx) return;

  if (charts.density2026) {
    try { charts.density2026.destroy(); } catch (e) {}
    charts.density2026 = null;
  }

  const densities = densityOrder.filter(d => stats_filtered[d] > 0);
  const areas = densities.map(d => stats_filtered[d]);
  const colors = densities.map(d => densityColors[d]);
  const maxArea = Math.max(...areas, 1);
  const fixedMax = Math.ceil(maxArea / 50) * 50;
  const regionLabel = getCurrentFilterLabel();

  charts.density2026 = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: densities,
      datasets: [{
        label: 'Luas (Sq_ha)',
        data: areas,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.7,
        categoryPercentage: 0.65
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Diagram Batang Kerapatan - ${regionLabel}`,
          color: '#333',
          font: { family: 'Poppins', size: 13, weight: '700' },
          padding: { top: 10, bottom: 8 }
        },
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 10,
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 11 },
          callbacks: {
            label: function(context) {
              return `Luas: ${context.parsed.y.toFixed(2)} Sq_ha`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: fixedMax,
          ticks: {
            font: { size: 10, family: 'Poppins' },
            color: '#666',
            stepSize: Math.ceil(fixedMax / 5)
          },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        x: {
          ticks: {
            font: { size: 11, family: 'Poppins', weight: '600' },
            color: '#333'
          },
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * Create regency trend chart - NEW
 */
function updateRegencyTrendChart(year) {
  const year_stats = stats[year].by_regency;
  const regencies = Object.keys(year_stats).sort((a, b) => year_stats[b].area - year_stats[a].area).slice(0, 10);
  const areas = regencies.map(r => year_stats[r].area);
  const maxArea = Math.max(...areas);
  const fixedMax = Math.ceil(maxArea / 1000) * 1000; // Round up to nearest 1000

  const ctx = document.getElementById('regencyTrendChart');
  if (!ctx) return;

  if (charts.regencyTrend) {
    try { charts.regencyTrend.destroy(); } catch (e) {}
    charts.regencyTrend = null;
  }

  charts.regencyTrend = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: regencies,
      datasets: [{
        label: 'Luas (Sq_ha)',
        data: areas,
        backgroundColor: 'rgba(46, 125, 50, 0.8)',
        borderColor: 'rgba(46, 125, 50, 1)',
        borderWidth: 2,
        borderRadius: 6,
        hoverBackgroundColor: 'rgba(0, 180, 216, 1)',
        hoverBorderColor: 'rgba(0, 180, 216, 1)'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { font: { size: 11, family: 'Poppins' }, color: '#666' }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 10,
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 11 },
          callbacks: {
            label: function(context) {
              return ' Luas: ' + context.parsed.x.toFixed(2) + ' Sq_ha';
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: fixedMax,
          ticks: { 
            font: { size: 10 }, 
            color: '#666',
            stepSize: Math.ceil(fixedMax / 5) // Dynamic step size for clean intervals
          },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        y: {
          ticks: { font: { size: 10, family: 'Poppins', weight: '600' }, color: '#333' },
          grid: { display: false }
        }
      }
    }
  });
}

/**
 * Create density trend chart by regency - NEW
 */
function updateDensityTrendChart(year) {
  const year_stats = stats[year].by_regency;
  const regencies = Object.keys(year_stats).sort();

  const densityTrendData = {};
  let maxValue = 0;
  densityOrder.forEach(d => densityTrendData[d] = []);

  regencies.forEach(r => {
    densityOrder.forEach(d => {
      const value = year_stats[r].by_density[d] || 0;
      densityTrendData[d].push(value);
      maxValue = Math.max(maxValue, value);
    });
  });

  const ctx = document.getElementById('densityTrendChart');
  if (!ctx) return;

  if (charts.densityTrend) {
    try { charts.densityTrend.destroy(); } catch (e) {}
    charts.densityTrend = null;
  }

  // Calculate fixed max scale for y-axis (round up to nearest 500)
  const fixedYMax = Math.ceil(maxValue / 500) * 500 || 1000;
  const stepSize = Math.ceil(fixedYMax / 5); // Divide into 5 equal segments

  const datasets = densityOrder.map(density => ({
    label: density,
    data: densityTrendData[density],
    borderColor: densityColors[density],
    backgroundColor: densityColors[density] + '15',
    borderWidth: 2.5,
    tension: 0.3,
    fill: true,
    pointRadius: 3,
    pointHoverRadius: 5,
    pointBackgroundColor: densityColors[density],
    pointBorderColor: 'white',
    pointBorderWidth: 1.5
  }));

  charts.densityTrend = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: regencies,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { font: { size: 11, family: 'Poppins' }, color: '#666', usePointStyle: true, padding: 12 }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          padding: 12,
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 11 },
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' ha';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: fixedYMax,
          ticks: { 
            font: { size: 10 }, 
            color: '#666',
            stepSize: stepSize // Fixed step size for clean intervals
          },
          grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: true }
        },
        x: {
          ticks: { font: { size: 9, family: 'Poppins' }, color: '#666', maxRotation: 45, minRotation: 0 },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        }
      }
    }
  });
}

/**
 * Update overview with trend visualization
 */
function updateOverview() {
  const regencies2026 = Object.keys(stats[2026].by_regency).sort((a, b) => 
    stats[2026].by_regency[b].area - stats[2026].by_regency[a].area
  );
  
  const regencies2016 = Object.keys(stats[2016].by_regency).sort((a, b) => 
    stats[2016].by_regency[b].area - stats[2016].by_regency[a].area
  );

  let trendHtml = `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #0066ff; font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; text-transform: uppercase;">
        📊 Trend Kerapatan Mangrove
      </h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
  `;

  densityOrder.forEach(density => {
    const area2026 = stats[2026].by_density[density]?.area || 0;
    const area2016 = stats[2016].by_density[density]?.area || 0;
    const change = ((area2026 - area2016) / Math.max(area2016, 1) * 100);
    const arrow = change >= 0 ? '📈' : '📉';
    const color = change >= 0 ? '#ff6b6b' : '#51cf66';

    trendHtml += `
      <div style="background: linear-gradient(135deg, ${densityColors[density]}20 0%, ${densityColors[density]}05 100%); 
                   border: 1px solid ${densityColors[density]}; border-radius: 10px; padding: 10px; cursor: pointer;
                   transition: all 0.3s; hover { transform: translateY(-2px); box-shadow: 0 4px 12px ${densityColors[density]}40; }">
        <div style="color: ${densityColors[density]}; font-weight: 700; font-size: 0.9rem; margin-bottom: 6px;">${density}</div>
        <div style="font-size: 0.8rem; color: #666;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>2026:</span>
            <b>${area2026.toFixed(0)}</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>2016:</span>
            <b>${area2016.toFixed(0)}</b>
          </div>
          <div style="color: ${color}; font-weight: 700; margin-top: 6px;">${arrow} ${Math.abs(change).toFixed(1)}%</div>
        </div>
      </div>
    `;
  });

  trendHtml += `
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #0066ff; font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; text-transform: uppercase;">
        🏛️ Top Kabupaten Tahun 2026
      </h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
  `;

  regencies2026.slice(0, 5).forEach((reg, idx) => {
    const area = stats[2026].by_regency[reg].area;
    const percentage = (area / stats[2026].total_area * 100);
    trendHtml += `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="font-weight: 700; color: #2e7d32; min-width: 20px;">${idx + 1}.</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #333; margin-bottom: 2px;">${reg}</div>
          <div style="background: rgba(46, 125, 50, 0.1); height: 6px; border-radius: 3px; overflow: hidden;">
            <div style="background: #2e7d32; height: 100%; width: ${percentage}%; border-radius: 3px;"></div>
          </div>
        </div>
        <div style="font-weight: 700; color: #2e7d32; min-width: 40px; text-align: right;">${area.toFixed(0)} ha</div>
      </div>
    `;
  });

  trendHtml += `
      </div>
    </div>

    <div style="background: linear-gradient(135deg, rgba(46, 125, 50, 0.05) 0%, rgba(102, 187, 106, 0.05) 100%);
                border: 1px solid rgba(46, 125, 50, 0.1); border-radius: 10px; padding: 12px;">
      <h3 style="color: #2e7d32; font-size: 0.9rem; font-weight: 700; margin-bottom: 8px;">📈 Statistik Umum</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem;">
        <div>
          <div style="color: #666; margin-bottom: 2px;">2026 Total</div>
          <div style="font-weight: 700; color: #2e7d32; font-size: 1.1rem;">${stats[2026].total_area.toFixed(0)}</div>
          <div style="color: #999; font-size: 0.75rem;">Sq_ha</div>
        </div>
        <div>
          <div style="color: #666; margin-bottom: 2px;">2016 Total</div>
          <div style="font-weight: 700; color: #2e7d32; font-size: 1.1rem;">${stats[2016].total_area.toFixed(0)}</div>
          <div style="color: #999; font-size: 0.75rem;">Sq_ha</div>
        </div>
      </div>
    </div>
  `;

  const overviewContainer = document.getElementById('overviewContainer');
  if (overviewContainer) {
    overviewContainer.innerHTML = trendHtml;
  }
}

/**
 * Switch year and update everything
 */
function switchYear(year) {
  filterState.year = year;
  filterState.regency = '';
  filterState.district = '';
  filterState.village = '';
  filterState.density = '';

  document.getElementById('regencyFilter').value = '';
  document.getElementById('districtFilter').innerHTML = '<option value="">Semua Kecamatan</option>';
  document.getElementById('villageFilter').innerHTML = '<option value="">Semua Desa/Kelurahan</option>';
  document.getElementById('densityFilter').value = '';

  updateFiltersFromData(year);
  updateDistrictFilter();
  updateVillageFilter();
  applyFilters();

  document.querySelectorAll('.year-btn').forEach(btn => {
    if (parseInt(btn.dataset.year) === year) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      switchYear(parseInt(this.dataset.year));
    });
  });

  const regencyFilter = document.getElementById('regencyFilter');
  const districtFilter = document.getElementById('districtFilter');
  const villageFilter = document.getElementById('villageFilter');
  const densityFilter = document.getElementById('densityFilter');

  if (regencyFilter) regencyFilter.addEventListener('change', onRegencyChange);
  if (districtFilter) districtFilter.addEventListener('change', onDistrictChange);
  if (villageFilter) villageFilter.addEventListener('change', onVillageChange);
  if (densityFilter) densityFilter.addEventListener('change', onDensityChange);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 DOM ready, starting initialization...\n');
  
  // Check if initExcelDataLoader function exists
  if (typeof initExcelDataLoader !== 'function') {
    console.error('❌ CRITICAL: initExcelDataLoader function not found!');
    console.error('   Make sure excel-data-loader.js is loaded before map.js');
    alert('❌ Sistem gagal: Excel data loader tidak tersedia. Periksa console untuk detail.');
    return;
  } else {
    // Try to initialize Excel data loader
    try {
      console.log('⚙️ Initializing Excel data loader...');
      const loaderReady = await initExcelDataLoader();
      if (!loaderReady) {
        throw new Error('Excel data loader initialization returned false');
      }
    } catch (error) {
      console.error('❌ Error initializing Excel data loader:', error);
      alert('❌ Gagal memuat Excel loader: ' + error.message);
      return;
    }
  }
  
  // Initialize map (waits for data loading to complete)
  try {
    await initMap();
  } catch (error) {
    console.error('❌ Error initializing map:', error);
    alert('❌ Gagal menginisialisasi peta: ' + error.message);
  }
});
