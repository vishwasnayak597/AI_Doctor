export interface BaseUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    isActive: boolean;
    isEmailVerified?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Patient extends BaseUser {
    role: 'patient';
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other';
    bloodGroup?: string;
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
    };
    medicalHistory?: string[];
    allergies?: string[];
}
export interface Doctor extends BaseUser {
    role: 'doctor';
    specialization?: string;
    licenseNumber?: string;
    experience?: number;
    qualifications?: string[];
    consultationFee?: number;
    isVerified?: boolean;
    rating?: number;
    reviewCount?: number;
    bio?: string;
    availability?: DoctorAvailability[];
    location?: DoctorLocation;
}
export interface Admin extends BaseUser {
    role: 'admin';
    permissions?: string[];
}
export type User = Patient | Doctor | Admin;
export interface DoctorAvailability {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
}
export interface DoctorLocation {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}
export interface Appointment {
    id: string;
    patientId: string;
    doctorId: string;
    scheduledAt: Date;
    duration: number;
    type: 'in-person' | 'video' | 'phone';
    status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
    symptoms?: string;
    notes?: string;
    prescription?: Prescription;
    paymentId?: string;
    videoRoomId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Prescription {
    id: string;
    appointmentId: string;
    medications: Medication[];
    instructions: string;
    validUntil?: Date;
    createdAt: Date;
}
export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
}
export interface SymptomCheckRequest {
    symptoms: string[];
    age: number;
    gender: 'male' | 'female' | 'other';
    medicalHistory?: string[];
    currentMedications?: string[];
}
export interface SymptomCheckResponse {
    possibleConditions: PossibleCondition[];
    recommendations: Recommendation[];
    urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
    disclaimer: string;
}
export interface PossibleCondition {
    name: string;
    probability: number;
    description: string;
    symptoms: string[];
}
export interface Recommendation {
    type: 'self-care' | 'otc-medication' | 'consult-doctor' | 'emergency';
    title: string;
    description: string;
    urgency: 'low' | 'medium' | 'high' | 'emergency';
}
export interface Payment {
    id: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    paymentMethod: 'stripe' | 'razorpay';
    transactionId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface Notification {
    id: string;
    userId: string;
    type: 'appointment' | 'reminder' | 'prescription' | 'system';
    title: string;
    message: string;
    isRead: boolean;
    scheduledFor?: Date;
    createdAt: Date;
}
export interface VideoRoom {
    id: string;
    appointmentId: string;
    roomName: string;
    accessToken: string;
    status: 'created' | 'active' | 'ended';
    createdAt: Date;
}
export declare const USER_ROLES: readonly ["patient", "doctor", "admin"];
export declare const APPOINTMENT_STATUSES: readonly ["scheduled", "confirmed", "in-progress", "completed", "cancelled", "no-show"];
export declare const APPOINTMENT_TYPES: readonly ["in-person", "video", "phone"];
export declare const PAYMENT_STATUSES: readonly ["pending", "processing", "completed", "failed", "refunded"];
export declare const URGENCY_LEVELS: readonly ["low", "medium", "high", "emergency"];
//# sourceMappingURL=index.d.ts.map