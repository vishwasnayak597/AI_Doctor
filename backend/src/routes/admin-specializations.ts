import express, { Request, Response } from 'express';
import User from '../models/User';

const router = express.Router();

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

/**
 * @route POST /api/admin/redistribute-specializations
 * @desc Redistribute doctor specializations evenly
 * @access Public (for now, should be admin only in production)
 */
router.post('/redistribute-specializations', async (req: Request, res: Response) => {
  try {
    console.log('🏥 Starting specialization redistribution...');
    
    // Find all doctors
    const doctors = await User.find({ role: 'doctor' });
    console.log(`📋 Found ${doctors.length} doctors in database`);
    
    if (doctors.length === 0) {
      return res.json({
        success: true,
        message: 'No doctors found to redistribute',
        data: { redistributed: 0, distribution: {} }
      });
    }
    
    // Calculate equal distribution
    const doctorsPerSpecialization = Math.floor(doctors.length / SPECIALIZATIONS.length);
    const extraDoctors = doctors.length % SPECIALIZATIONS.length;
    
    console.log(`📊 Distribution plan:`);
    console.log(`   - ${doctorsPerSpecialization} doctors per specialization`);
    console.log(`   - ${extraDoctors} specializations will get 1 extra doctor`);
    
    // Shuffle doctors array to ensure random distribution
    const shuffledDoctors = doctors.sort(() => Math.random() - 0.5);
    
    let doctorIndex = 0;
    let updatedCount = 0;
    const distribution: Record<string, number> = {};
    
    // Distribute doctors across specializations
    for (let i = 0; i < SPECIALIZATIONS.length; i++) {
      const specialization = SPECIALIZATIONS[i];
      const doctorCount = doctorsPerSpecialization + (i < extraDoctors ? 1 : 0);
      const fee = FEES_BY_SPECIALIZATION[specialization];
      
      distribution[specialization] = doctorCount;
      
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
          
          await User.findByIdAndUpdate(doctor._id, updateData);
          updatedCount++;
          
          console.log(`   ✓ ${doctor.firstName} ${doctor.lastName} (${doctor.email})`);
          doctorIndex++;
        }
      }
    }
    
    console.log(`✅ Successfully updated ${updatedCount} doctors`);
    
    res.json({
      success: true,
      message: `Successfully redistributed ${updatedCount} doctors across ${SPECIALIZATIONS.length} specializations`,
      data: {
        redistributed: updatedCount,
        distribution: distribution,
        specializations: SPECIALIZATIONS
      }
    });
    
  } catch (error) {
    console.error('❌ Error redistributing specializations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to redistribute specializations',
      details: error.message
    });
  }
});

/**
 * @route GET /api/admin/specialization-stats
 * @desc Get current specialization distribution
 * @access Public (for now, should be admin only in production)
 */
router.get('/specialization-stats', async (req: Request, res: Response) => {
  try {
    const stats: Record<string, number> = {};
    let totalDoctors = 0;
    
    for (const specialization of SPECIALIZATIONS) {
      const count = await User.countDocuments({ 
        role: 'doctor', 
        specialization: specialization 
      });
      stats[specialization] = count;
      totalDoctors += count;
    }
    
    // Count doctors with no specialization
    const noSpecialization = await User.countDocuments({ 
      role: 'doctor', 
      $or: [
        { specialization: { $exists: false } },
        { specialization: null },
        { specialization: '' }
      ]
    });
    
    if (noSpecialization > 0) {
      stats['No Specialization'] = noSpecialization;
      totalDoctors += noSpecialization;
    }
    
    res.json({
      success: true,
      message: 'Specialization statistics retrieved successfully',
      data: {
        totalDoctors,
        distribution: stats,
        availableSpecializations: SPECIALIZATIONS
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting specialization stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get specialization statistics'
    });
  }
});

export default router; 