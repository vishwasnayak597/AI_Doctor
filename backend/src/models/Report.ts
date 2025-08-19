import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  patient: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  doctor?: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  title: string;
  type: 'blood_test' | 'xray' | 'mri' | 'ct_scan' | 'ultrasound' | 'lab_report' | 'prescription' | 'discharge_summary' | 'other';
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadDate: Date;
  reportDate?: Date;
  status: 'pending' | 'reviewed' | 'archived';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  doctorNotes?: string;
  tags?: string[];
  isSharedWithDoctor: boolean;
  sharedWith?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  appointment: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['blood_test', 'xray', 'mri', 'ct_scan', 'ultrasound', 'lab_report', 'prescription', 'discharge_summary', 'other'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  reportDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'archived'],
    default: 'pending'
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  doctorNotes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  isSharedWithDoctor: {
    type: Boolean,
    default: true
  },
  sharedWith: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
ReportSchema.index({ patient: 1, uploadDate: -1 });
ReportSchema.index({ doctor: 1, uploadDate: -1 });
ReportSchema.index({ type: 1 });
ReportSchema.index({ status: 1 });
ReportSchema.index({ uploadedBy: 1 });

// Virtual for file URL
ReportSchema.virtual('fileUrl').get(function() {
  return `/api/reports/${this._id}/download`;
});

export const Report = mongoose.model<IReport>('Report', ReportSchema); 