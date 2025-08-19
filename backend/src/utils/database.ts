import mongoose from 'mongoose';
import winston from 'winston';

const DB_CONNECTION_TIMEOUT = 30000;
const DB_HEARTBEAT_FREQUENCY = 10000;
const DB_SERVER_SELECTION_TIMEOUT = 5000;

interface DatabaseConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

/**
 * Database connection utility class
 */
export class Database {
  private static instance: Database;
  private isConnected = false;
  
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    Database.instance = this;
  }
  
  /**
   * Connect to MongoDB database
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        winston.info('Database already connected');
        return;
      }
      
      const dbConfig = this.getDatabaseConfig();
      
      await mongoose.connect(dbConfig.uri, dbConfig.options);
      
      this.isConnected = true;
      winston.info('Connected to MongoDB database successfully');
      
      this.setupEventListeners();
    } catch (error) {
      winston.error('Database connection failed:', error);
      throw error;
    }
  }
  
  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        winston.info('Database already disconnected');
        return;
      }
      
      await mongoose.disconnect();
      this.isConnected = false;
      winston.info('Disconnected from MongoDB database');
    } catch (error) {
      winston.error('Database disconnection failed:', error);
      throw error;
    }
  }
  
  /**
   * Get database configuration
   */
  private getDatabaseConfig(): DatabaseConfig {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    const options: mongoose.ConnectOptions = {
      connectTimeoutMS: DB_CONNECTION_TIMEOUT,
      heartbeatFrequencyMS: DB_HEARTBEAT_FREQUENCY,
      serverSelectionTimeoutMS: DB_SERVER_SELECTION_TIMEOUT,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      bufferCommands: false,
    };
    
    return { uri, options };
  }
  
  /**
   * Setup mongoose event listeners
   */
  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      winston.info('Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (error) => {
      winston.error('Mongoose connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      winston.warn('Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      winston.info('Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });
    
    process.on('SIGINT', async () => {
      try {
        await this.disconnect();
        winston.info('Database connection closed through app termination');
        process.exit(0);
      } catch (error) {
        winston.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });
  }
  
  /**
   * Check if database is connected
   */
  isDBConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
  
  /**
   * Get mongoose connection instance
   */
  getConnection(): mongoose.Connection {
    return mongoose.connection;
  }
}

export default new Database(); 