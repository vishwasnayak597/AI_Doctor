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
  
  useEffect(() => {
    console.log('🚀 VIDEO CALL PAGE LOADED!');
  }, []);
  
  console.log('🚀 VIDEO CALL PAGE COMPONENT LOADED - TIMESTAMP:', new Date().toISOString());
  console.log('👤 INITIAL AUTH STATE:', { 
    user: user ? `${user.firstName} ${user.lastName} (${user.role})` : 'null',
    isLoading, 
    isAuthenticated,
    routerQuery: router.query,
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'server'
  });
  
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
  
  // Authentication check - NO REDIRECTS, just logging
  useEffect(() => {
    console.log('🔐 Video Call Page - Auth Status:', { 
      isLoading, 
      isAuthenticated, 
      user: user ? `${user.firstName} ${user.lastName}` : 'null',
      userRole: user?.role,
      hasToken: typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : 'server',
      appointmentId
    });
    
    // Never redirect from video call page - just stay here
    console.log('📍 Video call page - staying here regardless of auth status');
  }, [isLoading, isAuthenticated, user, appointmentId]);
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

  // Auto-start call for doctors when they visit the video call page
  useEffect(() => {
    if (user?.role === 'doctor' && appointment && !callStarted) {
      console.log('🩺 Doctor detected - auto-starting video call interface');
      startCall();
    }
  }, [user, appointment, callStarted]);

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
    if (!appointmentId) {
      console.log('❌ No appointmentId provided');
      setError('No appointment ID provided');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
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
      // In a real implementation, you would initialize the video call service here
      // For now, we'll simulate starting the call
      setCallStarted(true);
      
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
          
          setParticipants(prev => [...prev, otherParticipant]);
        }
      }, 3000);

    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  const endCall = async () => {
    try {
      // End the video call
      setCallStarted(false);
      setParticipants([]);
      
      // In a real implementation, you would notify the backend and other participants
      if (appointment) {
        await apiClient.post(`/video-calls/${(appointment as any).videoCallId}/end`, {});
      }
      
      // Stay on video call page
      console.log('✅ Call ended successfully');
    } catch (error) {
      console.error('Error ending call:', error);
      // Stay on video call page even if API call fails
      console.log('❌ Call ended with error but staying on page');
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

  // Only show loading if auth is still loading AND we don't have a user yet
  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Loading video call for appointment {appointmentId}...
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Authenticating...
          </p>
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
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h1 className="text-xl font-bold mb-2">🎥 Video Call</h1>
          <p className="text-gray-300 mb-4">Loading appointment details...</p>
          <p className="text-sm text-gray-400">
            Appointment ID: {appointmentId || 'Loading...'}
          </p>
          <p className="text-sm text-gray-400">
            User: {user ? `${user.firstName} ${user.lastName} (${user.role})` : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Debug logging before render
  console.log('🎬 RENDER STATE:', {
    appointmentId,
    user: user ? `${user.firstName} ${user.lastName} (${user.role})` : 'null',
    appointment: appointment ? 'loaded' : 'null',
    callStarted,
    isLoading,
    loading,
    error
  });

  return (
    <div>
      <Head>
        <title>Video Call - aiDoc</title>
        <meta name="description" content="Video consultation with your doctor" />
      </Head>

      {/* Debug overlay */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'red',
        color: 'white',
        padding: '10px',
        zIndex: 9999,
        fontSize: '12px'
      }}>
        DEBUG: callStarted={callStarted ? 'true' : 'false'}, 
        appointment={appointment ? 'yes' : 'no'},
        user={user?.role || 'none'}
      </div>

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
                >
                  <PhoneXMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallPage; 