/**
 * ============================================================================
 * CHART RENDERER - Modular Chart Creation and Management
 * ============================================================================
 * 
 * Provides factory methods for creating and updating Chart.js charts:
 * - Bar charts (horizontal and vertical)
 * - Pie and Doughnut charts
 * - Line charts
 * - Radar charts
 * - Mixed charts
 * 
 * Features:
 * - Automatic chart destruction and recreation
 * - Color management
 * - Responsive sizing
 * - Animations
 * - Custom tooltips
 */

class ChartRenderer {
  constructor() {
    this.charts = new Map();
    this.colors = {
      primary: '#0066ff',
      secondary: '#00b4d8',
      success: '#00b300',
      warning: '#ffaa00',
      danger: '#ff3333',
      info: '#4fc3f7'
    };
    
    this.classColors = {
      'Lebat': '#00b300',    // Green - Dense
      'Sedang': '#ffaa00',   // Yellow - Medium
      'Jarang': '#ff6600',   // Orange - Sparse
      'Rusak': '#ff3333'     // Red - Damaged
    };
  }
  
  /**
   * ===== CHART DESTRUCTION & MANAGEMENT =====
   */
  
  /**
   * Destroy chart if it exists
   */
  destroyChart(chartId) {
    if (this.charts.has(chartId)) {
      const chart = this.charts.get(chartId);
      chart.destroy();
      this.charts.delete(chartId);
      console.log(`Destroyed chart: ${chartId}`);
    }
  }
  
  /**
   * Recreate chart (destroy old, create new)
   */
  recreateChart(chartId, config) {
    this.destroyChart(chartId);
    return this.createChart(chartId, config);
  }
  
  /**
   * Get chart instance by ID
   */
  getChart(chartId) {
    return this.charts.get(chartId);
  }
  
  /**
   * Update chart data
   */
  updateChart(chartId, data) {
    const chart = this.charts.get(chartId);
    if (chart) {
      chart.data.datasets = data.datasets || chart.data.datasets;
      chart.data.labels = data.labels || chart.data.labels;
      chart.update('active');
    }
  }
  
  /**
   * ===== BAR CHARTS =====
   */
  
  /**
   * Create vertical bar chart
   */
  createBarChart(canvasId, labels, datasets, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
      console.warn(`Canvas ${canvasId} not found`);
      return null;
    }
    
