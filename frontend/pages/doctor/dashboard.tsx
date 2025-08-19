import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useAuthContext } from '../../components/AuthProvider';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import VideoCall from '../../components/VideoCall';
import NotificationPanel from '../../components/NotificationPanel';
import PaymentProcessor from '../../components/PaymentProcessor';
import { apiClient } from '../../lib/api';
import {
  UsersIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  PhoneIcon,
  VideoCameraIcon,
  MapPinIcon,
  BellIcon,
  CreditCardIcon,
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  UserIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';

interface Appointment {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  doctor: {
    _id: string;
    firstName: string;
    lastName: string;
    specialization: string;
  };
  appointmentDate: string;
  timeSlot: string;
  symptoms: string;
  consultationType: 'video' | 'phone' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  fee: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  notes?: string;
  prescription?: string;
  diagnosis?: string;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  monthlyRevenue: number;
  averageRating: number;
  completedAppointments: number;
  pendingAppointments: number;
}

const DoctorDashboard: React.FC = () => {
  const { user, logout } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'patients' | 'payments' | 'analytics' | 'profile'>('overview');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    completedAppointments: 0,
    pendingAppointments: 0
  });
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [activeVideoCall, setActiveVideoCall] = useState<any>(null);
  const [showPaymentProcessor, setShowPaymentProcessor] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientMedicalRecords, setPatientMedicalRecords] = useState<any>({});
  const [patientPrescriptions, setPatientPrescriptions] = useState<any>({});
  const [patientReports, setPatientReports] = useState<any>({});
  const [loadingPatientData, setLoadingPatientData] = useState(false);

  // Profile management states
  const [profileData, setProfileData] = useState<any>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [consultationFee, setConsultationFee] = useState<number>(0);

  // Fetch appointments with useCallback to prevent re-creation
  const fetchAppointments = useCallback(async (): Promise<void> => {
    if (!user) {
      console.log('👤 No user found, skipping appointments fetch');
      return;
    }

    console.log('🔍 **DOCTOR DASHBOARD DEBUG**');
    console.log('User ID:', user._id);
    console.log('User Role:', user.role);
    console.log('User Email:', user.email);

    try {
      setLoading(true);
      console.log('📞 Making API call to /appointments...');
      
      const response = await apiClient.get('/appointments');
      console.log('✅ API Response received:', response.data);

      // Fix: The appointments are nested in response.data.data.appointments
      const appointmentsData = response.data.success 
        ? response.data.data.appointments  // ← Fixed: Extract the appointments array
        : (response.data || []);

      console.log('📊 Appointments data structure:', response.data.data);
      console.log('📋 Extracted appointments:', appointmentsData);

      const finalAppointments = Array.isArray(appointmentsData) 
        ? appointmentsData 
        : [];

      console.log('📋 Final appointments count:', finalAppointments.length);
      console.log('📋 Final appointments:', finalAppointments);

      setAppointments(finalAppointments);
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      console.error('❌ Error details:', error.response?.data);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch patients with useCallback to prevent re-creation
  const fetchPatients = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    try {
      setLoadingPatientData(true);
      const response = await apiClient.get('/medical-records/my-patients');
      
      if (response.data.success) {
        setPatients(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoadingPatientData(false);
    }
  }, [user]);

  // Fetch notification count with useCallback
  const fetchNotificationCount = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    try {
      const response = await apiClient.get('/notifications/count');
      if (response.data.success) {
        setNotificationCount(response.data.data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  }, [user]);

  // Fetch patient medical data with useCallback
  const fetchPatientMedicalData = useCallback(async (patientId: string): Promise<void> => {
    if (!patientId) return;
    
    try {
      const [recordsRes, prescriptionsRes, reportsRes] = await Promise.all([
        apiClient.get(`/medical-records/patient/${patientId}`),
        apiClient.get(`/prescriptions/patient/${patientId}`),
        apiClient.get(`/reports/patient/${patientId}`)
      ]);

      if (recordsRes.data.success) {
        setPatientMedicalRecords(prev => ({
          ...prev,
          [patientId]: recordsRes.data.data
        }));
      }

      if (prescriptionsRes.data.success) {
        setPatientPrescriptions(prev => ({
          ...prev,
          [patientId]: prescriptionsRes.data.data
        }));
      }

      if (reportsRes.data.success) {
        setPatientReports(prev => ({
          ...prev,
          [patientId]: reportsRes.data.data
        }));
      }
    } catch (error) {
      console.error('Error fetching patient medical data:', error);
    }
  }, []);

  // Fetch profile data
  const fetchProfile = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    try {
      setProfileLoading(true);
      const response = await apiClient.get('/users/profile');
      
      if (response.data.success) {
        const profile = response.data.data;
        setProfileData(profile);
        setConsultationFee(profile.consultationFee || 0);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfileError('Failed to load profile data');
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // Update consultation fee
  const updateConsultationFee = async (newFee: number): Promise<void> => {
    try {
      setProfileLoading(true);
      setProfileError('');
      setProfileSuccess('');
      
      const response = await apiClient.put('/users/profile', {
        consultationFee: newFee
      });
      
      if (response.data.success) {
        setConsultationFee(newFee);
        setProfileData(prev => ({ ...prev, consultationFee: newFee }));
        setProfileSuccess('Consultation fee updated successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setProfileSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error updating consultation fee:', error);
      setProfileError('Failed to update consultation fee');
    } finally {
      setProfileLoading(false);
    }
  };

  // Updated getPatientData function using real data
  const getPatientData = () => {
    return patients.map(patientData => ({
      ...patientData.patient,
      lastAppointment: patientData.lastAppointment,
      totalAppointments: patientData.totalAppointments,
      medicalRecords: patientMedicalRecords[patientData.patient._id] || [],
      prescriptions: patientPrescriptions[patientData.patient._id] || [],
      reports: patientReports[patientData.patient._id] || []
    }));
  };

  // Fixed useEffect with proper dependencies to prevent multiple calls
  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchPatients();
      fetchNotificationCount();
      fetchProfile();
    }
  }, [user, fetchAppointments, fetchPatients, fetchNotificationCount, fetchProfile]);

  // Add useEffect to fetch patient medical data when a patient is selected
  useEffect(() => {
    if (selectedPatient && selectedPatient._id) {
      fetchPatientMedicalData(selectedPatient._id);
    }
  }, [selectedPatient, fetchPatientMedicalData]);

  // Fetch dashboard data
  const fetchDashboardData = async (): Promise<void> => {
    try {      
  
      setLoading(true);
      
      // Fetch appointments first
      await fetchAppointments();
      
      // Fetch patients
      await fetchPatients();

      // Fetch stats
      try {
        const statsResponse = await apiClient.get('/appointments/stats');
        
        if (statsResponse.data.success) {
          const statsData = statsResponse.data;
          setStats({
            totalPatients: statsData.data.total || 0,
            todayAppointments: statsData.data.upcoming || 0,
            monthlyRevenue: 25000, // Mock data
            averageRating: 4.8, // Mock data
            completedAppointments: statsData.data.completed || 0,
            pendingAppointments: statsData.data.upcoming || 0
          });
        }
      } catch (statsError) {
        console.warn('⚠️ Error fetching stats, using defaults:', statsError);
        // Use default stats if stats endpoint fails
        setStats({
          totalPatients: 0,
          todayAppointments: 0,
          monthlyRevenue: 0,
          averageRating: 0,
          completedAppointments: 0,
          pendingAppointments: 0
        });
      }

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setAppointments([]); // Ensure appointments is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const startVideoCall = async (appointmentId: string) => {
    try {
      const response = await apiClient.post('/video-calls', { appointmentId });

      if (response.data.success) {
        setActiveVideoCall({
          callId: response.data.data.callId,
          appointmentId
        });
      }
    } catch (error) {
      console.error('Error starting video call:', error);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const response = await apiClient.patch(`/appointments/${appointmentId}/status`, { status });

      if (response.data.success) {
        // Refresh appointments
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      case 'scheduled': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'in-progress': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                <p className="text-3xl font-bold text-gray-900">{stats.todayAppointments}</p>
              </div>
              <CalendarDaysIcon className="h-12 w-12 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPatients}</p>
              </div>
              <UsersIcon className="h-12 w-12 text-green-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
              </div>
              <BanknotesIcon className="h-12 w-12 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900">{stats.averageRating}</p>
              </div>
              <StarIcon className="h-12 w-12 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">Recent Appointments</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {appointments.slice(0, 5).map((appointment) => (
              <div key={appointment._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {appointment.patient?.firstName?.charAt(0) || 'P'}{appointment.patient?.lastName?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {appointment.patient?.firstName || 'Unknown'} {appointment.patient?.lastName || 'Patient'}
                    </p>
                    <p className="text-sm text-gray-600">{formatDate(appointment.appointmentDate)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>
                  {appointment.consultationType === 'video' && (
                    <button
                      onClick={() => startVideoCall(appointment._id)}
                      className="btn-primary text-sm"
                    >
                      Start Call
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppointments = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
          <div className="flex space-x-3">
            <select className="input-field">
              <option>All Appointments</option>
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6">
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments Found</h3>
              <p className="text-gray-600">You don't have any appointments scheduled yet.</p>
            </div>
          ) : (
            appointments.map((appointment) => {
              return (
                <div key={appointment._id} className="card">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {appointment.patient?.firstName?.charAt(0) || 'P'}{appointment.patient?.lastName?.charAt(0) || 'A'}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {appointment.patient?.firstName || 'Unknown'} {appointment.patient?.lastName || 'Patient'}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="h-4 w-4" />
                              <span>{formatDate(appointment.appointmentDate)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <PhoneIcon className="h-4 w-4" />
                              <span>{appointment.patient?.phoneNumber || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                        <span className="text-lg font-semibold text-gray-900">{formatCurrency(appointment.fee)}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Symptoms</h4>
                        <p className="text-gray-700 text-sm">{appointment.symptoms}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Consultation Type</h4>
                        <div className="flex items-center space-x-2">
                          {appointment.consultationType === 'video' && <VideoCameraIcon className="h-4 w-4 text-blue-500" />}
                          {appointment.consultationType === 'phone' && <PhoneIcon className="h-4 w-4 text-green-500" />}
                          {appointment.consultationType === 'in-person' && <MapPinIcon className="h-4 w-4 text-purple-500" />}
                          <span className="text-sm capitalize">{appointment.consultationType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="flex space-x-3">
                        <button className="btn-secondary text-sm">
                          View Details
                        </button>
                        <button className="btn-secondary text-sm">
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Add Notes
                        </button>
                      </div>
                      
                      <div className="flex space-x-3">
                        {appointment.status === 'scheduled' && (
                          <button
                            onClick={() => startVideoCall(appointment._id)}
                            className="btn-primary text-sm"
                          >
                            Start Call
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderPatients = () => {
    const patients = getPatientData();
    
    if (!selectedPatient) {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Patient Records</h2>
            <div className="text-sm text-gray-600">
              {patients.length} patient{patients.length !== 1 ? 's' : ''}
            </div>
          </div>

          {loadingPatientData ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading patient data...</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {patients.length === 0 ? (
                <div className="text-center py-12">
                  <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Patients Yet</h3>
                  <p className="text-gray-600">Patients you have appointments with will appear here.</p>
                </div>
              ) : (
                patients.map((patient: any) => (
                  <div key={patient._id} className="card cursor-pointer hover:shadow-lg transition-shadow" 
                       onClick={() => {
                         setSelectedPatient(patient);
                         fetchPatientMedicalData(patient._id);
                       }}>
                    <div className="card-body">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{patient.email}</span>
                              <span>{patient.phoneNumber}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {patient.totalAppointments} appointment{patient.totalAppointments !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500">
                            Last visit: {new Date(patient.lastAppointment).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <DocumentTextIcon className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                          <div className="text-sm font-medium text-gray-900">{patient.medicalRecords.length}</div>
                          <div className="text-xs text-gray-600">Records</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <DocumentTextIcon className="h-6 w-6 text-green-600 mx-auto mb-1" />
                          <div className="text-sm font-medium text-gray-900">{patient.prescriptions.length}</div>
                          <div className="text-xs text-gray-600">Prescriptions</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <DocumentTextIcon className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                          <div className="text-sm font-medium text-gray-900">{patient.reports.length}</div>
                          <div className="text-xs text-gray-600">Reports</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      );
    }

    // Selected patient detail view
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setSelectedPatient(null)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            ←
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedPatient.firstName} {selectedPatient.lastName}
            </h2>
            <p className="text-gray-600">{selectedPatient.email}</p>
          </div>
        </div>

        {/* Medical Records */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Records</h3>
            <div className="space-y-4">
              {patientMedicalRecords[selectedPatient._id]?.map((record: any) => (
                <div key={record.id} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{record.diagnosis}</h4>
                    <span className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2"><strong>Symptoms:</strong> {record.symptoms}</p>
                  <p className="text-sm text-gray-700 mb-2"><strong>Treatment:</strong> {record.treatment}</p>
                  <p className="text-sm text-gray-700 mb-2"><strong>Notes:</strong> {record.doctorNotes}</p>
                  {record.nextFollowUp && (
                    <p className="text-sm text-blue-600"><strong>Next Follow-up:</strong> {new Date(record.nextFollowUp).toLocaleDateString()}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prescriptions */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Prescriptions</h3>
            <div className="space-y-4">
              {patientPrescriptions[selectedPatient._id]?.map((prescription: any) => (
                <div key={prescription.id} className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{prescription.diagnosis}</h4>
                    <span className="text-sm text-gray-600">{new Date(prescription.date).toLocaleDateString()}</span>
                  </div>
                  <div className="space-y-2">
                    {prescription.medications.map((medication: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded border">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div><strong>Medication:</strong> {medication.name}</div>
                          <div><strong>Dosage:</strong> {medication.dosage}</div>
                          <div><strong>Frequency:</strong> {medication.frequency}</div>
                          <div><strong>Duration:</strong> {medication.duration}</div>
                          {medication.instructions && (
                            <div className="col-span-full"><strong>Instructions:</strong> {medication.instructions}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {prescription.nextFollowUp && (
                    <p className="text-sm text-green-600 mt-2"><strong>Next Follow-up:</strong> {new Date(prescription.nextFollowUp).toLocaleDateString()}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reports */}
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Reports</h3>
            <div className="space-y-4">
              {patientReports[selectedPatient._id]?.map((report: any) => (
                <div key={report.id} className="border-l-4 border-purple-500 bg-purple-50 p-4 rounded-r-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{report.name}</h4>
                      <p className="text-sm text-gray-600">
                        {report.type.replace('_', ' ').toUpperCase()} • {report.fileSize} • {new Date(report.uploadDate).toLocaleDateString()}
                      </p>
                      {report.results && (
                        <p className="text-sm text-gray-700 mt-2"><strong>Results:</strong> {report.results}</p>
                      )}
                    </div>
                    <button className="text-purple-600 hover:text-purple-800">
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Profile management component
  const renderProfile = () => {
    const handleFeeSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (consultationFee >= 0) {
        updateConsultationFee(consultationFee);
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Settings</h2>
          
          {/* Consultation Fee Management */}
          <div className="border-b border-gray-200 pb-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Consultation Fee</h3>
            
            {profileError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{profileError}</p>
              </div>
            )}
            
            {profileSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">{profileSuccess}</p>
              </div>
            )}
            
            <form onSubmit={handleFeeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Fee (₹)
                </label>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(Number(e.target.value))}
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter consultation fee"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {profileLoading ? 'Updating...' : 'Update Fee'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This fee will be shown to patients when they book appointments with you.
                </p>
              </div>
            </form>
          </div>
          
          {/* Basic Profile Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900">{profileData.firstName} {profileData.lastName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{profileData.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                <p className="text-gray-900">{profileData.specialization || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                <p className="text-gray-900">{profileData.experience || 0} years</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <p className="text-gray-900">{profileData.licenseNumber || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-gray-900">{profileData.phone || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      <Head>
        <title>Doctor Dashboard - aiDoc</title>
        <meta name="description" content="Doctor dashboard for managing patients and appointments" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">a</span>
                </div>
                <span className="text-xl font-bold gradient-text">aiDoc</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {notificationCount > 0 ? <BellIconSolid className="h-6 w-6" /> : <BellIcon className="h-6 w-6" />}
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </button>
                <span className="text-gray-700">Dr. {user?.firstName} {user?.lastName}</span>
                <button onClick={handleLogout} className="btn-secondary text-sm">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                { id: 'appointments', label: 'Appointments', icon: CalendarDaysIcon },
                { id: 'patients', label: 'Patients', icon: UsersIcon },
                { id: 'payments', label: 'Payments', icon: CreditCardIcon },
                { id: 'analytics', label: 'Analytics', icon: ArrowTrendingUpIcon },
                { id: 'profile', label: 'Profile', icon: UserIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'appointments' && renderAppointments()}
          {activeTab === 'patients' && renderPatients()}
          {activeTab === 'payments' && (
            <div className="text-center py-12">
              <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payments & Billing</h3>
              <p className="text-gray-600">Payment management features coming soon...</p>
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="text-center py-12">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Reports</h3>
              <p className="text-gray-600">Analytics dashboard coming soon...</p>
            </div>
          )}
          {activeTab === 'profile' && renderProfile()}
        </main>
      </div>

      {/* Video Call Modal */}
      {activeVideoCall && (
        <VideoCall
          callId={activeVideoCall.callId}
          appointmentId={activeVideoCall.appointmentId}
          userRole="host"
          onCallEnd={() => {
            setActiveVideoCall(null);
            fetchDashboardData();
          }}
          onError={(error) => {
            console.error('Video call error:', error);
            setActiveVideoCall(null);
          }}
        />
      )}

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNotificationClick={(notification) => {
          // Handle notification click
        }}
      />

      {/* Payment Processor Modal */}
      {showPaymentProcessor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
            <PaymentProcessor
              appointmentId={showPaymentProcessor.appointmentId}
              doctorId={(user as any)?._id || ''}
              amount={showPaymentProcessor.amount}
              onPaymentSuccess={(paymentId) => {
                setShowPaymentProcessor(null);
                fetchDashboardData();
              }}
              onPaymentFailure={(error) => {
                console.error('Payment failed:', error);
                setShowPaymentProcessor(null);
              }}
              onCancel={() => setShowPaymentProcessor(null)}
            />
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
};

export default DoctorDashboard; 