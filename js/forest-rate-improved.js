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
        const normalizeKabupatenName = (value = '') => String(value || '').trim().toLowerCase()
            .replace(/^kabupaten\s*/i, '')
            .replace(/^kab\.\s*/i, '')
            .replace(/^kota\s*/i, '')
            .replace(/^kot\.\s*/i, '')
            .replace(/\s+/g, ' ')
            .trim();
        const kabupatenPercentOverrides = { maros: -0.003, makassar: 0.075, takalar: -0.33 };
        const kabupatenHaPerYearOverrides = { maros: -0.037, makassar: 0.54, takalar: -6.56 };
        const getDisplayKabupatenName = (value = '') => {
            const normalized = normalizeKabupatenName(value);
            if (normalized === 'maros') return 'Maros';
            if (normalized === 'makassar') return 'Makassar';
            if (normalized === 'takalar') return 'Takalar';
            return String(value || '').trim() || 'Tidak Diketahui';
        };

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
            const rawChangePercent = parseFloat(row['Perubahan Pertahun %'] || row['perubahan_persen'] || row['Perubahan %'] || 0) || 0;
            const rawChangeHa = parseFloat(row['PerubahanPertahun(Ha)'] || row['perubahan_ha'] || row['Perubahan Ha'] || 0) || 0;

            // Get kabupaten name
            const kabupaten = row['KabupatenKota'] || row['Kabupaten'] || row['KabKota'] || row['kabupaten'] || row['kabkota'] || 'Tidak Diketahui';
            const kabupatenKey = normalizeKabupatenName(kabupaten);
            const changePercent = kabupatenPercentOverrides[kabupatenKey] !== undefined ? kabupatenPercentOverrides[kabupatenKey] : rawChangePercent;
            const baseChangeHaPerYear = rawChangeHa * 10;
            const changeHaPerYear = kabupatenHaPerYearOverrides[kabupatenKey] !== undefined ? kabupatenHaPerYearOverrides[kabupatenKey] : baseChangeHaPerYear;
            const changeHa = changeHaPerYear;
            const isMinus = changeHaPerYear < 0 ? true : false;

            return {
                kabupaten: getDisplayKabupatenName(kabupaten),
                kabupatenKey,
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
            <div class="forest-rate-card" style="animation-delay: ${index * 0.05}s; background: linear-gradient(145deg, #f7fcf8 0%, #eef9ee 100%); border: 1px solid rgba(46, 125, 50, 0.16); box-shadow: 0 18px 32px rgba(46, 125, 50, 0.08);">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:16px 16px 14px; background:linear-gradient(120deg, rgba(46,125,50,0.08), rgba(102,187,106,0.12));">
                    <div class="card-name" style="font-size: 0.95rem; font-weight: 800; color: #2e7d32; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1.2;">${data.kabupaten}</div>
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

                <button class="detail-btn" onclick="showKabupatenDetail('${data.kabupaten}')" style="margin-top: 16px; width: 100%; padding: 12px 14px; background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); color: white; border: none; border-radius: 999px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 20px rgba(46, 125, 50, 0.16); transition: transform 0.2s ease, box-shadow 0.2s ease;">
                    📊 Lihat Detail
                </button>
            </div>
            `;
        });

        html += '</div>';

        // Summary section
        let summaryHtml = `
        <div style="margin-top: 35px; padding: 25px; background: linear-gradient(135deg, #f7fcf8 0%, #ffffff 100%); border-radius: 18px; border: 2px solid #eaf7eb; box-shadow: 0 18px 42px rgba(46, 125, 50, 0.08);">
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
            <div style="background: white; border-radius: 20px; border: 1px solid #eaf7eb; padding: 22px; box-shadow: 0 12px 30px rgba(0,0,0,0.04);">
                <h4 style="margin: 0 0 14px; color: #2e7d32; font-size: 1rem;">Laju Perubahan Tahunan %</h4>
                <div style="height: 280px;">
                    <canvas id="forest-rate-pct-chart" style="width:100%;height:100%;"></canvas>
                </div>
            </div>
            <div style="background: white; border-radius: 20px; border: 1px solid #eaf7eb; padding: 22px; box-shadow: 0 12px 30px rgba(0,0,0,0.04);">
                <h4 style="margin: 0 0 14px; color: #2e7d32; font-size: 1rem;">Laju Perubahan Mangrove Ha/Tahun</h4>
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
                            backgroundColor: 'rgba(46, 125, 50, 0.22)',
                            borderColor: '#2e7d32',
                            borderWidth: 2,
                            pointBackgroundColor: '#388e3c',
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
                            backgroundColor: ['#2e7d32', '#43a047', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9', '#dcedc8', '#388e3c'],
                            borderColor: '#388e3c',
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

    const normalizeKabupatenName = (value = '') => String(value || '').trim().toLowerCase()
        .replace(/^kabupaten\s*/i, '')
        .replace(/^kab\.\s*/i, '')
        .replace(/^kota\s*/i, '')
        .replace(/^kot\.\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    const kabupatenPercentOverrides = { maros: -0.003, makassar: 0.075, takalar: -0.33 };
    const kabupatenHaPerYearOverrides = { maros: -0.037, makassar: 0.54, takalar: -6.56 };

    const kabupatenKey = normalizeKabupatenName(kabupaten);
    const isSupported = Object.prototype.hasOwnProperty.call(kabupatenPercentOverrides, kabupatenKey);

    if (!isSupported) {
        detailPanel.innerHTML = `<div style="color: #666; padding: 20px; background: #fcfcfc; border: 1px solid #e8f4f1; border-radius: 12px;">Informasi detail belum tersedia untuk kabupaten ini.</div>`;
        return;
    }

    const title = kabupatenKey === 'makassar' ? 'Makassar' : kabupatenKey === 'takalar' ? 'Takalar' : 'Maros';
    const changePercent = kabupatenPercentOverrides[kabupatenKey];
    const changeHaPerYear = kabupatenHaPerYearOverrides[kabupatenKey];
    const isMinus = changeHaPerYear < 0;

    const stateManager = window.stateManager;
    const desaData = stateManager ? stateManager.getSheetData('LajuForestasiDesa') : [];
    const parseNumeric = (value) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const kabdesa = (desaData || []).filter(row => {
        const rowKabupatenRaw = String(row['Kabupaten'] || row['kabupaten'] || row['KabKota'] || row['kabkota'] || row['KabupatenKota'] || '').trim();
        const rowKabNormalized = normalizeKabupatenName(rowKabupatenRaw);
        if (rowKabNormalized === kabupatenKey) return true;
        if (rowKabNormalized.includes(kabupatenKey)) return true;
        // fallback: check other combined fields for loose matches
        const alt = String(row['KabupatenKota'] || row['KabKota'] || row['kabkota'] || '').trim();
        if (normalizeKabupatenName(alt).includes(kabupatenKey)) return true;
        return false;
    });

    const desaSummary = kabdesa.map(row => {
        const desa = String(row['Desa'] || row['desa'] || 'Unknown').trim();
        const kecamatan = String(row['Kecamatan'] || row['kecamatan'] || 'Unknown').trim();
        const kabupatenName = String(row['Kabupaten'] || row['kabupaten'] || row['KabKota'] || row['kabkota'] || row['KabupatenKota'] || title).trim();
        const changePercentValue = parseNumeric(row['Perubahan Pertahun %'] || row['Perubahan %'] || row['perubahan_persen'] || 0);
        const changeHaValue = parseNumeric(row['PerubahanPertahun(Ha)'] || row['Perubahan Ha'] || row['perubahan_ha'] || 0);

        return {
            desa,
            kecamatan,
            kabupaten: kabupatenName || title,
            changePercent: changePercentValue,
            changeHa: changeHaValue
        };
    });

    const topDesa = Object.values(desaSummary)
        .sort((a, b) => Math.abs(b.changeHa) - Math.abs(a.changeHa))
        .slice(0, Math.min(10, desaSummary.length));

    const totalVillages = topDesa.length;
    const totalChange = topDesa.reduce((sum, item) => sum + item.changeHa, 0);
    const avgPercent = totalVillages > 0 ? topDesa.reduce((sum, item) => sum + item.changePercent, 0) / totalVillages : 0;

    let html = `
        <div style="background: white; border: 1px solid #d7ebd8; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(46, 125, 50, 0.08);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 20px;">
            <div>
              <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700; color: #2e7d32;">Detail Kabupaten/Kota ${title}</h3>
              <p style="margin: 8px 0 0; color: #546e7a;">Ringkasan data desa dari sheet LajuForestasiDesa untuk wilayah terpilih.</p>
            </div>
            <div style="text-align: right; min-width: 210px;">
              <div style="font-size: 1.4rem; font-weight: 800; color: ${isMinus ? '#b71c1c' : '#1a472a'};">${isMinus ? 'Penurunan' : 'Peningkatan'}</div>
              <div style="font-size: 0.85rem; color: #666;">Status perubahan</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px;">
            <div style="background: #f0f8ff; border-radius: 12px; padding: 14px;">
              <div style="font-size: 0.75rem; color: #666;">Laju perubahan tahunan</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: #2e7d32;">${changePercent.toFixed(3)}%</div>
            </div>
            <div style="background: #f7fff4; border-radius: 12px; padding: 14px;">
              <div style="font-size: 0.75rem; color: #666;">Perubahan luas</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: ${isMinus ? '#b71c1c' : '#1a472a'};">${changeHaPerYear.toFixed(2)} Ha/Tahun</div>
            </div>
          </div>
          <div style="padding: 14px 16px; border-radius: 12px; background: ${isMinus ? '#fff5f5' : '#f4fff7'}; color: ${isMinus ? '#b71c1c' : '#1b5e20'}; font-weight: 600; margin-bottom: 18px;">
            Informasi ini khusus menampilkan data desa untuk ${title} sesuai pengaturan dashboard yang aktif.
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px;">
            <div style="background: #f8fbff; border-radius: 12px; padding: 14px;">
              <div style="font-size: 0.75rem; color: #666;">Desa terdeteksi</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: #2e7d32;">${totalVillages}</div>
            </div>
            <div style="background: #f9fff8; border-radius: 12px; padding: 14px;">
              <div style="font-size: 0.75rem; color: #666;">Rata-rata % perubahan</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: #1a472a;">${avgPercent.toFixed(2)}%</div>
            </div>
            <div style="background: #fffaf5; border-radius: 12px; padding: 14px;">
              <div style="font-size: 0.75rem; color: #666;">Total perubahan Ha</div>
              <div style="font-size: 1.2rem; font-weight: 700; color: ${isMinus ? '#b71c1c' : '#1a472a'};">${totalChange.toFixed(2)} Ha</div>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.92rem; table-layout: fixed;">
              <thead>
                <tr style="background: #eef9ee; color: #1b5e20; text-align: left;">
                  <th style="padding: 12px 14px; text-align: justify;">Desa</th>
                  <th style="padding: 12px 14px; text-align: justify;">Kecamatan</th>
                  <th style="padding: 12px 14px; text-align: justify;">Kabupaten</th>
                  <th style="padding: 12px 14px; text-align: justify;">Perubahan %</th>
                  <th style="padding: 12px 14px; text-align: justify;">Perubahan Ha</th>
                </tr>
              </thead>
              <tbody>
    `;

    if (topDesa.length === 0) {
        html += `
                <tr>
                  <td colspan="5" style="padding: 16px; color: #666; text-align: center;">Tidak ada data desa untuk ${title} pada sheet LajuForestasiDesa.</td>
                </tr>
        `;
    } else {
        topDesa.forEach(item => {
            const isGain = item.changeHa >= 0;
            html += `
                <tr style="border-bottom: 1px solid #e8eef8;">
                  <td style="padding: 12px 14px; font-weight: 600; color: #10375c; text-align: justify; word-break: break-word;">${item.desa}</td>
                  <td style="padding: 12px 14px; color: #4f5b69; text-align: justify; word-break: break-word;">${item.kecamatan}</td>
                  <td style="padding: 12px 14px; color: #4f5b69; text-align: justify; word-break: break-word;">${item.kabupaten}</td>
                  <td style="padding: 12px 14px; color: ${isGain ? '#1b5e20' : '#b71c1c'}; text-align: justify;">${item.changePercent.toFixed(2)}%</td>
                  <td style="padding: 12px 14px; color: ${isGain ? '#1b5e20' : '#b71c1c'}; text-align: justify;">${item.changeHa.toFixed(2)} Ha</td>
                </tr>
            `;
        });
    }

    html += `
              </tbody>
            </table>
          </div>
        </div>
    `;

    detailPanel.innerHTML = html;
}
