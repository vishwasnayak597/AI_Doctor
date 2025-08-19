
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Database from './utils/database';

const PORT = process.env.PORT || 5000;

async function startMinimalServer() {
  try {
    
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        message: 'Minimal server working',
        timestamp: new Date().toISOString()
      });
    });
    
    await Database.connect();
    
    const server = app.listen(PORT, () => {
    });
    
    // Prevent exit
    setInterval(() => {
    }, 5000);
    
    // Handle shutdown
    process.on('SIGTERM', () => {
      server.close(() => process.exit(0));
    });
    
    process.on('SIGINT', () => {
      server.close(() => process.exit(0));
    });
    
    
  } catch (error) {
    console.error('❌ Error in minimal server:', error);
    process.exit(1);
  }
}

startMinimalServer(); 