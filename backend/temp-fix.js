// Quick fix for doctors API - JavaScript version
const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Simple doctor endpoint that works with our nested structure
router.get('/doctors', async (req, res) => {
  try {
    const User = mongoose.model('User');
    const doctors = await User.find(
      { role: 'doctor', isEmailVerified: true, isActive: true }
    ).lean();

    const transformedDoctors = doctors.map(doctor => ({
      _id: doctor._id,
      firstName: doctor.profile?.firstName,
      lastName: doctor.profile?.lastName,
      email: doctor.email,
      phone: doctor.profile?.phone,
      specialization: doctor.doctorProfile?.specialization,
      experience: doctor.doctorProfile?.experience,
      consultationFee: doctor.doctorProfile?.consultationFee,
      rating: doctor.doctorProfile?.rating,
      totalReviews: doctor.doctorProfile?.totalReviews,
      education: doctor.doctorProfile?.education,
      licenseNumber: doctor.doctorProfile?.licenseNumber,
      availability: doctor.doctorProfile?.availability,
      address: doctor.profile?.address,
      isOnline: doctor.isOnline || false
    }));

    res.json({
      success: true,
      message: 'Doctors retrieved successfully',
      data: transformedDoctors
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctors'
    });
  }
});

console.log('Working doctors endpoint code saved to temp-fix.js');
