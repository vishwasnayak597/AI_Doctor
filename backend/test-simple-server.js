console.log('🚀 Starting simple test server...');

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

console.log('✅ 1. Express modules loaded');

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

console.log('✅ 2. Middleware configured');

app.get('/health', (req, res) => {
  console.log('❤️ Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Simple test server is running perfectly'
  });
});

app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login request received:', req.body);
  res.json({
    success: true,
    data: {
      token: 'dummy-token-12345',
      user: {
        _id: 'user-123',
        firstName: 'Test',
        lastName: 'User',
        email: req.body.email,
        role: 'patient'
      }
    },
    message: 'Login successful (test mode)'
  });
});

app.get('/api/appointments', (req, res) => {
  console.log('📅 Appointments request received');
  res.json({
    success: true,
    data: {
      appointments: [
        {
          _id: 'appt-123',
          patient: { firstName: 'John', lastName: 'Doe' },
          doctor: { firstName: 'Dr. Smith', lastName: 'Johnson' },
          appointmentDate: new Date().toISOString(),
          status: 'confirmed'
        }
      ]
    }
  });
});

const server = app.listen(PORT, () => {
  console.log(`✅ 3. Simple test server running on port ${PORT}`);
  console.log('🎯 Server is ready for requests');
  console.log('🔥 Test endpoints:');
  console.log(`   - http://localhost:${PORT}/health`);
  console.log(`   - http://localhost:${PORT}/api/auth/login`);
  console.log(`   - http://localhost:${PORT}/api/appointments`);
});

// Keep alive
setInterval(() => {
  console.log('❤️ Simple server heartbeat');
}, 30000);

console.log('✅ Simple server setup complete');
