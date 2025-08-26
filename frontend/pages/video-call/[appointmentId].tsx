import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuthContext } from '../../components/AuthProvider';
import { apiClient } from '../../lib/api';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  CameraIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  VideoCameraSlashIcon
} from '@heroicons/react/24/solid';

interface Appointment {
  _id: string;
  patientId: {
    firstName: string;
    lastName: string;
  };
  doctorId: {
    firstName: string;
    lastName: string;
    specialization: string;
  };
  appointmentDate: string;
  consultationType: string;
  symptoms: string;
  status: string;
  fee: number;
}

const VideoCallPage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthContext();
  
  // Extract appointmentId from URL - works with static exports
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  
  useEffect(() => {
    // For static exports, router.query might not be immediately available
    // Extract from window location as fallback
    if (router.query.appointmentId) {
      setAppointmentId(router.query.appointmentId as string);
    } else if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const segments = path.split('/');
      const id = segments[segments.length - 1];
      if (id && id !== 'video-call') {
        setAppointmentId(id);
      }
    }
  }, [router.query.appointmentId, router.isReady]);
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Track if we should block redirects while loading
  const [allowRedirect, setAllowRedirect] = useState(false);
  
  // Handle authentication manually without ProtectedRoute - with new tab support
  useEffect(() => {
    console.log('🔐 Video Call Page - Auth Status:', { 
      isLoading, 
      isAuthenticated, 
      user: user ? `${user.firstName} ${user.lastName}` : 'null',
      userRole: user?.role,
      hasToken: typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : 'server',
      appointmentId,
      allowRedirect
    });
    
    // Don't redirect - just stay on video call page and let auth load
    console.log('📍 Staying on video call page, appointmentId:', appointmentId);
  }, [isLoading, isAuthenticated, user, router, appointmentId, allowRedirect]);
  const [callStarted, setCallStarted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [participants, setParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (appointmentId && user) {
      fetchAppointmentDetails();
    }
  }, [appointmentId, user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStarted) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStarted]);

  const fetchAppointmentDetails = async () => {
    try {
      console.log('🔍 Fetching appointment details for:', appointmentId);
      const response = await apiClient.get(`/appointments/${appointmentId}`);
      
      if (response.data.success) {
        setAppointment(response.data.data);
        
        // Check if user has permission to join this call
        const apt = response.data.data;
        
        // Debug logging to see what we're working with
        console.log('🐛 DEBUG - Current user:', user);
        console.log('🐛 DEBUG - User ID:', (user as any)?._id);
        console.log('🐛 DEBUG - Appointment data:', apt);
        
        // Simplified authorization - if backend returned the appointment, user is authorized
        console.log('✅ Appointment loaded successfully - user is authorized by backend');
        
        // Extract user info for display purposes (no authorization needed here)
        const userId = (user as any)?._id?.toString();
        console.log('🔐 SIMPLIFIED AUTH CHECK:', {
          userId,
          userRole: user?.role,
          appointmentId: apt._id,
          message: 'Backend already validated access - proceeding with call setup'
        });

        // Add current user to participants
        setParticipants([user?.firstName + ' ' + user?.lastName || 'User']);
      } else {
        console.error('❌ Appointment not found in response:', response.data);
        setError('Appointment not found');
      }
    } catch (error) {
      console.error('❌ Error fetching appointment:', error);
      if ((error as any)?.response?.status === 401) {
        setError('You are not authorized to view this appointment');
      } else if ((error as any)?.response?.status === 404) {
        setError('Appointment not found');
      } else {
        setError('Failed to load appointment details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startCall = async () => {
    try {
      console.log('🎬 Starting video call...');
      console.log('👤 User role:', user?.role);
      console.log('📋 Appointment:', appointment);
      
      // In a real implementation, you would initialize the video call service here
      // For now, we'll simulate starting the call
      setCallStarted(true);
      console.log('✅ Call started - showing video interface');
      
      // Simulate other participant joining after a delay
      setTimeout(() => {
        if (appointment) {
          let otherParticipant: string;
          
          if (user?.role === 'patient') {
            // Patient side - show doctor
            if (typeof (appointment as any).doctor === 'object') {
              otherParticipant = `Dr. ${(appointment as any).doctor.firstName} ${(appointment as any).doctor.lastName}`;
            } else {
              otherParticipant = 'Doctor';
            }
          } else {
            // Doctor side - show patient
            if (typeof (appointment as any).patient === 'object') {
              otherParticipant = `${(appointment as any).patient.firstName} ${(appointment as any).patient.lastName}`;
            } else {
              otherParticipant = 'Patient';
            }
          }
          
          console.log('👥 Adding participant:', otherParticipant);
          setParticipants(prev => [...prev, otherParticipant]);
        }
      }, 3000);

    } catch (error) {
      console.error('❌ Error starting call:', error);
    }
  };

  const endCall = async () => {
    try {
      console.log('🛑 Ending video call...');
      
      // End the video call
      setCallStarted(false);
      setParticipants([]);
      
      // Use the correct endpoint to end active video calls
      if (user?.role === 'doctor') {
        console.log('👩‍⚕️ Doctor ending call via /video-calls/end-active');
        await apiClient.post('/video-calls/end-active');
      } else {
        console.log('👥 Patient leaving call');
        // For patients, we just navigate away - doctor will end the call
      }
      
      console.log('✅ Call ended successfully, navigating to dashboard');
      // Navigate back to dashboard
      router.push(user?.role === 'patient' ? '/patient/dashboard' : '/doctor/dashboard');
    } catch (error) {
      console.error('❌ Error ending call:', error);
      // Still navigate back even if API call fails
      router.push(user?.role === 'patient' ? '/patient/dashboard' : '/doctor/dashboard');
    }
  };

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Debug logging
  console.log('🎥 VIDEO CALL PAGE STATE:', {
    appointmentId,
    user: user ? `${user.firstName} ${user.lastName} (${user.role})` : 'null',
    isLoading,
    isAuthenticated,
    allowRedirect,
    appointment: appointment ? `${appointment._id}` : 'null',
    callStarted,
    error,
    loading
  });

  // Show loading only if we don't have appointmentId yet
  if (!appointmentId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading video call...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <InformationCircleIcon className="h-16 w-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-bold mb-2">Cannot Join Call</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <div>
      <Head>
        <title>Video Call - aiDoc</title>
        <meta name="description" content="Video consultation with your doctor" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {!callStarted ? (
          // Pre-call screen
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <VideoCameraIcon className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Video Consultation</h1>
                <p className="text-gray-600">
                  {user?.role === 'patient' 
                    ? (typeof (appointment as any).doctor === 'object' 
                        ? `with Dr. ${(appointment as any).doctor.firstName} ${(appointment as any).doctor.lastName}`
                        : `with Doctor`)
                    : (typeof (appointment as any).patient === 'object' 
                        ? `with ${(appointment as any).patient.firstName} ${(appointment as any).patient.lastName}`
                        : `with Patient`)
                  }
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <ClockIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Appointment Time</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date((appointment as any).appointmentDate).toLocaleString()}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <UserIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Consultation For</span>
                  </div>
                  <p className="text-sm text-gray-600">{(appointment as any).symptoms}</p>
                </div>
              </div>

              <div className="flex space-x-4 mb-6">
                <button
                  onClick={toggleVideo}
                  className={`flex-1 p-3 rounded-lg border-2 ${
                    videoEnabled 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-red-500 bg-red-50 text-red-700'
                  }`}
                >
                  {videoEnabled ? (
                    <CameraIcon className="h-6 w-6 mx-auto" />
                  ) : (
                    <VideoCameraSlashIcon className="h-6 w-6 mx-auto" />
                  )}
                  <p className="text-sm mt-1">{videoEnabled ? 'Video On' : 'Video Off'}</p>
                </button>

                <button
                  onClick={toggleAudio}
                  className={`flex-1 p-3 rounded-lg border-2 ${
                    audioEnabled 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : 'border-red-500 bg-red-50 text-red-700'
                  }`}
                >
                  {audioEnabled ? (
                    <MicrophoneIcon className="h-6 w-6 mx-auto" />
                  ) : (
                    <MicrophoneIcon className="h-6 w-6 mx-auto" />
                  )}
                  <p className="text-sm mt-1">{audioEnabled ? 'Mic On' : 'Mic Off'}</p>
                </button>
              </div>

              <button
                onClick={startCall}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Join Call
              </button>
            </div>
          </div>
        ) : (
          // In-call screen
          <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
              <div>
                <h1 className="font-semibold">
                  {user?.role === 'patient' 
                    ? (typeof (appointment as any).doctor === 'object' 
                        ? `Dr. ${(appointment as any).doctor.firstName} ${(appointment as any).doctor.lastName}`
                        : `Doctor`)
                    : (typeof (appointment as any).patient === 'object' 
                        ? `${(appointment as any).patient.firstName} ${(appointment as any).patient.lastName}`
                        : `Patient`)
                  }
                </h1>
                <p className="text-sm text-gray-300">{formatDuration(callDuration)}</p>
              </div>
              <div className="text-sm text-gray-300">
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 bg-black relative">
              <div className="h-full flex items-center justify-center">
                <div className="bg-gray-800 rounded-lg p-8 text-white text-center">
                  <VideoCameraIcon className="h-24 w-24 mx-auto mb-4 text-gray-400" />
                  <h2 className="text-xl font-semibold mb-2">Video Call Active</h2>
                  <p className="text-gray-300">
                    In a real implementation, this would show the video feed
                  </p>
                  <div className="mt-4 space-y-1">
                    {participants.map((participant, index) => (
                      <p key={index} className="text-sm text-green-400">
                        ● {participant} {index === 0 ? '(You)' : ''}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-800 p-6">
              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={toggleAudio}
                  className={`p-4 rounded-full ${
                    audioEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
                  } text-white transition-colors`}
                >
                  {audioEnabled ? (
                    <MicrophoneIcon className="h-6 w-6" />
                  ) : (
                    <MicrophoneIcon className="h-6 w-6" />
                  )}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-full ${
                    videoEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
                  } text-white transition-colors`}
                >
                  {videoEnabled ? (
                    <VideoCameraIcon className="h-6 w-6" />
                  ) : (
                    <VideoCameraSlashIcon className="h-6 w-6" />
                  )}
                </button>

                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className="p-4 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="h-6 w-6" />
                </button>

                <button
                  onClick={endCall}
                  className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
                  title="End Call"
                >
                  <PhoneXMarkIcon className="h-6 w-6" />
                </button>
                
                {/* Debug info */}
                <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
                  <div>User: {user?.firstName} ({user?.role})</div>
                  <div>Call ID: {appointmentId}</div>
                  <div>Started: {callStarted ? 'Yes' : 'No'}</div>
                  <div>Participants: {participants.length}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallPage; 