import { API_URL } from './api';

// ฟังก์ชันสำหรับ wake up server
export const wakeUpServer = async () => {
  try {
    console.log('🏥 Health check: Waking up server...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 วินาที

    const response = await fetch(`${API_URL}`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    clearTimeout(timeoutId);
    
    if (response.ok || response.status === 404) {
      console.log('✅ Health check: Server is awake!');
      return true;
    } else {
      console.log('⚠️ Health check: Server responding but not ready');
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏰ Health check: Timeout - server is probably cold starting');
    } else {
      console.log('❌ Health check failed:', error.message);
    }
    return false;
  }
};

// ฟังก์ชันสำหรับ check server status
export const checkServerStatus = async () => {
  try {
    console.log('🔍 Checking server status...');
    const response = await fetch(`${API_URL}/api/users/current`, {
      method: 'HEAD', // ใช้ HEAD เพื่อไม่ต้องโหลดข้อมูล
      timeout: 10000
    });
    
    console.log('✅ Server status: Ready');
    return true;
  } catch (error) {
    console.log('❌ Server status: Not ready');
    return false;
  }
};
