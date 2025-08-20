import express from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { auth } from '../middleware/auth';
import { Report } from '../models/Report';
import { Appointment } from '../models/Appointment';

// Extend Express Request interface to include file property from multer
interface MulterRequest extends express.Request {
  file?: any;
}

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for allowed file types
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// @desc    Upload a report
// @route   POST /api/reports/upload
// @access  Private (Patient or Doctor)
router.post('/upload', auth, upload.single('report'), async (req: MulterRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { role } = req.user!;
    const {
      title,
      type,
      description,
      reportDate,
      patientId,
      appointmentId,
      tags
    } = req.body;

    // Determine patient ID
    let actualPatientId = req.user!._id;
    if (role === 'doctor' && patientId) {
      // Doctor uploading for a patient
      actualPatientId = patientId;
      
      // Verify doctor has appointments with this patient
      const hasAppointment = await Appointment.findOne({
        doctor: req.user!._id,
        patient: patientId
      });
      
      if (!hasAppointment) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'You can only upload reports for your patients' });
      }
    }

    const report = new Report({
      patient: actualPatientId,
      uploadedBy: req.user!._id,
      doctor: role === 'doctor' ? req.user!._id : undefined,
      appointment: appointmentId,
      title,
      type,
      description,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      reportDate: reportDate ? new Date(reportDate) : undefined,
      tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : []
    });

    await report.save();
    await report.populate([
      { path: 'patient', select: 'firstName lastName email' },
      { path: 'uploadedBy', select: 'firstName lastName role' },
      { path: 'doctor', select: 'firstName lastName specialization' }
    ]);

    res.status(201).json({
      success: true,
      data: report,
      message: 'Report uploaded successfully'
    });
  } catch (error) {
    // Clean up uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error uploading report:', error);
    res.status(500).json({ message: 'Server error during file upload' });
  }
});

// @desc    Get reports for current patient
// @route   GET /api/reports/my-reports
// @access  Private (Patient only)
router.get('/my-reports', auth, async (req, res) => {
  try {
    const { role } = req.user!;
    
    if (role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can view their own reports' });
    }

    const reports = await Report.find({ patient: req.user!._id })
      .populate([
        { path: 'uploadedBy', select: 'firstName lastName role' },
        { path: 'doctor', select: 'firstName lastName specialization' },
        { path: 'appointment', select: 'appointmentDate consultationType' }
      ])
      .sort({ uploadDate: -1 });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get reports for a patient (doctor view)
// @route   GET /api/reports/patient/:patientId
// @access  Private (Doctor only)
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { role } = req.user!;
    const { patientId } = req.params;
    
    if (role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can view patient reports' });
    }

    // Check if doctor has appointments with this patient
    const hasAppointment = await Appointment.findOne({
      doctor: req.user!._id,
      patient: patientId
    });

    if (!hasAppointment) {
      return res.status(403).json({ message: 'You can only view reports for your patients' });
    }

    const reports = await Report.find({ 
      patient: patientId,
      isSharedWithDoctor: true
    })
      .populate([
        { path: 'patient', select: 'firstName lastName email' },
        { path: 'uploadedBy', select: 'firstName lastName role' },
        { path: 'doctor', select: 'firstName lastName specialization' },
        { path: 'appointment', select: 'appointmentDate consultationType' }
      ])
      .sort({ uploadDate: -1 });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching patient reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Download a report file
// @route   GET /api/reports/:id/download
// @access  Private (Patient or Doctor)
router.get('/:id/download', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const { role } = req.user!;
    
    // Check permissions
    if (role === 'patient' && report.patient.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (role === 'doctor') {
      // Check if doctor has appointments with this patient
      const hasAppointment = await Appointment.findOne({
        doctor: req.user!._id,
        patient: report.patient
      });
      
      if (!hasAppointment) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    // Check if file exists
    if (!fs.existsSync(report.filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', report.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(report.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete a report
// @route   DELETE /api/reports/:id
// @access  Private (Patient or Doctor who uploaded)
router.delete('/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    const { role } = req.user!;
    
    // Check permissions - only the uploader or patient can delete
    if (role === 'patient' && report.patient.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (role === 'doctor' && report.uploadedBy.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete file from filesystem
    if (fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }

    // Delete from database
    await Report.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update report status/notes (doctor only)
// @route   PUT /api/reports/:id/review
// @access  Private (Doctor only)
router.put('/:id/review', auth, async (req, res) => {
  try {
    const { role } = req.user!;
    
    if (role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can review reports' });
    }

    const { status, doctorNotes } = req.body;
    
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if doctor has appointments with this patient
    const hasAppointment = await Appointment.findOne({
      doctor: req.user!._id,
      patient: report.patient
    });

    if (!hasAppointment) {
      return res.status(403).json({ message: 'You can only review reports for your patients' });
    }

    report.status = status || report.status;
    report.doctorNotes = doctorNotes;
    report.reviewedBy = (req.user as any)._id;
    report.reviewedAt = new Date();

    await report.save();
    await report.populate([
      { path: 'patient', select: 'firstName lastName email' },
      { path: 'uploadedBy', select: 'firstName lastName role' },
      { path: 'reviewedBy', select: 'firstName lastName specialization' }
    ]);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 