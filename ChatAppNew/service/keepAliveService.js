// Keep-alive service เพื่อป้องกัน Render.com cold start
import { API_URL } from './api';

class KeepAliveService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  // เริ่ม keep-alive ping ทุก 10 นาที
  start() {
    if (this.isRunning) return;
    
    console.log('🔄 Starting keep-alive service for Render.com');
    this.isRunning = true;
    
    // Ping ทันทีเมื่อเริ่ม
    this.ping();
    
    // ตั้ง interval ping ทุก 10 นาที (600,000ms)
    this.intervalId = setInterval(() => {
      this.ping();
    }, 600000);
  }

  // หยุด keep-alive
  stop() {
    if (!this.isRunning) return;
    
    console.log('⏹️ Stopping keep-alive service');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ส่ง ping request
  async ping() {
    try {
      console.log('🏓 Pinging server to prevent cold start...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_URL}`, {
        method: 'HEAD', // ใช้ HEAD เพื่อไม่โหลดข้อมูล
        signal: controller.signal,
        headers: {
          'User-Agent': 'KeepAlive-Service'
        }
      });

      clearTimeout(timeoutId);
      
      if (response.ok || response.status === 404) {
        console.log('✅ Keep-alive ping successful');
      } else {
        console.log('⚠️ Keep-alive ping: unusual status', response.status);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('⏰ Keep-alive ping timeout (server might be cold starting)');
      } else {
        console.log('❌ Keep-alive ping failed:', error.message);
      }
    }
  }

  // Status
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId
    };
  }
}

// Export singleton instance
const keepAliveService = new KeepAliveService();
export default keepAliveService;
