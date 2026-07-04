/**
 * Stok Karbon Improved Dashboard
 * Displays carbon stock from StokKarbonDesa sheet with detailed metrics
 */
function renderStokKarbonImproved(containerId, stateManager, statsCalculator) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        // Get stok karbon data from Excel
        const karbonData = stateManager.getSheetData('StokKarbonDesa');

        console.log('🌱 Stok Karbon Desa Data:', karbonData.length, 'records');
        console.log('Sample:', karbonData[0]);

        if (!karbonData || karbonData.length === 0) {
            container.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 40px;">Data StokKarbonDesa tidak ditemukan.</p>';
            return;
        }

        // Process carbon data
        const processedData = karbonData.map(row => {
            // Normalize column names using exact headers from Dashboard.xlsx
            const desa = (row['Desa'] || row['desa'] || row['Desa/Nama Desa'] || 'Unknown').toString().trim();
            const kecamatan = (row['Kecamatan'] || row['kecamatan'] || row['Kecamatan/Desa'] || 'Unknown').toString().trim();
            const kabkota = (row['KabKota'] || row['Kabupaten'] || row['KabupatenKota'] || row['kabkota'] || 'Unknown').toString().trim();
            const provinsi = (row['Provinsi'] || row['provinsi'] || 'Sulawesi Selatan').toString().trim();
            const sqHaRaw = parseFloat(row['Luas_Ha'] || row['Area'] || row['sq_ha'] || row['SqHa'] || 0) || 0;
            
            // Carbon stock metrics
            const totalStock = parseFloat(row['Total Stock (C Ton)'] || row['total_stock_c_ton'] || row['Total_Stock_C_Ton'] || row['Total Stock C Ton'] || 0) || 0;
            const stockDensity = parseFloat(row['Stock (C Ton/Ha)'] || row['stock_c_tonha'] || row['Stock C Ton/Ha'] || row['Stock_C_TonHa'] || row['Densitas'] || 0) || 0;

            // Calculate derived metrics
            const sqHa = sqHaRaw > 0 ? sqHaRaw : (stockDensity > 0 ? totalStock / stockDensity : 0);
            const stockPerHa = stockDensity > 0 ? stockDensity : (sqHa > 0 ? totalStock / sqHa : 0);

            return {
                desa: desa,
                kecamatan: kecamatan,
                kabkota: kabkota,
                provinsi: provinsi,
                sqHa: sqHa,
                totalStock: totalStock,
                stockDensity: stockDensity > 0 ? stockDensity : stockPerHa,
                stockPerHa: stockPerHa
            };
        }).filter(d => d.desa !== 'Unknown');

        // Aggregate by Kabupaten
        const byKabupaten = {};
        const byKecamatan = {};

        processedData.forEach(data => {
            // By Kabupaten
            if (!byKabupaten[data.kabkota]) {
                byKabupaten[data.kabkota] = {
                    totalStock: 0,
                    totalArea: 0,
                    desa: 0
                };
            }
            byKabupaten[data.kabkota].totalStock += data.totalStock;
            byKabupaten[data.kabkota].totalArea += data.sqHa;
            byKabupaten[data.kabkota].desa += 1;

            // By Kecamatan
            const kecKey = `${data.kabkota} - ${data.kecamatan}`;
            if (!byKecamatan[kecKey]) {
                byKecamatan[kecKey] = {
                    totalStock: 0,
                    totalArea: 0,
                    desa: 0
                };
            }
            byKecamatan[kecKey].totalStock += data.totalStock;
            byKecamatan[kecKey].totalArea += data.sqHa;
            byKecamatan[kecKey].desa += 1;
        });

        // Calculate statistics
        const totalStockAll = processedData.reduce((sum, d) => sum + d.totalStock, 0);
        const totalAreaAll = processedData.reduce((sum, d) => sum + d.sqHa, 0);
        const avgStockDensity = totalAreaAll > 0 ? (totalStockAll / totalAreaAll) : 0;
        const medianStock = processedData.length > 0 ? 
            processedData.sort((a, b) => a.totalStock - b.totalStock)[Math.floor(processedData.length / 2)].totalStock : 0;

        // Generate HTML
        let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 25px;" class="karbon-kpi">
            <div class="kpi-card">
                <div class="kpi-icon">💰</div>
                <div class="kpi-label">Total Stok Karbon</div>
                <div class="kpi-value">${Math.round(totalStockAll).toLocaleString('id-ID')}</div>
                <div style="font-size: 11px; color: #999; margin-top: 5px;">Ton Karbon</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon">📊</div>
                <div class="kpi-label">Rata-rata Densitas</div>
                <div class="kpi-value">${avgStockDensity.toFixed(2)}</div>
                <div style="font-size: 11px; color: #999; margin-top: 5px;">Ton/Hektar</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon">📈</div>
                <div class="kpi-label">Median Stock</div>
                <div class="kpi-value karbon-metric">${Math.round(medianStock).toLocaleString('id-ID')}</div>
                <div style="font-size: 11px; color: #999; margin-top: 5px;">Ton Karbon</div>
            </div>
        </div>
        `;

        // Top kabupaten by total carbon stock and average density
        const topKabupaten = Object.entries(byKabupaten)
            .sort((a, b) => b[1].totalStock - a[1].totalStock)
            .slice(0, 6);

        const topKabupatenCards = topKabupaten.slice(0, 4).map(([kabupaten, data]) => {
            const avgDensity = data.totalArea > 0 ? (data.totalStock / data.totalArea).toFixed(2) : 0;
            return `
                <div class="karbon-summary-card">
                    <h4>${kabupaten}</h4>
                    <p><strong>${Math.round(data.totalStock).toLocaleString('id-ID')} Ton</strong> total stok karbon</p>
                    <p><strong>${data.totalArea.toLocaleString('id-ID', {maximumFractionDigits: 1})} Ha</strong> area terukur</p>
                    <p><strong>${avgDensity} Ton/Ha</strong> densitas rata-rata</p>
                </div>
            `;
        }).join('');

        html += `
        <div style="margin-top: 30px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
            <div style="background: white; border-radius: 20px; border: 1px solid #e8f4f1; padding: 22px; box-shadow: 0 14px 34px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; margin-bottom: 18px;">
                    <div>
                        <h3 style="color: #1a472a; margin-bottom: 8px;">📊 Top Kabupaten by Total Stok Karbon</h3>
                        <div style="color:#4b6372; font-size:0.95rem; line-height:1.6;">Bandingkan total stok karbon untuk kabupaten dengan potensi terbaik menjaga cadangan karbon.</div>
                    </div>
                </div>
                <canvas id="stok-carbon-kab-chart" height="240"></canvas>
            </div>
            <div style="background: white; border-radius: 20px; border: 1px solid #e8f4f1; padding: 22px; box-shadow: 0 14px 34px rgba(0,0,0,0.04);">
                <div style="display:flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; margin-bottom: 18px;">
                    <div>
                        <h3 style="color: #1a472a; margin-bottom: 8px;">📈 Rata-rata Densitas per Kabupaten</h3>
                        <div style="color:#4b6372; font-size:0.95rem; line-height:1.6;">Lihat kabupaten dengan nilai densitas karbon paling tinggi untuk analisis penyerapan.</div>
                    </div>
                </div>
                <canvas id="stok-carbon-density-chart" height="240"></canvas>
            </div>
        </div>
        <div class="karbon-summary-cards">${topKabupatenCards}</div>
        `;

        // Top 10 Desa by Carbon Stock
        const topDesa = processedData.sort((a, b) => b.totalStock - a.totalStock).slice(0, 10);

        html += `
        <div style="margin-top: 30px;">
            <h3 style="color: #1a472a; margin-bottom: 20px;">🏆 Top 10 Desa dengan Stok Karbon Tertinggi</h3>
            <div style="overflow-x:auto; padding: 20px 0; background: linear-gradient(135deg, rgba(0, 102, 255, 0.04), rgba(255, 255, 255, 0)); border-radius: 20px;">
                <table class="karbon-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Desa</th>
                            <th>Kecamatan</th>
                            <th>Kabupaten</th>
                            <th>Area (Ha)</th>
                            <th>Total Stock (Ton C)</th>
                            <th>Densitas (Ton/Ha)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        topDesa.forEach((data, index) => {
            html += `
                    <tr>
                        <td style="font-weight: bold; color: #1a472a;">${index + 1}</td>
                        <td><strong>${data.desa}</strong></td>
                        <td>${data.kecamatan}</td>
                        <td>${data.kabkota}</td>
                        <td>${data.sqHa.toLocaleString('id-ID', {maximumFractionDigits: 1})}</td>
                        <td style="font-weight: bold; color: #27ae60;">${Math.round(data.totalStock).toLocaleString('id-ID')}</td>
                        <td>${data.stockPerHa.toFixed(2)}</td>
                    </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        </div>
        `;

        // Aggregation by Kabupaten


        container.innerHTML = html;

        if (window.chartRenderer) {
            const kabLabels = topKabupaten.map(([kab]) => kab);
            const kabStockValues = topKabupaten.map(([_, data]) => Math.round(data.totalStock));
            const kabDensityValues = topKabupaten.map(([_, data]) => data.totalArea > 0 ? +(data.totalStock / data.totalArea).toFixed(2) : 0);

            const stockChartEl = document.getElementById('stok-carbon-kab-chart');
            if (stockChartEl) {
                const stockCtx = stockChartEl.getContext('2d');
                chartRenderer.destroyChart('stok-carbon-kab-chart');
                chartRenderer.charts.set('stok-carbon-kab-chart', new Chart(stockCtx, {
                    type: 'bar',
                    data: {
                        labels: kabLabels,
                        datasets: [{
                            label: 'Total Stok Karbon',
                            data: kabStockValues,
                            backgroundColor: kabStockValues.map((_, index) => index % 2 === 0 ? 'rgba(39, 174, 96, 0.9)' : 'rgba(16, 185, 129, 0.9)'),
                            borderColor: '#15803d',
                            borderWidth: 1,
                            borderRadius: 8,
                            maxBarThickness: 38
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'Ton Karbon' },
                                grid: { color: 'rgba(0, 0, 0, 0.06)' },
                                ticks: { callback: value => value.toLocaleString('id-ID') }
                            },
                            x: {
                                title: { display: true, text: 'Kabupaten' },
                                ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, font: { size: 10 } }
                            }
                        }
                    }
                }));
            }

            const densityChartEl = document.getElementById('stok-carbon-density-chart');
            if (densityChartEl) {
                const densityCtx = densityChartEl.getContext('2d');
                const densityGradient = densityCtx.createLinearGradient(0, 0, 0, densityChartEl.height);
                densityGradient.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
                densityGradient.addColorStop(1, 'rgba(96, 165, 250, 0.04)');

                chartRenderer.destroyChart('stok-carbon-density-chart');
                chartRenderer.charts.set('stok-carbon-density-chart', new Chart(densityCtx, {
                    type: 'line',
                    data: {
                        labels: kabLabels,
                        datasets: [{
                            label: 'Densitas (Ton/Ha)',
                            data: kabDensityValues,
                            borderColor: '#2563eb',
                            backgroundColor: densityGradient,
                            fill: true,
                            tension: 0.35,
                            borderWidth: 3,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: '#2563eb'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'Ton/Ha' },
                                grid: { color: 'rgba(0, 0, 0, 0.06)' },
                                ticks: { callback: value => value.toLocaleString('id-ID') }
                            },
                            x: {
                                title: { display: true, text: 'Kabupaten' },
                                ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, font: { size: 10 } }
                            }
                        }
                    }
                }));
            }
        }
    } catch (error) {
        console.error('❌ Error rendering stok karbon:', error);
        container.innerHTML = `<p style="color: #e74c3c; padding: 20px;">Error: ${error.message}</p>`;
    }
}
