import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuthContext } from '../../components/AuthProvider';
import {
  VideoCameraIcon,
  MicrophoneIcon,
  PhoneXMarkIcon
} from '@heroicons/react/24/outline';
import {
  VideoCameraSlashIcon
} from '@heroicons/react/24/solid';

const SIMPLE_VIDEO_CALL_CONSTANTS = {
  MAX_RETRY_ATTEMPTS: 3,
  CALL_TIMEOUT_MS: 30000,
  USER_MEDIA_CONSTRAINTS: {
    video: { width: 640, height: 480 },
    audio: true
  }
};

const SimpleVideoCallPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthContext();
  const [appointmentId, setAppointmentId] = useState<string>('');
  
  // Video call states
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  
  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    console.log('🚀 SIMPLE VIDEO CALL PAGE LOADED');
    
    // Extract appointment ID from URL
    if (router.query.appointmentId) {
      setAppointmentId(router.query.appointmentId as string);
    } else if (typeof window !== 'undefined') {
      const pathSegments = window.location.pathname.split('/');
      const id = pathSegments[pathSegments.length - 1];
      if (id && id !== 'video-call') {
        setAppointmentId(id);
      }
    }
  }, [router.query.appointmentId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallActive]);

  const startCall = async (): Promise<void> => {
    try {
      console.log('🎥 Starting video call...');
      setConnectionStatus('Connecting...');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia(SIMPLE_VIDEO_CALL_CONSTANTS.USER_MEDIA_CONSTRAINTS);
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsCallActive(true);
      setConnectionStatus('Connected');
      console.log('✅ Video call started successfully');
      
      // Simulate remote user joining after 3 seconds
      setTimeout(() => {
        setConnectionStatus('Connected - Waiting for other participant');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error starting call:', error);
      setConnectionStatus('Error: Could not access camera/microphone');
    }
  };

  const endCall = (): void => {
    console.log('📞 Ending call...');
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsCallActive(false);
    setCallDuration(0);
    setConnectionStatus('Call ended');
    
    console.log('✅ Call ended');
  };

  const toggleVideo = (): void => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = (): void => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Head>
        <title>Video Call - aiDoc</title>
        <meta name="description" content="Video consultation" />
      </Head>

      <div className="min-h-screen bg-gray-900">
        {!isCallActive ? (
          // Pre-call screen
          <div className="flex items-center justify-center min-h-screen">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <VideoCameraIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Video Consultation
                </h1>
                <p className="text-gray-600 mb-6">
                  Ready to start your video call?
                </p>
                
                <div className="space-y-4 mb-6">
                  <div className="text-sm text-gray-500">
                    <p><strong>Appointment ID:</strong> {appointmentId || 'Loading...'}</p>
                    <p><strong>User:</strong> {user ? `${user.firstName} ${user.lastName} (${user.role})` : 'Loading...'}</p>
                    <p><strong>Status:</strong> {connectionStatus}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={startCall}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    🎥 Start Video Call
                  </button>
                  
                  <button
                    onClick={() => router.back()}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    ← Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // In-call screen
          <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
              <div>
                <h1 className="font-semibold">
                  Video Call - {user?.role === 'doctor' ? 'Doctor' : 'Patient'} View
                </h1>
                <p className="text-sm text-gray-300">
                  Duration: {formatDuration(callDuration)} | {connectionStatus}
                </p>
              </div>
              <div className="text-sm text-gray-300">
                Appointment: {appointmentId}
              </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 bg-black relative">
              <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                {/* Local Video (Your Video) */}
                <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    You ({user?.firstName})
                  </div>
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                      <VideoCameraSlashIcon className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Remote Video (Other Participant) */}
                <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    {user?.role === 'doctor' ? 'Patient' : 'Doctor'}
                  </div>
                  <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                    <div className="text-center text-white">
                      <VideoCameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p>Waiting for other participant...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-800 p-6">
              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={toggleAudio}
                  className={`p-4 rounded-full transition-colors ${
                    isAudioEnabled 
                      ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  <MicrophoneIcon className={`h-6 w-6 ${!isAudioEnabled ? 'opacity-50' : ''}`} />
                </button>

                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-full transition-colors ${
                    isVideoEnabled 
                      ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {isVideoEnabled ? (
                    <VideoCameraIcon className="h-6 w-6" />
                  ) : (
                    <VideoCameraSlashIcon className="h-6 w-6" />
                  )}
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
    </>
  );
};

export default SimpleVideoCallPage; 