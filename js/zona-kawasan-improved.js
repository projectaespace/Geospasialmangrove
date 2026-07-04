/**
 * Zona Kawasan Improved Dashboard
 * Displays conservation and rehabilitation zones clearly
 */
function renderZonaKawasanImproved(containerId, stateManager, statsCalculator) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        // Get zona data from Excel
        const zonaData = stateManager.getSheetData('ZonaKawasan');
        const mangroveData = stateManager.getSheetData('2026Mangrove');

        console.log('🗺️ Zona Kawasan Data:', zonaData.length, 'records');
        console.log('Sample:', zonaData[0]);

        if (!zonaData || zonaData.length === 0) {
            container.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 40px;">Data ZonaKawasan tidak ditemukan.</p>';
            return;
        }

        // Aggregate zona data
        const zonaByType = {};
        const zonaByKabupaten = {};

        zonaData.forEach(row => {
            // Normalize column names using exact headers from Dashboard.xlsx
            const zona = (row['Zona'] || row['zona'] || row['zona_nama'] || 'Unknown').toString().trim();
            const area = parseFloat(row['area'] || row['sq_ha'] || row['Area'] || 0) || 0;
            const kecamatan = (row['Kecamatan'] || row['kecamatan'] || 'Unknown').toString().trim();
            const kabkota = (row['KabKota'] || row['kabkota'] || row['Kabupaten'] || 'Unknown').toString().trim();
            const provinsi = (row['Provinsi'] || row['provinsi'] || 'Sulawesi Selatan').toString().trim();

            // Categorize zona
            let zonaType = 'Lainnya';
            if (zona.toLowerCase().includes('konservasi') || zona.toLowerCase().includes('cagar') || zona.toLowerCase().includes('lindung')) {
                zonaType = 'Konservasi';
            } else if (zona.toLowerCase().includes('rehabilitasi') || zona.toLowerCase().includes('perior') || zona.toLowerCase().includes('restorasi')) {
                zonaType = 'Rehabilitasi';
            }

            // Aggregate by type
            if (!zonaByType[zonaType]) {
                zonaByType[zonaType] = {
                    total: 0,
                    polygon: 0,
                    kabupaten: new Set()
                };
            }
            zonaByType[zonaType].total += area;
            zonaByType[zonaType].polygon += 1;
            zonaByType[zonaType].kabupaten.add(kabkota);

            // Aggregate by Kabupaten
            if (!zonaByKabupaten[kabkota]) {
                zonaByKabupaten[kabkota] = {};
            }
            if (!zonaByKabupaten[kabkota][zonaType]) {
                zonaByKabupaten[kabkota][zonaType] = 0;
            }
            zonaByKabupaten[kabkota][zonaType] += area;
        });

        // Convert Set to Count
        Object.keys(zonaByType).forEach(type => {
            zonaByType[type].kabupatenCount = zonaByType[type].kabupaten.size;
        });

        // Calculate percentages
        const totalArea = Object.values(zonaByType).reduce((sum, z) => sum + z.total, 0);

        // Generate HTML
        const konservasiData = zonaByType['Konservasi'] || { total: 0, polygon: 0, kabupatenCount: 0 };
        const konservasiPercent = totalArea > 0 ? (konservasiData.total / totalArea * 100).toFixed(2) : 0;
        const rehabilitasiData = zonaByType['Rehabilitasi'] || { total: 0, polygon: 0, kabupatenCount: 0 };
        const rehabilitasiPercent = totalArea > 0 ? (rehabilitasiData.total / totalArea * 100).toFixed(2) : 0;

        let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-top: 25px;">
            <div class="zona-summary-panel">
                <div class="zona-summary-head">
                    <div class="zona-badge">🗺️</div>
                    <div>
                        <div style="font-size: 1.1rem; font-weight: 800; color: #0d3b66; margin-bottom: 4px;">Ringkasan Zona Kawasan</div>
                        <div style="font-size: 0.92rem; color: #5f6c7b;">Lihat total luas, persentase, jumlah poligon, dan kabupaten untuk konservasi & rehabilitasi.</div>
                    </div>
                </div>
                <div class="zona-summary-table-wrapper">
                    <table class="zona-summary-table">
                        <thead>
                            <tr>
                                <th>Zona</th>
                                <th>Total Luas</th>
                                <th>Persentase</th>
                                <th>Poligon</th>
                                <th>Kabupaten</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="zona-konservasi-row">
                                <td><strong>Konservasi</strong></td>
                                <td>${konservasiData.total.toLocaleString('id-ID', {maximumFractionDigits: 1})} Ha</td>
                                <td><strong>${konservasiPercent}%</strong></td>
                                <td>${konservasiData.polygon}</td>
                                <td>${konservasiData.kabupatenCount}</td>
                            </tr>
                            <tr class="zona-rehabilitasi-row">
                                <td><strong>Rehabilitasi</strong></td>
                                <td>${rehabilitasiData.total.toLocaleString('id-ID', {maximumFractionDigits: 1})} Ha</td>
                                <td><strong>${rehabilitasiPercent}%</strong></td>
                                <td>${rehabilitasiData.polygon}</td>
                                <td>${rehabilitasiData.kabupatenCount}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr; gap: 12px;">
                    <div style="padding: 16px; border-radius: 16px; background: rgba(76, 175, 80, 0.08); color: #1b5e20; font-size: 0.9rem;">
                        <strong>Konservasi:</strong> Area yang sudah dilindungi dan dikelola untuk menjaga fungsi ekosistem.
                    </div>
                    <div style="padding: 16px; border-radius: 16px; background: rgba(255, 193, 7, 0.12); color: #665c00; font-size: 0.9rem;">
                        <strong>Rehabilitasi:</strong> Area yang sedang dalam proses pemulihan kembali fungsi mangrove.
                    </div>
                </div>
            </div>
            <div style="background: white; border-radius: 20px; border: 1px solid #e8f4f1; padding: 24px; box-shadow: 0 14px 36px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; margin-bottom: 18px;">
                    <div>
                        <h3 style="color: #1a472a; margin-bottom: 8px;">📊 Perbandingan Zona</h3>
                        <div style="color:#4b6372; font-size:0.95rem; line-height:1.6;">Grafik perbandingan luas konservasi dan rehabilitasi untuk memudahkan analisis.</div>
                    </div>
                </div>
                <canvas id="zona-type-chart" height="260"></canvas>
            </div>
        </div>
        `;
        const chartSection = `
        <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr; gap: 20px;">
            <div style="background: white; border-radius: 20px; border: 1px solid #e8f4f1; padding: 24px; box-shadow: 0 14px 36px rgba(0,0,0,0.05);">
                <h4 style="margin: 0 0 16px; color: #0066ff; font-size: 1rem;">Top Kabupaten Zona</h4>
                <canvas id="zona-kabupaten-bars" height="360"></canvas>
            </div>
        </div>
        `;

        window.currentZonaByKabupaten = zonaByKabupaten;

        // Breakdown by Kabupaten
        let breakdownHtml = `
        <div style="margin-top: 35px;">
            <div class="zona-callout">
                <div style="font-size: 0.95rem; font-weight: 700; color: #0d47a1; margin-bottom: 10px;">Top Kabupaten Zona</div>
                <div class="zona-note">Total area konservasi dan rehabilitasi ditampilkan per kabupaten, dilengkapi keterangan untuk membantu pembacaan cepat setiap wilayah. Klik tombol detail untuk melihat distribusi zona per kabupaten secara lengkap.</div>
            </div>
            <h3 style="color: #1a472a; margin-bottom: 20px;">🗺️ Sebaran Zona per Kabupaten</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
        `;

        const topKabupaten = Object.entries(zonaByKabupaten)
            .sort((a, b) => ((b[1].Konservasi || 0) + (b[1].Rehabilitasi || 0)) - ((a[1].Konservasi || 0) + (a[1].Rehabilitasi || 0)))
            .slice(0, 10);

        topKabupaten.forEach(([kabupaten, zones]) => {
            const konvArea = zones['Konservasi'] || 0;
            const rehabArea = zones['Rehabilitasi'] || 0;
            const totalKabArea = konvArea + rehabArea;
            const convPercent = totalKabArea > 0 ? (konvArea / totalKabArea * 100).toFixed(1) : 0;
            const safeKab = kabupaten.replace(/'/g, "\\'");

            breakdownHtml += `
            <div style="background: linear-gradient(135deg, #f5f9f7 0%, #ffffff 100%); padding: 20px; border-radius: 12px; border: 2px solid #e8f4f1;">
                <div style="font-weight: bold; color: #1a472a; margin-bottom: 12px; font-size: 14px;">
                    📍 ${kabupaten}
                </div>
                <div style="display: grid; gap: 8px; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px; background: #d4edda; border-radius: 6px;">
                        <span>🛡️ Konservasi</span>
                        <span style="font-weight: bold;">${konvArea.toLocaleString('id-ID', {maximumFractionDigits: 1})} Ha</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px; background: #fff3cd; border-radius: 6px;">
                        <span>🌱 Rehabilitasi</span>
                        <span style="font-weight: bold;">${rehabArea.toLocaleString('id-ID', {maximumFractionDigits: 1})} Ha</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px; background: #e8f4f1; border-radius: 6px; border-left: 3px solid #4a8f5e;">
                        <span>Total</span>
                        <span style="font-weight: bold;">${totalKabArea.toLocaleString('id-ID', {maximumFractionDigits: 1})} Ha</span>
                    </div>
                    <button onclick="showZonaKabupatenDetail('${safeKab}')" style="margin-top: 12px; padding: 10px 12px; background: linear-gradient(135deg, #0066ff, #00b4d8); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 700;">
                        🔍 Lihat Detail Zona
                    </button>
                </div>
            </div>
            `;
        });

        breakdownHtml += `
            </div>
            <div id="zona-kabupaten-detail-panel" style="margin-top: 28px; background: white; padding: 24px; border-radius: 18px; border: 1px solid #e8f4f1; box-shadow: 0 8px 24px rgba(0,0,0,0.04);">
                <div style="font-size: 1rem; color: #1a472a; font-weight: 700; margin-bottom: 10px;">Pilih Kabupaten untuk melihat detail zona</div>
                <p style="color: #555; line-height: 1.75;">Klik tombol "Lihat Detail Zona" untuk melihat ringkasan konservasi dan rehabilitasi per kabupaten lengkap dengan diagram.</p>
            </div>
        `;

        container.innerHTML = html + chartSection + breakdownHtml;

        if (window.chartRenderer) {
            const typeLabels = ['Konservasi', 'Rehabilitasi'];
            const typeData = [zonaByType['Konservasi']?.total || 0, zonaByType['Rehabilitasi']?.total || 0];
            chartRenderer.createDoughnutChart('zona-type-chart', typeLabels, typeData, ['#4ecdc4', '#ffb703'], {
                cutout: '60%',
                plugins: { legend: { position: 'bottom' } }
            });

            const topLabels = topKabupaten.map(([kab]) => kab);
            const topKonv = topKabupaten.map(([_, zones]) => zones['Konservasi'] || 0);
            const topRehab = topKabupaten.map(([_, zones]) => zones['Rehabilitasi'] || 0);
            chartRenderer.createBarChart('zona-kabupaten-bars', topLabels, [
                { label: 'Konservasi', data: topKonv, backgroundColor: '#4ecdc4' },
                { label: 'Rehabilitasi', data: topRehab, backgroundColor: '#ffb703' }
            ], {
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    x: {
                        title: { display: true, text: 'Kabupaten' },
                        ticks: { autoSkip: false }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Luas (Ha)' },
                        ticks: { callback: value => value.toLocaleString('id-ID') }
                    }
                }
            });
        }

    } catch (error) {
        console.error('❌ Error rendering zona kawasan:', error);
        container.innerHTML = `<p style="color: #e74c3c; padding: 20px;">Error: ${error.message}</p>`;
    }
}

function showZonaKabupatenDetail(kabupaten) {
    const detailPanel = document.getElementById('zona-kabupaten-detail-panel');
    if (!detailPanel) {
        alert(`Detail untuk ${kabupaten} akan segera tersedia!`);
        return;
    }

    const kabStats = window.currentZonaByKabupaten ? window.currentZonaByKabupaten[kabupaten] : null;
    if (!kabStats || Object.keys(kabStats).length === 0) {
        detailPanel.innerHTML = `<div style="color: #e74c3c; padding: 20px; background: #fff2f2; border: 1px solid #f5c2c2; border-radius: 12px;">Tidak ada detail zona untuk Kabupaten ${kabupaten}.</div>`;
        return;
    }

    const zoneLabels = Object.keys(kabStats);
    const zoneAreas = zoneLabels.map(z => kabStats[z] || 0);
    const totalArea = zoneAreas.reduce((sum, value) => sum + value, 0);

    let html = `
        <div style="display: grid; gap: 24px;">
            <div style="display: flex; flex-wrap: wrap; gap: 18px; align-items: center; justify-content: space-between;">
                <div>
                    <h3 style="margin:0; font-size:1.3rem; color:#0066ff;">Detail Zona Kabupaten ${kabupaten}</h3>
                    <p style="margin:10px 0 0; color:#556;">Ringkasan zona konservasi dan rehabilitasi berdasarkan data ZonaKawasan.</p>
                </div>
                <div style="min-width: 200px; background:#f4fbff; padding:16px 18px; border-radius:18px; border:1px solid #d6eeff; text-align:right;">
                    <div style="font-size:1.4rem; font-weight:800; color:#1a472a;">${totalArea.toLocaleString('id-ID', {maximumFractionDigits: 1})} Ha</div>
                    <div style="font-size:0.85rem; color:#556;">Total area zona</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px;">
                <div style="background:#f7faff; border-radius:22px; padding:22px; border:1px solid #d6eaf8;">
                    <div style="font-size:0.95rem; font-weight:700; color:#1a472a; margin-bottom:14px;">Pembagian Zona</div>
                    <canvas id="zona-detail-chart" height="230"></canvas>
                </div>
                <div style="background:white; border-radius:22px; padding:22px; border:1px solid #e8f4f1;">
                    <div style="font-size:0.95rem; font-weight:700; color:#1a472a; margin-bottom:14px;">Rincian Zona</div>
                    <div style="display:grid; gap:12px;">
    `;

    zoneLabels.forEach(zona => {
        const area = kabStats[zona] || 0;
        const percent = totalArea > 0 ? ((area / totalArea) * 100).toFixed(1) : 0;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:#eef7ff; border-radius:14px;">
                <div>
                    <div style="font-weight:700; color:#10375c;">${zona}</div>
                    <div style="font-size:0.82rem; color:#617088;">${percent}% dari total kabupaten</div>
                </div>
                <div style="font-weight:700; color:#0066ff;">${area.toLocaleString('id-ID', {maximumFractionDigits: 1})} Ha</div>
            </div>
        `;
    });

    html += `
                    </div>
                </div>
            </div>
        </div>
    `;

    detailPanel.innerHTML = html;

    if (window.chartRenderer) {
        window.chartRenderer.createDoughnutChart('zona-detail-chart', zoneLabels, zoneAreas, ['#4ecdc4', '#ffb703', '#a8dadc', '#95e1d3'], {
            cutout: '55%',
            plugins: { legend: { position: 'bottom' } }
        });
    }
}
