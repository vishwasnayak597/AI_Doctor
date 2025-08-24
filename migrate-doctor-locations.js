const mongoose = require('mongoose');

const PRODUCTION_MONGODB_URL = 'mongodb+srv://vishwas:passwordai5@cluster0.xvugw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

/**
 * Migrate doctor locations from profile.address structure to direct location field
 */
async function migrateDoctorLocations() {
  try {
    console.log('🔌 Connecting to production MongoDB...');
    await mongoose.connect(PRODUCTION_MONGODB_URL);
    console.log('✅ Connected to production MongoDB');

    // Find all doctors that have profile.address but no location field
    console.log('\n🔍 Finding doctors with profile.address structure...');
    const doctorsWithProfileAddress = await mongoose.connection.db.collection('users').find({
      role: 'doctor',
      'profile.address': { $exists: true },
      location: { $exists: false }
    }).toArray();

    console.log(`📊 Found ${doctorsWithProfileAddress.length} doctors to migrate`);

    if (doctorsWithProfileAddress.length === 0) {
      console.log('✨ No doctors need migration. Checking current structure...');
      
      // Show current location structure for a few doctors
      const sampleDoctors = await mongoose.connection.db.collection('users').find({
        role: 'doctor'
      }).limit(3).toArray();

      sampleDoctors.forEach((doctor, index) => {
        console.log(`\n👨‍⚕️ Sample Doctor ${index + 1}:`);
        console.log(`   Name: Dr. ${doctor.firstName} ${doctor.lastName}`);
        console.log(`   Profile Address:`, doctor.profile?.address ? 'EXISTS' : 'NOT EXISTS');
        console.log(`   Direct Location:`, doctor.location ? 'EXISTS' : 'NOT EXISTS');
        
        if (doctor.location) {
          console.log(`   Location City:`, doctor.location.city);
          console.log(`   Location Coordinates:`, doctor.location.coordinates);
        }
        if (doctor.profile?.address) {
          console.log(`   Profile Address City:`, doctor.profile.address.city);
          console.log(`   Profile Address Coordinates:`, doctor.profile.address.coordinates);
        }
      });
      
      return;
    }

    console.log('\n🚀 **Starting Migration Process**');
    console.log('=' .repeat(50));

    let migratedCount = 0;

    for (const doctor of doctorsWithProfileAddress) {
      const profileAddress = doctor.profile.address;
      
      // Migrate to the correct location structure
      const locationData = {
        address: profileAddress.street || 'Medical Center',
        city: profileAddress.city || 'Mumbai',
        state: profileAddress.state || 'Maharashtra',
        zipCode: profileAddress.pincode || '400001',
        coordinates: {
          latitude: profileAddress.coordinates?.[0] || 19.0760,
          longitude: profileAddress.coordinates?.[1] || 72.8777
        }
      };

      // Update the doctor document
      const updateResult = await mongoose.connection.db.collection('users').updateOne(
        { _id: doctor._id },
        { 
          $set: { location: locationData },
          $unset: { 'profile.address': 1 }
        }
      );

      if (updateResult.matchedCount > 0) {
        migratedCount++;
        console.log(`✅ ${migratedCount}. Migrated Dr. ${doctor.firstName} ${doctor.lastName}`);
        console.log(`   📍 ${profileAddress.city}, ${profileAddress.state}`);
        console.log(`   🏠 ${profileAddress.street}`);
        console.log('');
      } else {
        console.log(`❌ Failed to migrate doctor: ${doctor.email}`);
      }
    }

    console.log('\n🎉 **Migration Summary**');
    console.log('=' .repeat(50));
    console.log(`✅ Total doctors migrated: ${migratedCount}/${doctorsWithProfileAddress.length}`);
    console.log('🔄 Data structure updated from profile.address to location field');
    console.log('📍 Location coordinates converted from array to object format');

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateDoctorLocations(); 