import mongoose, { Schema, Document } from 'mongoose';

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface IPrescription extends Document {
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  prescriptionNumber: string;
  date: Date;
  medications: IMedication[];
  generalInstructions?: string;
  validTill?: Date;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    required: true,
    trim: true
  },
  frequency: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    required: true,
    trim: true
  },
  instructions: {
    type: String,
    trim: true
  }
});

const PrescriptionSchema = new Schema({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  doctor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  appointment: {
    type: Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  prescriptionNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  medications: [MedicationSchema],
  generalInstructions: {
    type: String,
    trim: true
  },
  validTill: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate prescription number
PrescriptionSchema.pre('save', async function(next) {
  if (this.isNew && !this.prescriptionNumber) {
    const count = await mongoose.model('Prescription').countDocuments();
    this.prescriptionNumber = `RX${Date.now()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Indexes for better query performance
PrescriptionSchema.index({ patient: 1, date: -1 });
PrescriptionSchema.index({ doctor: 1, date: -1 });
PrescriptionSchema.index({ status: 1 });

export const Prescription = mongoose.model<IPrescription>('Prescription', PrescriptionSchema); 