import express from 'express';
import { auth } from '../middleware/auth';
import { MedicalRecord } from '../models/MedicalRecord';
import { Appointment } from '../models/Appointment';

const router = express.Router();

// @desc    Create a medical record
// @route   POST /api/medical-records
// @access  Private (Doctor only)
router.post('/', auth, async (req, res) => {
  try {
    const { role } = req.user!;
    
    if (role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can create medical records' });
    }

    const {
      patient,
      appointment,
      diagnosis,
      symptoms,
      treatment,
      notes,
      followUpRequired,
      followUpDate,
      vitals
    } = req.body;

    const medicalRecord = new MedicalRecord({
      patient,
      doctor: req.user!._id,
      appointment,
      diagnosis,
      symptoms,
      treatment,
      notes,
      followUpRequired,
      followUpDate,
      vitals
    });

    await medicalRecord.save();
    await medicalRecord.populate([
      { path: 'patient', select: 'firstName lastName email' },
      { path: 'doctor', select: 'firstName lastName specialization' }
    ]);

    res.status(201).json({
      success: true,
      data: medicalRecord
    });
  } catch (error) {
    console.error('Error creating medical record:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get medical records for a patient (doctor view)
// @route   GET /api/medical-records/patient/:patientId
// @access  Private (Doctor only)
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { role } = req.user!;
    const { patientId } = req.params;
    
    if (role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can view patient medical records' });
    }

    // Check if doctor has appointments with this patient
    const hasAppointment = await Appointment.findOne({
      doctor: req.user!._id,
      patient: patientId
    });

    if (!hasAppointment) {
      return res.status(403).json({ message: 'You can only view records for your patients' });
    }

    const medicalRecords = await MedicalRecord.find({ patient: patientId })
      .populate([
        { path: 'patient', select: 'firstName lastName email dateOfBirth gender bloodGroup' },
        { path: 'doctor', select: 'firstName lastName specialization' },
        { path: 'appointment', select: 'appointmentDate consultationType' }
      ])
      .sort({ date: -1 });

    res.json({
      success: true,
      data: medicalRecords
    });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get medical records for current patient
// @route   GET /api/medical-records/my-records
// @access  Private (Patient only)
router.get('/my-records', auth, async (req, res) => {
  try {
    const { role } = req.user!;
    
    if (role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can view their own medical records' });
    }

    const medicalRecords = await MedicalRecord.find({ patient: req.user!._id })
      .populate([
        { path: 'doctor', select: 'firstName lastName specialization' },
        { path: 'appointment', select: 'appointmentDate consultationType' }
      ])
      .sort({ date: -1 });

    res.json({
      success: true,
      data: medicalRecords
    });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all patients for a doctor (based on appointments)
// @route   GET /api/medical-records/my-patients
// @access  Private (Doctor only)
router.get('/my-patients', auth, async (req, res) => {
  try {
    const { role } = req.user!;
    
    if (role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can view their patients' });
    }

    // Get all unique patients who have appointments with this doctor
    const appointments = await Appointment.find({ doctor: req.user!._id })
      .populate('patient', 'firstName lastName email dateOfBirth gender bloodGroup phone')
      .sort({ createdAt: -1 });

    // Group by patient and get latest appointment info
    const patientsMap = new Map();
    
    appointments.forEach(appointment => {
      const patientId = appointment.patient._id.toString();
      if (!patientsMap.has(patientId)) {
        patientsMap.set(patientId, {
          patient: appointment.patient,
          totalAppointments: 1,
          lastAppointment: appointment.appointmentDate,
          appointmentHistory: [appointment]
        });
      } else {
        const existing = patientsMap.get(patientId);
        existing.totalAppointments += 1;
        existing.appointmentHistory.push(appointment);
        if (appointment.appointmentDate > existing.lastAppointment) {
          existing.lastAppointment = appointment.appointmentDate;
        }
      }
    });

    const patients = Array.from(patientsMap.values());

    res.json({
      success: true,
      data: patients
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update a medical record
// @route   PUT /api/medical-records/:id
// @access  Private (Doctor only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { role } = req.user!;
    
    if (role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can update medical records' });
    }

    const medicalRecord = await MedicalRecord.findOne({
      _id: req.params.id,
      doctor: req.user!._id
    });

    if (!medicalRecord) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    const updatedRecord = await MedicalRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'patient', select: 'firstName lastName email' },
      { path: 'doctor', select: 'firstName lastName specialization' }
    ]);

    res.json({
      success: true,
      data: updatedRecord
    });
  } catch (error) {
    console.error('Error updating medical record:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 