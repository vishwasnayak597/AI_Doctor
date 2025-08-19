console.log('🔍 Debug server starting...');

try {
  console.log('✅ 1. Basic logging works');
  
  // Test dotenv loading
  require('dotenv/config');
  console.log('✅ 2. dotenv loaded');
  console.log('MONGODB_URI:', process.env.MONGODB_URI);
  
  // Test express
  const express = require('express');
  console.log('✅ 3. Express loaded');
  
  const app = express();
  console.log('✅ 4. Express app created');
  
  app.get('/health', (req: any, res: any) => {
    res.json({ status: 'OK', message: 'Debug server is running' });
  });
  
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`✅ 5. Debug server running on port ${PORT}`);
    console.log('🎯 Server is ready for requests');
  });
  
  // Keep alive
  setInterval(() => {
    console.log('❤️ Debug server heartbeat');
  }, 10000);
  
} catch (error) {
  console.error('❌ Error in debug server:', error);
  process.exit(1);
} 