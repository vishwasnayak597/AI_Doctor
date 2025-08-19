console.log('🚀 Starting test main server...');

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 5000;

console.log('✅ Express modules loaded');

app.use(cors());
app.use(express.json());

console.log('✅ Middleware configured');

// Add routes that match the main server
app.get('/health', (req: any, res: any) => {
  console.log('❤️ Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Test main server is running perfectly'
  });
});

app.post('/api/auth/login', (req: any, res: any) => {
  console.log('🔐 Login request received:', req.body);
  res.json({
    success: true,
    data: {
      token: 'test-token-12345',
      user: {
        _id: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: req.body.email || 'test@example.com',
        role: 'patient'
      }
    },
    message: 'Login successful (test response from main server)'
  });
});

console.log('✅ Routes configured');

async function startServer() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aiDoc', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected successfully');

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`🎉 Test main server successfully running on http://localhost:${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
      console.log(`✅ Login endpoint: http://localhost:${PORT}/api/auth/login`);
      console.log('🔥 Server is ready to accept requests!');
    });

    // Keep the process alive
    setInterval(() => {
      console.log('❤️ Test server heartbeat -', new Date().toISOString());
    }, 60000);

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received - shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        mongoose.disconnect();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received - shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        mongoose.disconnect();
        process.exit(0);
      });
    });

    console.log('✅ Test main server setup complete!');
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer(); 