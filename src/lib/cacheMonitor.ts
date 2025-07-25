import { imagePreloader } from "./imagePreloader";
import { cacheWarmer } from "./cacheWarmer";

interface CacheMetrics {
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageLoadTime: number;
  lastUpdated: number;
}

class CacheMonitor {
  private metrics: CacheMetrics = {
    hitRate: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLoadTime: 0,
    lastUpdated: Date.now(),
  };

  private loadTimes: number[] = [];

  // Track when an image is requested
  trackImageRequest(url: string, wasFromCache: boolean, loadTime?: number) {
    this.metrics.totalRequests++;

    if (wasFromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
      if (loadTime) {
        this.loadTimes.push(loadTime);
        // Keep only last 100 load times for average calculation
        if (this.loadTimes.length > 100) {
          this.loadTimes.shift();
        }
        this.metrics.averageLoadTime =
          this.loadTimes.reduce((sum, time) => sum + time, 0) /
          this.loadTimes.length;
      }
    }

    this.metrics.hitRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
        : 0;

    this.metrics.lastUpdated = Date.now();

    // Log poor performance
    if (this.metrics.totalRequests > 20 && this.metrics.hitRate < 70) {
      console.warn(
        `📊 Low cache hit rate: ${this.metrics.hitRate.toFixed(1)}%`
      );
    }
  }

  // Get current performance metrics
  getMetrics(): CacheMetrics & {
    cacheStats: any;
    cacheWarmerStatus: any;
    recommendations: string[];
  } {
    const cacheStats = imagePreloader.getCacheStats();
    const cacheWarmerStatus = cacheWarmer.getCacheStatus();
    const recommendations = this.getRecommendations();

    return {
      ...this.metrics,
      cacheStats,
      cacheWarmerStatus,
      recommendations,
    };
  }

  // Get performance recommendations
  private getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.hitRate < 80 && this.metrics.totalRequests > 10) {
      recommendations.push("Consider preloading more images");
    }

    if (this.metrics.averageLoadTime > 2000) {
      recommendations.push(
        "Images are loading slowly - check network or image sizes"
      );
    }

    if (
      this.loadTimes.length > 50 &&
      this.loadTimes.filter((t) => t > 3000).length > 10
    ) {
      recommendations.push(
        "Many slow loads detected - consider image optimization"
      );
    }

    const cacheStats = imagePreloader.getCacheStats();
    if (cacheStats.queueLength > 50) {
      recommendations.push(
        "Large preload queue - consider reducing concurrent loads"
      );
    }

    if (cacheStats.cachedImages < 10) {
      recommendations.push(
        "Low number of cached images - ensure preloading is working"
      );
    }

    return recommendations;
  }

  // Log performance summary
  logPerformanceSummary() {
    const metrics = this.getMetrics();

    console.log(
      `
📊 Image Cache Performance Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Hit Rate: ${metrics.hitRate.toFixed(1)}% (${metrics.cacheHits}/${
        metrics.totalRequests
      })
⚡ Avg Load Time: ${metrics.averageLoadTime.toFixed(0)}ms
💾 Cached Images: ${metrics.cacheStats.cachedImages}
🔄 Queue Length: ${metrics.cacheStats.queueLength}
🔥 Cache Warmer: ${metrics.cacheWarmerStatus.isWarming ? "Active" : "Idle"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim()
    );

    if (metrics.recommendations.length > 0) {
      console.log("💡 Recommendations:");
      metrics.recommendations.forEach((rec) => console.log(`   • ${rec}`));
    }
  }

  // Start periodic logging
  startMonitoring() {
    // Log performance every 2 minutes
    setInterval(() => {
      if (this.metrics.totalRequests > 0) {
        this.logPerformanceSummary();
      }
    }, 2 * 60 * 1000);

    console.log("📊 Cache monitoring started");
  }

  // Reset metrics
  reset() {
    this.metrics = {
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLoadTime: 0,
      lastUpdated: Date.now(),
    };
    this.loadTimes = [];
  }
}

export const cacheMonitor = new CacheMonitor();
