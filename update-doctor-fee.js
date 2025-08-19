const { MongoClient } = require('mongodb');

async function updateDoctorFee() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('📁 Connected to MongoDB');
    
    const db = client.db('aidoc');
    const users = db.collection('users');
    
    // Update the doctor's consultation fee to exactly 200
    const result = await users.updateOne(
      { _id: require('mongodb').ObjectId('68a07e02b2530d879b2fde81') },
      { $set: { consultationFee: 200 } }
    );
    
    console.log('💰 Updated doctor fee to 200:', result.modifiedCount, 'documents modified');
    
    // Verify the update
    const doctor = await users.findOne({ _id: require('mongodb').ObjectId('68a07e02b2530d879b2fde81') });
    console.log('✅ Doctor fee is now:', doctor.consultationFee);
    
  } catch (error) {
    console.error('❌ Error updating fee:', error);
  } finally {
    await client.close();
  }
}

updateDoctorFee(); 