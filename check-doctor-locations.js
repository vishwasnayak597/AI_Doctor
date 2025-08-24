const mongoose = require('mongoose');

const PRODUCTION_MONGODB_URL = 'mongodb+srv://vishwas:passwordai5@cluster0.xvugw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

/**
 * Check current doctor location data structure
 */
async function checkDoctorLocations() {
  try {
    console.log('🔌 Connecting to production MongoDB...');
    await mongoose.connect(PRODUCTION_MONGODB_URL);
    console.log('✅ Connected to production MongoDB');

    // Get all doctors
    console.log('\n📋 Fetching all doctors...');
    const doctors = await mongoose.connection.db.collection('users').find({
      role: 'doctor',
      isEmailVerified: true
    }).toArray();

    console.log(`📊 Found ${doctors.length} doctors`);

    // Categorize by location data structure
    const stats = {
      hasDirectLocation: 0,
      hasProfileAddress: 0,
      hasBoth: 0,
      hasNeither: 0
    };

    console.log('\n🏥 **Doctor Location Data Structure Analysis**');
    console.log('=' .repeat(70));

    doctors.forEach((doctor, index) => {
      const hasDirectLocation = !!doctor.location;
      const hasProfileAddress = !!doctor.profile?.address;
      
      if (hasDirectLocation && hasProfileAddress) {
        stats.hasBoth++;
      } else if (hasDirectLocation) {
        stats.hasDirectLocation++;
      } else if (hasProfileAddress) {
        stats.hasProfileAddress++;
      } else {
        stats.hasNeither++;
      }

      // Show first few examples
      if (index < 5) {
        console.log(`\n👨‍⚕️ ${index + 1}. Dr. ${doctor.firstName} ${doctor.lastName}`);
        console.log(`   Email: ${doctor.email}`);
        console.log(`   Specialization: ${doctor.specialization || 'Not set'}`);
        console.log(`   Direct Location: ${hasDirectLocation ? '✅' : '❌'}`);
        console.log(`   Profile Address: ${hasProfileAddress ? '✅' : '❌'}`);
        
        if (hasDirectLocation) {
          console.log(`   📍 Location City: ${doctor.location.city}`);
          console.log(`   🗺️  Coordinates: lat=${doctor.location.coordinates?.latitude}, lng=${doctor.location.coordinates?.longitude}`);
        }
        
        if (hasProfileAddress) {
          console.log(`   📮 Profile City: ${doctor.profile.address.city}`);
          console.log(`   🌍 Profile Coords: ${JSON.stringify(doctor.profile.address.coordinates)}`);
        }
      }
    });

    console.log('\n📈 **Summary Statistics**');
    console.log('=' .repeat(50));
    console.log(`✅ Has Direct Location Field: ${stats.hasDirectLocation}`);
    console.log(`📁 Has Profile Address: ${stats.hasProfileAddress}`);
    console.log(`🔄 Has Both (Conflicting): ${stats.hasBoth}`);
    console.log(`❌ Has Neither: ${stats.hasNeither}`);
    console.log(`📊 Total Doctors: ${doctors.length}`);

    // Show a sample doctor with proper location structure
    const goodDoctor = doctors.find(d => d.location && d.location.city && d.location.coordinates);
    if (goodDoctor) {
      console.log('\n✨ **Sample Doctor with Proper Location Structure**');
      console.log('=' .repeat(50));
      console.log(`👨‍⚕️ Dr. ${goodDoctor.firstName} ${goodDoctor.lastName}`);
      console.log(`📍 City: ${goodDoctor.location.city}, ${goodDoctor.location.state}`);
      console.log(`🏠 Address: ${goodDoctor.location.address}`);
      console.log(`📮 Zip: ${goodDoctor.location.zipCode}`);
      console.log(`🗺️  Coordinates: lat=${goodDoctor.location.coordinates?.latitude}, lng=${goodDoctor.location.coordinates?.longitude}`);
    }

  } catch (error) {
    console.error('❌ Error checking doctor locations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkDoctorLocations(); 