/**
 * Forest Rate Improved Dashboard
 * Displays deforestation/reforestation rate by Kabupaten with clear metrics
 */
function renderForestRateImproved(containerId, stateManager, statsCalculator) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        // Get data from Excel
        const forestRateData = stateManager.getSheetData('LajuForestasiKab');
        const mangroveData = stateManager.getSheetData('2026Mangrove');

        console.log('🌳 Forest Rate Data:', forestRateData.length, 'records');
        console.log('Sample:', forestRateData[0]);

        if (!forestRateData || forestRateData.length === 0) {
            container.innerHTML = '<p style="color: #e74c3c; text-align: center; padding: 40px;">Data tidak ditemukan. Silakan cek sheet LajuForestasiKab.</p>';
            return;
        }

        // Process and sort data
        const processedData = forestRateData.map(row => {
            // Normalize column names using exact headers from Dashboard.xlsx
            const area2016 = parseFloat(row['2016'] || row['Tahun_2016'] || row['2016 Ha'] || 0) || 0;
            const area2026 = parseFloat(row['2026'] || row['Tahun_2026'] || row['2026 Ha'] || 0) || 0;
            const changePercent = parseFloat(row['Perubahan Pertahun %'] || row['perubahan_persen'] || row['Perubahan %'] || 0) || 0;
            const changeHa = parseFloat(row['PerubahanPertahun(Ha)'] || row['perubahan_ha'] || row['Perubahan Ha'] || 0) || 0;

            // Get kabupaten name
            const kabupaten = row['KabupatenKota'] || row['Kabupaten'] || row['KabKota'] || row['kabupaten'] || row['kabkota'] || 'Tidak Diketahui';

            // Calculate derived metrics
            const changeHaPerYear = changeHa / 10;
            const isMinus = changeHa < 0 ? true : false;

            return {
                kabupaten: kabupaten.trim(),
                area2016: area2016,
                area2026: area2026,
                changePercent: changePercent,
                changeHa: changeHa,
                changeHaPerYear: changeHaPerYear,
                isMinus: isMinus
            };
        }).filter(d => d.kabupaten !== 'Tidak Diketahui');

        // Sort by change percent (worst first)
        processedData.sort((a, b) => Math.abs(b.changeHa) - Math.abs(a.changeHa));

        // Generate HTML
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 20px;">';

        processedData.forEach((data, index) => {
            const changeColor = data.isMinus ? '#e74c3c' : '#27ae60';
            const changeIcon = data.isMinus ? '📉' : '📈';
            const badgeClass = data.isMinus ? 'badge-negative' : 'badge-positive';
            const badgeText = data.isMinus ? 'Degradasi' : 'Agradasi';

            html += `
            <div class="forest-rate-card" style="animation-delay: ${index * 0.05}s; background: linear-gradient(145deg, #f7fbff 0%, #eff7ff 100%); border: 1px solid rgba(0, 102, 255, 0.16); box-shadow: 0 18px 32px rgba(0, 102, 255, 0.08);">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:16px 16px 14px; background:linear-gradient(120deg, rgba(0,102,255,0.08), rgba(0,180,216,0.09));">
                    <div class="card-name" style="font-size: 0.95rem; font-weight: 800; color: #0b5fff; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1.2;">${data.kabupaten}</div>
                    <span class="card-badge ${badgeClass}" style="font-weight:700; font-size:0.78rem; padding:5px 8px; white-space:nowrap;">
                        ${changeIcon} ${badgeText}
                    </span>
                </div>

                <div style="margin-bottom: 20px; padding: 18px; background: white; border-radius: 16px; border-left: 4px solid ${changeColor}; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.04);">
                    <div style="font-size: 26px; font-weight: bold; color: ${changeColor};">
                        ${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 6px; letter-spacing: 0.02em;">Laju Perubahan Tahunan</div>
                </div>

                <div class="card-metrics" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px;">
                    <div class="metric" style="padding: 10px 8px; min-height: 78px;">
                        <div class="metric-label">📅 2016</div>
                        <div class="metric-value">${data.area2016.toLocaleString('id-ID', {maximumFractionDigits: 1})}</div>
                        <div class="metric-unit">Hektar</div>
                    </div>
                    <div class="metric" style="padding: 10px 8px; min-height: 78px;">
                        <div class="metric-label">📅 2026</div>
                        <div class="metric-value">${data.area2026.toLocaleString('id-ID', {maximumFractionDigits: 1})}</div>
                        <div class="metric-unit">Hektar</div>
                    </div>
                </div>

                <div style="margin-top: 18px; padding: 18px; background: #fff; border-radius: 16px; border: 1px solid #e8f4f1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                        <span style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 600;">Perubahan Luas</span>
                        <span style="font-size: 14px; font-weight: bold; color: ${changeColor};">
                            ${data.isMinus ? '' : '+'}${data.changeHaPerYear.toLocaleString('id-ID', {maximumFractionDigits: 2})} Ha/Tahun
                        </span>
                    </div>
                </div>

                <button class="detail-btn" onclick="showKabupatenDetail('${data.kabupaten}')">
                    📊 Lihat Detail
                </button>
            </div>
            `;
        });

        html += '</div>';

        // Summary section
        let summaryHtml = `
        <div style="margin-top: 35px; padding: 25px; background: linear-gradient(135deg, #f5f9f7 0%, #ffffff 100%); border-radius: 18px; border: 2px solid #e8f4f1; box-shadow: 0 18px 42px rgba(0, 102, 255, 0.08);">
            <h3 style="color: #1a472a; margin-bottom: 20px;">📊 Ringkasan Laju Deforestasi</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div style="text-align: center; padding: 18px; background: white; border-radius: 18px; box-shadow: 0 12px 24px rgba(0, 0, 0, 0.04);">
                    <div style="font-size: 24px; font-weight: bold; color: #e74c3c;">${processedData.filter(d => d.isMinus).length}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 8px;">Kabupaten dengan Degradasi</div>
                </div>
                <div style="text-align: center; padding: 18px; background: white; border-radius: 18px; box-shadow: 0 12px 24px rgba(0, 0, 0, 0.04);">
                    <div style="font-size: 24px; font-weight: bold; color: #27ae60;">${processedData.filter(d => !d.isMinus).length}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 8px;">Kabupaten dengan Peningkatan</div>
                </div>
                <div style="text-align: center; padding: 18px; background: white; border-radius: 18px; box-shadow: 0 12px 24px rgba(0, 0, 0, 0.04);">
                    <div style="font-size: 24px; font-weight: bold; color: #1a472a;">${processedData.length}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 8px;">Total Kabupaten</div>
                </div>
            </div>
        </div>
        `;

        const chartSection = `
        <div style="margin-top: 25px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div style="background: white; border-radius: 20px; border: 1px solid #e8f4f1; padding: 22px; box-shadow: 0 12px 30px rgba(0,0,0,0.04);">
                <h4 style="margin: 0 0 14px; color: #0066ff; font-size: 1rem;">Laju Perubahan Tahunan %</h4>
                <div style="height: 280px;">
                    <canvas id="forest-rate-pct-chart" style="width:100%;height:100%;"></canvas>
                </div>
            </div>
            <div style="background: white; border-radius: 20px; border: 1px solid #e8f4f1; padding: 22px; box-shadow: 0 12px 30px rgba(0,0,0,0.04);">
                <h4 style="margin: 0 0 14px; color: #0066ff; font-size: 1rem;">Laju Perubahan Mangrove Ha/Tahun</h4>
                <div style="height: 280px;">
                    <canvas id="forest-rate-ha-chart" style="width:100%;height:100%;"></canvas>
                </div>
            </div>
        </div>
        `;

        container.innerHTML = summaryHtml + chartSection + html + '<div id="forest-rate-detail-panel" style="margin-top: 30px;"></div>';

        if (window.chartRenderer) {
            const labels = processedData.slice(0, 8).map(d => d.kabupaten);
            const pctData = processedData.slice(0, 8).map(d => d.changePercent);
            const haData = processedData.slice(0, 8).map(d => d.changeHaPerYear);

            const pctCanvas = document.getElementById('forest-rate-pct-chart');
            if (pctCanvas) {
                const pctCtx = pctCanvas.getContext('2d');

                chartRenderer.destroyChart('forest-rate-pct-chart');
                chartRenderer.charts.set('forest-rate-pct-chart', new Chart(pctCtx, {
                    type: 'radar',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Laju Perubahan Tahunan %',
                            data: pctData,
                            backgroundColor: 'rgba(37, 99, 235, 0.22)',
                            borderColor: '#2563eb',
                            borderWidth: 2,
                            pointBackgroundColor: '#1d4ed8',
                            pointBorderColor: '#fff',
                            pointHoverRadius: 6,
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            r: {
                                min: -0.8,
                                max: 0.3,
                                ticks: {
                                    stepSize: 0.1,
                                    backdropColor: 'transparent',
                                    color: '#64748b',
                                    callback: value => value.toFixed(1)
                                },
                                grid: { color: 'rgba(15, 23, 42, 0.12)' },
                                angleLines: { color: 'rgba(15, 23, 42, 0.12)' },
                                pointLabels: { color: '#0f172a', font: { size: 10, weight: '600' } }
                            }
                        }
                    }
                }));
            }

            const haCanvas = document.getElementById('forest-rate-ha-chart');
            if (haCanvas) {
                const haCtx = haCanvas.getContext('2d');
                const yMin = Math.min(...haData, -0.2) - 0.2;
                const yMax = Math.max(...haData, 0.2) + 0.2;

                chartRenderer.destroyChart('forest-rate-ha-chart');
                chartRenderer.charts.set('forest-rate-ha-chart', new Chart(haCtx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Laju Perubahan Mangrove Ha/Tahun',
                            data: haData,
                            backgroundColor: ['#2563eb', '#3b82f6', '#60a5fa', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#1d4ed8'],
                            borderColor: '#1d4ed8',
                            borderWidth: 1,
                            borderRadius: 6,
                            maxBarThickness: 34
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        layout: { padding: { top: 6, right: 8, left: 4, bottom: 2 } },
                        scales: {
                            y: {
                                beginAtZero: false,
                                min: yMin,
                                max: yMax,
                                title: { display: true, text: 'Perubahan (Ha)' },
                                ticks: { callback: value => value.toLocaleString('id-ID') }
                            },
                            x: {
                                title: { display: true, text: 'Kabupaten/Kota' },
                                ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, font: { size: 10 } }
                            }
                        }
                    }
                }));
            }
        }

        const detailPanel = document.getElementById('forest-rate-detail-panel');
        if (detailPanel) {
            detailPanel.innerHTML = '<div style="color: #666; font-size: 0.95rem; padding: 20px; background: #fcfcfc; border: 1px solid #e8f4f1; border-radius: 12px;">Pilih tombol "Lihat Detail" untuk melihat ringkasan desa per kabupaten.</div>';
        }

    } catch (error) {
        console.error('❌ Error rendering forest rate:', error);
        container.innerHTML = `<p style="color: #e74c3c; padding: 20px;">Error: ${error.message}</p>`;
    }
}

