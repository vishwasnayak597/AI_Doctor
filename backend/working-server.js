console.log('🚀 Starting working server...');

const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test appointment route
app.post('/api/appointments', (req, res) => {
  console.log('📝 Appointment request received:', req.body);
  res.json({ 
    success: true, 
    message: 'Appointment endpoint working',
    data: { id: 'test-appointment-123' }
  });
});

// Catch all route
app.get('*', (req, res) => {
  res.json({ message: 'Server is working!', path: req.path });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log('🚀 Working server started successfully!');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('🎉 Ready to handle requests!');
});

// Prevent immediate shutdown
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Keep server alive
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, but keeping server alive for testing...');
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, gracefully shutting down...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

console.log('💪 Server process will stay alive...'); 