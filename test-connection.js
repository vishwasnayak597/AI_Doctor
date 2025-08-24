const mongoose = require('mongoose');

// Try the exact URI format
const MONGODB_URI = 'mongodb+srv://vish21:vish21@cluster0.q7goc.mongodb.net/aidoc';

async function testConnection() {
  try {
    console.log('🔌 Testing MongoDB connection...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
    
    // Simple User schema
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', UserSchema);
    
    const doctorCount = await User.countDocuments({ role: 'doctor' });
    console.log(`📋 Found ${doctorCount} doctors in database`);
    
    // Get first doctor to check current data
    const firstDoctor = await User.findOne({ role: 'doctor' });
    console.log('👨‍⚕️ Sample doctor data:');
    console.log('  Name:', firstDoctor?.firstName, firstDoctor?.lastName);
    console.log('  Email:', firstDoctor?.email);
    console.log('  Specialization:', firstDoctor?.specialization || 'NOT SET');
    console.log('  Fee:', firstDoctor?.consultationFee || 'NOT SET');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed');
  }
}

testConnection(); 