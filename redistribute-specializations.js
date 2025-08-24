const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vish21:vish21@cluster0.q7goc.mongodb.net/aidoc?retryWrites=true&w=majority&appName=Cluster0';

const SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Dermatology', 
  'Pediatrics',
  'Orthopedics',
  'Psychiatry',
  'Radiology',
  'Surgery',
  'Gynecology',
  'Neurology',
  'Urology',
  'Dentistry',
  'Ophthalmology',
  'ENT (Ear, Nose & Throat)',
  'Oncology',
  'Gastroenterology'
];

const FEES_BY_SPECIALIZATION = {
  'General Medicine': 500,
  'Cardiology': 1200,
  'Dermatology': 800,
  'Pediatrics': 700,
  'Orthopedics': 1000,
  'Psychiatry': 900,
  'Radiology': 1100,
  'Surgery': 1500,
  'Gynecology': 800,
  'Neurology': 1300,
  'Urology': 1000,
  'Dentistry': 600,
  'Ophthalmology': 900,
  'ENT (Ear, Nose & Throat)': 700,
  'Oncology': 1500,
  'Gastroenterology': 1200
};

// Simple User schema for the script
const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema);

async function redistributeSpecializations() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all doctors
    const doctors = await User.find({ role: 'doctor' });
    console.log(`📋 Found ${doctors.length} doctors in database`);
    
    // Calculate equal distribution
    const doctorsPerSpecialization = Math.floor(doctors.length / SPECIALIZATIONS.length);
    const extraDoctors = doctors.length % SPECIALIZATIONS.length;
    
    console.log(`📊 Distribution plan:`);
    console.log(`   - ${doctorsPerSpecialization} doctors per specialization`);
    console.log(`   - ${extraDoctors} specializations will get 1 extra doctor`);
    
    // Shuffle doctors array to ensure random distribution
    const shuffledDoctors = doctors.sort(() => Math.random() - 0.5);
    
    let doctorIndex = 0;
    const updates = [];
    
    // Distribute doctors across specializations
    for (let i = 0; i < SPECIALIZATIONS.length; i++) {
      const specialization = SPECIALIZATIONS[i];
      const doctorCount = doctorsPerSpecialization + (i < extraDoctors ? 1 : 0);
      const fee = FEES_BY_SPECIALIZATION[specialization];
      
      console.log(`\n🏥 Assigning ${doctorCount} doctors to ${specialization} (Fee: ₹${fee})`);
      
      for (let j = 0; j < doctorCount; j++) {
        if (doctorIndex < shuffledDoctors.length) {
          const doctor = shuffledDoctors[doctorIndex];
          
          const updateData = {
            specialization: specialization,
            consultationFee: fee,
            experience: Math.floor(Math.random() * 25) + 5, // 5-30 years experience
            rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0 rating
            reviewCount: Math.floor(Math.random() * 200) + 10 // 10-210 reviews
          };
          
          updates.push({
            doctorId: doctor._id,
            updateData,
            doctorInfo: `${doctor.firstName} ${doctor.lastName} (${doctor.email})`
          });
          
          console.log(`   ✓ ${doctor.firstName} ${doctor.lastName} (${doctor.email})`);
          doctorIndex++;
        }
      }
    }
    
    // Apply all updates
    console.log(`\n🔄 Applying ${updates.length} updates...`);
    let updatedCount = 0;
    
    for (const update of updates) {
      await User.findByIdAndUpdate(update.doctorId, update.updateData);
      updatedCount++;
    }
    
    console.log(`✅ Successfully updated ${updatedCount} doctors`);
    
    // Verify the distribution
    console.log(`\n📈 Final distribution:`);
    for (const specialization of SPECIALIZATIONS) {
      const count = await User.countDocuments({ 
        role: 'doctor', 
        specialization: specialization 
      });
      console.log(`   ${specialization}: ${count} doctors`);
    }
    
    console.log('\n🎉 Specialization redistribution completed successfully!');
    
  } catch (error) {
    console.error('❌ Error redistributing specializations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed');
  }
}

redistributeSpecializations(); 