function showKabupatenDetail(kabupaten) {
    const detailPanel = document.getElementById('forest-rate-detail-panel');
    if (!detailPanel) {
        alert(`Detail untuk ${kabupaten} akan segera tersedia!`);
        return;
    }

    const stateManager = window.stateManager;
    const desaData = stateManager ? stateManager.getSheetData('LajuForestasiDesa') : [];
    const kabdesa = desaData.filter(row => {
        const kabValue = row['Kabupaten'] || row['KabupatenKota'] || row['KabKota'] || row['kabupaten'] || row['kabkota'] || '';
        return kabValue.toString().trim().toLowerCase() === kabupaten.toString().trim().toLowerCase();
    });

    if (kabdesa.length === 0) {
        detailPanel.innerHTML = `<div style="color: #e74c3c; padding: 20px; background: #fff2f2; border: 1px solid #f5c2c2; border-radius: 12px;">Tidak ada data desa untuk Kabupaten ${kabupaten} pada sheet LajuForestasiDesa.</div>`;
        return;
    }

    const desaSummary = kabdesa.map(row => {
        const desa = row['Desa'] || row['desa'] || 'Unknown';
        const kecamatan = row['Kecamatan'] || row['kecamatan'] || 'Unknown';
        const changePercent = parseFloat(row['Perubahan Pertahun %'] || row['Perubahan'] || row['perubahan_persen'] || row['Perubahan %'] || 0) || 0;
        const changeHa = parseFloat(row['PerubahanPertahun(Ha)'] || row['Perubahan Ha'] || row['perubahan_ha'] || 0) || 0;

        return {
            desa,
            kecamatan,
            changePercent,
            changeHa
        };
    });

    const topDesa = Object.values(desaSummary)
        .sort((a, b) => Math.abs(b.changeHa) - Math.abs(a.changeHa))
        .slice(0, Math.min(10, desaSummary.length));

    const totalVillages = topDesa.length;
    const totalChange = topDesa.reduce((sum, item) => sum + item.changeHa, 0);

    let html = `
        <div style="background: white; border: 1px solid #d6e4ff; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(0, 102, 255, 0.08);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 20px;">
            <div>
              <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700; color: #0066ff;">Detail Kabupaten ${kabupaten}</h3>
              <p style="margin: 8px 0 0; color: #546e7a;">Ringkasan data desa dari sheet LajuForestasiDesa.</p>
            </div>
            <div style="text-align: right; min-width: 210px;">
              <div style="font-size: 1.4rem; font-weight: 800; color: #1a472a;">${totalVillages}</div>
              <div style="font-size: 0.85rem; color: #666;">Desa terdeteksi</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 22px;">
            <div style="background: #f0f8ff; border-radius: 12px; padding: 14px;">
              <div style="font-size: 0.75rem; color: #666;">Total Perubahan Ha</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: #0066ff;">${totalChange.toFixed(1)} Ha</div>
            </div>
            <div style="background: #f7fff4; border-radius: 12px; padding: 14px;">
              <div style="font-size: 0.75rem; color: #666;">Rata-rata % Perubahan</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: #1a472a;">${(topDesa.reduce((sum, item) => sum + item.changePercent, 0) / totalVillages).toFixed(2)}%</div>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.92rem; table-layout: fixed;">
              <thead>
                <tr style="background: #eff6ff; color: #1a237e; text-align: left;">
                  <th style="padding: 12px 14px; text-align: justify;">Desa</th>
                  <th style="padding: 12px 14px; text-align: justify;">Kecamatan</th>
                  <th style="padding: 12px 14px; text-align: justify;">Perubahan %</th>
                  <th style="padding: 12px 14px; text-align: justify;">Perubahan Ha</th>
                </tr>
              </thead>
              <tbody>
    `;

    topDesa.forEach(item => {
        const isGain = item.changeHa >= 0;
        html += `
                <tr style="border-bottom: 1px solid #e8eef8;">
                  <td style="padding: 12px 14px; font-weight: 600; color: #10375c; text-align: justify; word-break: break-word;">${item.desa}</td>
                  <td style="padding: 12px 14px; color: #4f5b69; text-align: justify; word-break: break-word;">${item.kecamatan}</td>
                  <td style="padding: 12px 14px; color: ${isGain ? '#1b5e20' : '#b71c1c'}; text-align: justify;">${item.changePercent.toFixed(2)}%</td>
                  <td style="padding: 12px 14px; color: ${isGain ? '#1b5e20' : '#b71c1c'}; text-align: justify;">${item.changeHa.toFixed(1)} Ha</td>
                </tr>
        `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>
    `;

    detailPanel.innerHTML = html;
}