    this.destroyChart(canvasId);
    
    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { family: 'Poppins', size: 12, weight: 600 },
            color: '#333',
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { family: 'Poppins', size: 13, weight: 600 },
          bodyFont: { family: 'Poppins', size: 12 },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { drawBorder: false, color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { font: { family: 'Poppins', size: 11 }, color: '#666' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Poppins', size: 11 }, color: '#666' }
        }
      }
    };
    
    const config = {
      type: 'bar',
      data: { labels, datasets },
      options: { ...defaultOptions, ...options }
    };
    
    const chart = new Chart(ctx, config);
    this.charts.set(canvasId, chart);
    return chart;
  }
  
  /**
   * Create horizontal bar chart
   */
  createHorizontalBarChart(canvasId, labels, datasets, options = {}) {
    const config = {
      type: 'bar',
      indexAxis: 'y',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { family: 'Poppins', size: 12, weight: 600 },
              color: '#333',
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: { family: 'Poppins', size: 13, weight: 600 },
            bodyFont: { family: 'Poppins', size: 12 },
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { drawBorder: false, color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { font: { family: 'Poppins', size: 11 }, color: '#666' }
          },
          y: {
            grid: { display: false },
            ticks: { font: { family: 'Poppins', size: 11 }, color: '#666' }
          }
        },
        ...options
      }
    };
    
    return this.createChart(canvasId, config);
  }
  
  /**
   * ===== PIE & DOUGHNUT CHARTS =====
   */
  
  /**
   * Create pie chart
   */
  createPieChart(canvasId, labels, data, colors = null, options = {}) {
    const defaultColors = colors || this.generateColors(labels.length);
    
    const config = {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: defaultColors,
          borderColor: 'white',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Poppins', size: 12, weight: 600 },
              color: '#333',
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: { family: 'Poppins', size: 13, weight: 600 },
            bodyFont: { family: 'Poppins', size: 12 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value.toFixed(2)} (${percentage}%)`;
              }
            }
          }
        },
        ...options
      }
    };
    
    return this.createChart(canvasId, config);
  }
  
  /**
   * Create doughnut chart
   */
  createDoughnutChart(canvasId, labels, data, colors = null, options = {}) {
    const defaultColors = colors || this.generateColors(labels.length);
    
    const config = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: defaultColors,
          borderColor: 'white',
          borderWidth: 3,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Poppins', size: 11, weight: 600 },
              color: '#333',
              padding: 15,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: { family: 'Poppins', size: 13, weight: 600 },
            bodyFont: { family: 'Poppins', size: 12 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value.toFixed(2)} (${percentage}%)`;
              }
            }
          }
        },
        ...options
      }
    };
    
    return this.createChart(canvasId, config);
  }
  
  /**
   * ===== LINE CHARTS =====
   */
  
  /**
   * Create line chart
   */
  createLineChart(canvasId, labels, datasets, options = {}) {
    const config = {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { family: 'Poppins', size: 12, weight: 600 },
              color: '#333',
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: { family: 'Poppins', size: 13, weight: 600 },
            bodyFont: { family: 'Poppins', size: 12 },
            padding: 12,
            borderRadius: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { drawBorder: false, color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { font: { family: 'Poppins', size: 11 }, color: '#666' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Poppins', size: 11 }, color: '#666' }
          }
        },
        ...options
      }
    };
    
    return this.createChart(canvasId, config);
  }
  
  /**
   * ===== RADAR CHARTS =====
   */
  
  /**
   * Create radar chart
   */
  createRadarChart(canvasId, labels, datasets, options = {}) {
    const config = {
      type: 'radar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              font: { family: 'Poppins', size: 11, weight: 600 },
              color: '#333',
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleFont: { family: 'Poppins', size: 13, weight: 600 },
            bodyFont: { family: 'Poppins', size: 12 },
            padding: 12
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            ticks: {
              font: { family: 'Poppins', size: 10 },
              color: '#666'
            },
            grid: { color: 'rgba(0, 0, 0, 0.1)' }
          }
        },
        ...options
      }
    };
    
    return this.createChart(canvasId, config);
  }
  
  /**
   * ===== HELPER METHODS =====
   */
  
  /**
   * Create chart instance and store reference
   */
  createChart(canvasId, config) {
    this.destroyChart(canvasId);
    
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
      console.warn(`Canvas ${canvasId} not found`);
      return null;
    }
    
    const chart = new Chart(ctx, config);
    this.charts.set(canvasId, chart);
    return chart;
  }
  
  /**
   * Generate gradient colors
   */
  generateColors(count) {
    const colors = [
      '#0066ff', '#00b4d8', '#00b300', '#ffaa00', '#ff6600', '#ff3333',
      '#4fc3f7', '#ff1744', '#9c27b0', '#00bcd4', '#8bc34a', '#ffc107'
    ];
    
    return Array(count)
      .fill()
      .map((_, i) => colors[i % colors.length]);
  }
  
  /**
   * Get class-specific colors for mangrove chart
   */
  getClassColors(classes) {
    return classes.map(c => this.classColors[c] || '#999');
  }
  
  /**
   * Format large numbers for display
   */
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(2);
  }
  
  /**
   * Create dataset object for Chart.js
   */
  createDataset(label, data, color, options = {}) {
    return {
      label,
      data,
      backgroundColor: color,
      borderColor: color,
      borderWidth: 2,
      tension: 0.4,
      fill: false,
      pointRadius: 5,
      pointBackgroundColor: color,
      pointBorderColor: 'white',
      pointBorderWidth: 2,
      ...options
    };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartRenderer;
}
