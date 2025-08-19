import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { AppointmentService, CreateAppointmentRequest, PrescriptionData, RatingData } from '../services/AppointmentService';
import { authenticate } from '../middleware/auth';
import mongoose from 'mongoose';
import {Appointment} from '../models/Appointment';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const router = Router();

router.post('/', [
  authenticate,
  body('doctorId').notEmpty().isMongoId(),
  body('appointmentDate').notEmpty().isISO8601(),
  body('consultationType').isIn(['in-person', 'video', 'phone']),
  body('symptoms').isLength({ min: 10, max: 1000 }),
  body('specialization').notEmpty(),
  body('fee').isFloat({ min: 0 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array().map(err => err.msg).join(', ') });
    }

    const appointmentData: CreateAppointmentRequest = {
      patientId: req.user!._id.toString(),
      doctorId: req.body.doctorId,
      appointmentDate: new Date(req.body.appointmentDate),
      duration: req.body.duration,
      consultationType: req.body.consultationType,
      symptoms: req.body.symptoms,
      specialization: req.body.specialization,
      fee: req.body.fee
    };

    const appointment = await AppointmentService.createAppointment(appointmentData);
    res.status(201).json({ success: true, data: appointment, message: 'Appointment created successfully' });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create appointment' });
  }
});

router.get('/', [authenticate], async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const userRole = req.user!.role;
    const userId = req.user!._id.toString();

    const filters: any = {};
    if (userRole === 'patient') filters.patientId = userId;
    else if (userRole === 'doctor') filters.doctorId = userId;
    
    if (req.query.status) filters.status = req.query.status;
    if (req.query.consultationType) filters.consultationType = req.query.consultationType;
    if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
    if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

    const result = await AppointmentService.getAppointments(filters, page, limit);
    res.json({ success: true, data: result, message: 'Appointments retrieved successfully' });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch appointments' });
  }
});

router.get('/stats', [authenticate], async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const role = req.user!.role;

    if (role !== 'patient' && role !== 'doctor') {
      return res.status(403).json({ success: false, error: 'Only patients and doctors can access appointment statistics' });
    }

    const stats = await AppointmentService.getAppointmentStats(userId, role);
    res.json({ success: true, data: stats, message: 'Appointment statistics retrieved successfully' });
  } catch (error) {
    console.error('Error fetching appointment stats:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch appointment statistics' });
  }
});

router.get('/:id', [authenticate, param('id').isMongoId()], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array().map(err => err.msg).join(', ') });
    }

    const appointment = await AppointmentService.getAppointmentById(req.params.id, req.user!._id.toString());
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    res.json({ success: true, data: appointment, message: 'Appointment retrieved successfully' });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch appointment' });
  }
});

router.patch('/:id/status', [
  authenticate,
  param('id').isMongoId(),
  body('status').isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array().map(err => err.msg).join(', ') });
    }

    const appointment = await AppointmentService.updateAppointmentStatus(req.params.id, req.body.status, req.user!._id.toString());
    res.json({ success: true, data: appointment, message: 'Appointment status updated successfully' });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update appointment status' });
  }
});

// PUT route to update appointment payment information
router.put('/:id', [
  authenticate,
  param('id').isMongoId(),
  body('paymentId').optional().isString(),
  body('paymentStatus').optional().isIn(['pending', 'paid', 'refunded'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array().map(err => err.msg).join(', ') });
    }

    const appointment = await AppointmentService.updateAppointmentPayment(
      req.params.id, 
      req.user!._id.toString(),
      req.body.paymentId,
      req.body.paymentStatus
    );
    
    res.json({ success: true, data: appointment, message: 'Appointment updated successfully' });
  } catch (error) {
    console.error('Error updating appointment payment:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to update appointment payment' });
  }
});

router.post('/:id/cancel', [authenticate, param('id').isMongoId()], async (req: Request, res: Response) => {
  try {
    const appointment = await AppointmentService.cancelAppointment(req.params.id, req.user!._id.toString(), req.body.reason);
    res.json({ success: true, data: appointment, message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to cancel appointment' });
  }
});

router.post('/:id/prescription', [
  authenticate,
  param('id').isMongoId(),
  body('medications').isArray({ min: 1 }),
  body('diagnosis').notEmpty().isLength({ min: 5, max: 500 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array().map(err => err.msg).join(', ') });
    }

    if (req.user!.role !== 'doctor') {
      return res.status(403).json({ success: false, error: 'Only doctors can add prescriptions' });
    }

    const prescriptionData: PrescriptionData = {
      medications: req.body.medications,
      diagnosis: req.body.diagnosis,
      notes: req.body.notes
    };

    const appointment = await AppointmentService.addPrescription(req.params.id, prescriptionData, req.user!._id.toString());
    res.json({ success: true, data: appointment, message: 'Prescription added successfully' });
  } catch (error) {
    console.error('Error adding prescription:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to add prescription' });
  }
});

router.post('/:id/rating', [
  authenticate,
  param('id').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array().map(err => err.msg).join(', ') });
    }

    const ratingData: RatingData = {
      rating: req.body.rating,
      review: req.body.review
    };

    const appointment = await AppointmentService.addRating(req.params.id, ratingData, req.user!._id.toString());
    res.json({ success: true, data: appointment, message: 'Rating added successfully' });
  } catch (error) {
    console.error('Error adding rating:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to add rating' });
  }
});

// GET route to check available time slots for a doctor
router.get('/availability/:doctorId/:date', async (req: Request, res: Response) => {
  try {
    const { doctorId, date } = req.params;
    
    // Validate doctor ID
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, error: 'Invalid doctor ID' });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Create date range for the entire day
    const startDate = new Date(date + 'T00:00:00.000Z');
    const endDate = new Date(date + 'T23:59:59.999Z');

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      return res.status(400).json({ success: false, error: 'Cannot check availability for past dates' });
    }

    // Find all existing appointments for this doctor on this date
    const existingAppointments = await Appointment.find({
      doctor: new mongoose.Types.ObjectId(doctorId),
      appointmentDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: { $in: ['scheduled', 'confirmed'] }
    }).select('appointmentDate duration');

    // Define available time slots (can be made configurable per doctor later)
    const allTimeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
      '17:00', '17:30', '18:00', '18:30'
    ];

    // Check each slot for conflicts
    const availableSlots = allTimeSlots.filter(timeSlot => {
      const slotDateTime = new Date(date + 'T' + timeSlot + ':00.000Z');
      
      // If it's today, check if the slot is in the future
      if (startDate.toDateString() === today.toDateString()) {
        const now = new Date();
        if (slotDateTime <= now) {
          return false; // Past time slot
        }
      }

      // Check for conflicts with existing appointments
      const hasConflict = existingAppointments.some(appointment => {
        const appointmentStart = new Date(appointment.appointmentDate);
        const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.duration || 30) * 60000);
        const slotEnd = new Date(slotDateTime.getTime() + 30 * 60000); // 30 min default slot
        
        // Check if slots overlap
        return (slotDateTime < appointmentEnd && slotEnd > appointmentStart);
      });

      return !hasConflict;
    });

    res.json({
      success: true,
      data: {
        date,
        doctorId,
        allSlots: allTimeSlots,
        availableSlots,
        bookedSlots: allTimeSlots.filter(slot => !availableSlots.includes(slot))
      }
    });

  } catch (error) {
    console.error('Error checking appointment availability:', error);
    res.status(500).json({ success: false, error: 'Server error while checking availability' });
  }
});

export default router; 