const mongoose = require('mongoose');

const PRODUCTION_MONGODB_URL = 'mongodb+srv://vishwas:passwordai5@cluster0.xvugw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

/**
 * Complete migration of remaining doctors from profile.address to location field
 */
async function completeMigration() {
  try {
    console.log('🔌 Connecting to production MongoDB...');
    await mongoose.connect(PRODUCTION_MONGODB_URL);
    console.log('✅ Connected to production MongoDB');

    // Find doctors that still have profile.address but no location
    console.log('\n🔍 Finding remaining doctors to migrate...');
    const remainingDoctors = await mongoose.connection.db.collection('users').find({
      role: 'doctor',
      'profile.address': { $exists: true },
      location: { $exists: false }
    }).toArray();

    console.log(`📊 Found ${remainingDoctors.length} doctors remaining to migrate`);

    if (remainingDoctors.length === 0) {
      console.log('✨ All doctors have been migrated successfully!');
      return;
    }

    console.log('\n🚀 **Completing Migration**');
    console.log('=' .repeat(50));

    let migratedCount = 0;

    for (const doctor of remainingDoctors) {
      try {
        const profileAddress = doctor.profile.address;
        
        // Create the location structure without causing indexing conflicts
        const locationData = {
          address: profileAddress.street || `Medical Center, ${profileAddress.city}`,
          city: profileAddress.city || 'Mumbai',
          state: profileAddress.state || 'Maharashtra',
          zipCode: profileAddress.pincode || '400001'
        };

        // Add coordinates if available, with proper format
        if (profileAddress.coordinates && Array.isArray(profileAddress.coordinates)) {
          locationData.coordinates = {
            latitude: profileAddress.coordinates[0] || 19.0760,
            longitude: profileAddress.coordinates[1] || 72.8777
          };
        }

        // Update just the location field first, without unsetting profile.address
        const updateResult = await mongoose.connection.db.collection('users').updateOne(
          { _id: doctor._id },
          { $set: { location: locationData } }
        );

        if (updateResult.matchedCount > 0) {
          migratedCount++;
          console.log(`✅ ${migratedCount}. Migrated Dr. ${doctor.firstName || 'Unknown'} ${doctor.lastName || 'Doctor'}`);
          console.log(`   📍 ${locationData.city}, ${locationData.state}`);
          console.log(`   🏠 ${locationData.address}`);
          
          if (locationData.coordinates) {
            console.log(`   🗺️  Coordinates: ${locationData.coordinates.latitude}, ${locationData.coordinates.longitude}`);
          }
          console.log('');
        } else {
          console.log(`❌ Failed to migrate doctor: ${doctor.email}`);
        }

      } catch (error) {
        console.error(`❌ Error migrating doctor ${doctor.email}:`, error.message);
      }
    }

    console.log('\n🎉 **Migration Complete!**');
    console.log('=' .repeat(50));
    console.log(`✅ Successfully migrated: ${migratedCount}/${remainingDoctors.length} doctors`);

    // Now let's verify the final state
    console.log('\n🔍 **Verifying Final State**');
    const finalStats = await mongoose.connection.db.collection('users').aggregate([
      { $match: { role: 'doctor', isEmailVerified: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          hasLocation: { 
            $sum: { 
              $cond: [{ $ifNull: ['$location', false] }, 1, 0] 
            } 
          },
          hasProfileAddress: { 
            $sum: { 
              $cond: [{ $ifNull: ['$profile.address', false] }, 1, 0] 
            } 
          }
        }
      }
    ]).toArray();

    if (finalStats.length > 0) {
      const stats = finalStats[0];
      console.log(`📊 Total Doctors: ${stats.total}`);
      console.log(`✅ Have Location Field: ${stats.hasLocation}`);
      console.log(`📁 Have Profile Address: ${stats.hasProfileAddress}`);
      console.log(`🎯 Migration Success Rate: ${Math.round((stats.hasLocation / stats.total) * 100)}%`);
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
completeMigration(); 