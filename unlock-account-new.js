const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aiDoc';

async function unlockAccount() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Reset login attempts and remove lock for the test account
    const result = await usersCollection.updateOne(
      { email: 'vishwaspower5@gmail.com' },
      {
        $unset: {
          loginAttempts: 1,
          lockUntil: 1
        }
      }
    );
    
    if (result.matchedCount === 0) {
      console.log('❌ User not found');
    } else if (result.modifiedCount === 0) {
      console.log('ℹ️ User was already unlocked');
    } else {
      console.log('✅ Account unlocked successfully!');
      console.log('📊 Login attempts reset, lock removed');
    }
    
    // Check current status
    const user = await usersCollection.findOne(
      { email: 'vishwaspower5@gmail.com' },
      { projection: { email: 1, loginAttempts: 1, lockUntil: 1, isActive: 1 } }
    );
    
    if (user) {
      console.log('\n📋 Current user status:');
      console.log(`Email: ${user.email}`);
      console.log(`Active: ${user.isActive}`);
      console.log(`Login attempts: ${user.loginAttempts || 0}`);
      console.log(`Lock until: ${user.lockUntil ? new Date(user.lockUntil) : 'Not locked'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

unlockAccount(); 