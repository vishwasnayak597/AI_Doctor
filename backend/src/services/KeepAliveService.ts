/**
 * Internal Keep-Alive Service
 * Runs within the existing aiDoc backend to prevent cold starts
 */

import https from 'https';
import http from 'http';

interface KeepAliveConfig {
  PING_INTERVAL: number;
  ENDPOINTS: string[];
  BUSINESS_HOURS: {
    START: number;
    END: number;
  };
  TIMEOUT: number;
}

export class KeepAliveService {
  private static config: KeepAliveConfig = {
    PING_INTERVAL: (process.env.KEEP_ALIVE_INTERVAL ? parseInt(process.env.KEEP_ALIVE_INTERVAL) : 3) * 60 * 1000, // 3 minutes default
    ENDPOINTS: [
      process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/health` : 'https://ai-doctor-qc2b.onrender.com/health',
      process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/api/auth/me` : 'https://ai-doctor-qc2b.onrender.com/api/auth/me'
    ],
    BUSINESS_HOURS: {
      START: 6,  // 6 AM UTC
      END: 23    // 11 PM UTC
    },
    TIMEOUT: 15000 // 15 seconds
  };

  private static interval: NodeJS.Timeout | null = null;

  /**
   * Start the keep-alive service
   */
  static start(): void {
    if (this.interval) {
      console.log('⚠️ Keep-alive service already running');
      return;
    }

    console.log('🚀 Starting aiDoc Keep-Alive Service');
    console.log(`📡 Ping interval: ${this.config.PING_INTERVAL / 60000} minutes`);
    console.log(`🕒 Business hours: ${this.config.BUSINESS_HOURS.START}:00 - ${this.config.BUSINESS_HOURS.END}:00 UTC`);

    // Initial ping
    this.pingEndpoints();

    // Set up recurring pings
    this.interval = setInterval(() => {
      this.pingEndpoints();
    }, this.config.PING_INTERVAL);
  }

  /**
   * Stop the keep-alive service
   */
  static stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🛑 Keep-alive service stopped');
    }
  }

  /**
   * Check if we're in business hours
   */
  private static isBusinessHours(): boolean {
    const hour = new Date().getUTCHours();
    return hour >= this.config.BUSINESS_HOURS.START && hour <= this.config.BUSINESS_HOURS.END;
  }

  /**
   * Ping all endpoints
   */
  private static async pingEndpoints(): Promise<void> {
    const timestamp = new Date().toISOString();

    if (!this.isBusinessHours()) {
      console.log(`😴 [${timestamp}] Outside business hours - skipping ping`);
      return;
    }

    console.log(`💓 [${timestamp}] Keep-alive ping...`);

    const results = await Promise.all(
      this.config.ENDPOINTS.map(url => this.pingSingleEndpoint(url))
    );

    const successCount = results.filter(Boolean).length;
    console.log(`📊 [${timestamp}] ${successCount}/${this.config.ENDPOINTS.length} endpoints alive`);
  }

  /**
   * Ping a single endpoint
   */
  private static pingSingleEndpoint(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      const timestamp = new Date().toISOString();

      const request = protocol.get(url, { timeout: this.config.TIMEOUT }, (res) => {
        const status = res.statusCode;
        if (status && status >= 200 && status < 500) {
          // Accept 200-499 (including 401 for auth endpoints)
          resolve(true);
        } else {
          console.log(`⚠️ [${timestamp}] ${url} - Status: ${status}`);
          resolve(false);
        }
      });

      request.on('error', (err) => {
        console.error(`❌ [${timestamp}] ${url} - ${err.message}`);
        resolve(false);
      });

      request.on('timeout', () => {
        request.destroy();
        console.error(`⏰ [${timestamp}] ${url} - Timeout`);
        resolve(false);
      });

      request.setTimeout(this.config.TIMEOUT);
    });
  }

  /**
   * Get service status
   */
  static getStatus(): object {
    return {
      running: this.interval !== null,
      config: {
        intervalMinutes: this.config.PING_INTERVAL / 60000,
        businessHours: this.config.BUSINESS_HOURS,
        endpoints: this.config.ENDPOINTS.length
      },
      currentHour: new Date().getUTCHours(),
      isBusinessHours: this.isBusinessHours()
    };
  }
}
