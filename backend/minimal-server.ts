console.log('🚀 Starting minimal server...');

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

console.log('✅ Express modules loaded');

app.use(cors());
app.use(express.json());

console.log('✅ Middleware configured');

app.get('/health', (req: any, res: any) => {
  console.log('❤️ Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Minimal server is running perfectly'
  });
});

app.post('/api/auth/login', (req: any, res: any) => {
  console.log('🔐 Login request received:', req.body);
  res.json({
    success: true,
    data: {
      token: 'dummy-token-12345',
      user: {
        _id: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: req.body.email || 'test@example.com',
        role: 'patient'
      }
    },
    message: 'Login successful (dummy response)'
  });
});

console.log('✅ Routes configured');

const server = app.listen(PORT, () => {
  console.log(`🎉 Minimal server successfully running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Login endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log('🔥 Server is ready to accept requests!');
});

// Keep the process alive
setInterval(() => {
  console.log('❤️ Server heartbeat -', new Date().toISOString());
}, 60000);

console.log('✅ Minimal server setup complete!');
