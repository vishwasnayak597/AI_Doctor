const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://vishwas:passwordai5@cluster0.xvugw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// User Schema matching backend
const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    gender: String,
    dateOfBirth: Date,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  doctorProfile: {
    specialization: String,
    licenseNumber: String,
    experience: Number,
    education: String,
    consultationFee: Number,
    availability: [{
      day: String,
      startTime: String,
      endTime: String
    }],
    rating: Number,
    totalReviews: Number
  },
  isEmailVerified: Boolean,
  isActive: Boolean
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function viewCurrentDoctors() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all doctors with full data
    const doctors = await User.find({ role: 'doctor' });
    
    console.log('👨‍⚕️ CURRENT DOCTORS IN DATABASE:');
    console.log('=' .repeat(100));
    
    doctors.forEach((doctor, index) => {
      console.log(`${index + 1}. Doctor ID: ${doctor._id}`);
      console.log(`   Email: ${doctor.email}`);
      console.log(`   Profile:`, JSON.stringify(doctor.profile, null, 2));
      console.log(`   Doctor Profile:`, JSON.stringify(doctor.doctorProfile, null, 2));
      console.log(`   Is Active: ${doctor.isActive}`);
      console.log(`   Is Verified: ${doctor.isEmailVerified}`);
      console.log('   ---');
    });

    console.log('\n🔍 WHAT FRONTEND SHOULD RECEIVE:');
    console.log('=' .repeat(100));
    
    doctors.forEach((doctor, index) => {
      const frontendFormat = {
        _id: doctor._id,
        name: `${doctor.profile?.firstName || 'MISSING'} ${doctor.profile?.lastName || 'MISSING'}`,
        specialization: doctor.doctorProfile?.specialization || 'MISSING',
        consultationFee: doctor.doctorProfile?.consultationFee || 'MISSING',
        rating: doctor.doctorProfile?.rating || 'MISSING',
        totalReviews: doctor.doctorProfile?.totalReviews || 'MISSING',
        email: doctor.email
      };
      
      console.log(`${index + 1}.`, JSON.stringify(frontendFormat, null, 2));
    });

  } catch (error) {
    console.error('❌ Error viewing doctors:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

viewCurrentDoctors(); 