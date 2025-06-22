class PerformanceMonitor {
  private metrics: {
    messageLoadTime: number[];
    imageLoadTime: number[];
    searchTime: number[];
  };

  constructor() {
    this.metrics = {
      messageLoadTime: [],
      imageLoadTime: [],
      searchTime: []
    };
  }

  // Track loading time
  trackLoadTime(type: string, startTime: number) {
    const endTime = Date.now();
    const loadTime = endTime - startTime;

    if (this.metrics[type]) {
      this.metrics[type].push(loadTime);

      // Keep only last 100 measurements
      if (this.metrics[type].length > 100) {
        this.metrics[type].shift();
      }
    }
  }

  // Get average loading time
  getAverageLoadTime(type: string) {
    if (!this.metrics[type] || this.metrics[type].length === 0) {
      return 0;
    }

    const sum = this.metrics[type].reduce((a, b) => a + b, 0);
    return sum / this.metrics[type].length;
  }

  // Reset metrics
  resetMetrics() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();