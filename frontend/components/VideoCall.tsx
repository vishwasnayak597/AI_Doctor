import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  VideoCameraIcon, 
  MicrophoneIcon, 
  PhoneXMarkIcon, 
  ComputerDesktopIcon,
  ChatBubbleLeftRightIcon,
  StopIcon,
  PlayIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  CameraIcon,
  XMarkIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { 
  VideoCameraIcon as VideoCameraIconSolid,
  MicrophoneIcon as MicrophoneIconSolid 
} from '@heroicons/react/24/solid';
import { apiClient } from '../lib/api';

interface VideoCallProps {
  callId: string;
  appointmentId: string;
  userRole: 'host' | 'guest';
  onCallEnd: () => void;
  onError: (error: string) => void;
}

interface CallState {
  isConnected: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  participants: number;
  duration: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

interface Message {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
}

const VideoCall: React.FC<VideoCallProps> = ({
  callId,
  appointmentId,
  userRole,
  onCallEnd,
  onError
}) => {
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    isRecording: false,
    participants: 1,
    duration: 0,
    quality: 'good'
  });

  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const durationInterval = useRef<NodeJS.Timeout>();

  // Initialize video call
  useEffect(() => {
    initializeCall();
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [callId]);

  const initializeCall = async () => {
    try {
      setIsLoading(true);
      
      // Get access token
      const response = await apiClient.post(`/video-calls/${callId}/token`, {
        role: userRole
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get access token');
      }

      setAccessToken(response.data.data.token);

      // Initialize mock video streams for demo
      await initializeMockVideoStreams();
      
      setCallState(prev => ({ ...prev, isConnected: true }));
      startDurationTimer();
      
    } catch (error) {
      console.error('Error initializing call:', error);
      onError(error instanceof Error ? error.message : 'Failed to initialize call');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMockVideoStreams = async () => {
    try {
      // Get user media (camera and microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Simulate remote stream for demo
      if (remoteVideoRef.current) {
        // In a real implementation, this would be the remote participant's stream
        remoteVideoRef.current.src = 'data:video/mp4;base64,'; // Placeholder
      }

    } catch (error) {
      console.error('Error accessing media devices:', error);
      onError('Failed to access camera/microphone');
    }
  };

  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    // In real implementation, mute/unmute audio stream
  };

  const toggleCamera = () => {
    setCallState(prev => ({ ...prev, isCameraOff: !prev.isCameraOff }));
    // In real implementation, enable/disable video stream
  };

  const toggleScreenShare = async () => {
    try {
      if (callState.isScreenSharing) {
        // Stop screen sharing
        setCallState(prev => ({ ...prev, isScreenSharing: false }));
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true 
        });
        setCallState(prev => ({ ...prev, isScreenSharing: true }));
        
        // In real implementation, replace video stream with screen stream
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      onError('Failed to share screen');
    }
  };

  const toggleRecording = async () => {
    try {
      if (callState.isRecording) {
        // Stop recording
        const response = await apiClient.post(`/video-calls/${callId}/recording/stop`, {
          recordingId: 'mock-recording-id'
        });

        if (response.data.success) {
          setCallState(prev => ({ ...prev, isRecording: false }));
        }
      } else {
        // Start recording
        const response = await apiClient.post(`/video-calls/${callId}/recording/start`, {});

        if (response.data.success) {
          setCallState(prev => ({ ...prev, isRecording: true }));
        }
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      onError('Failed to toggle recording');
    }
  };

  const endCall = async () => {
    try {
      await apiClient.post(`/video-calls/${callId}/end`, {});

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      onCallEnd();
    } catch (error) {
      console.error('Error ending call:', error);
      onCallEnd(); // End call anyway
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        sender: 'You',
        message: newMessage.trim(),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connecting to video call...</h3>
          <p className="text-gray-600">Please wait while we establish the connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h3 className="text-white font-semibold">Video Consultation</h3>
          <div className="flex items-center space-x-2 text-gray-300">
            <ClockIcon className="h-4 w-4" />
            <span className="text-sm">{formatDuration(callState.duration)}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-300">
            <UserGroupIcon className="h-4 w-4" />
            <span className="text-sm">{callState.participants} participants</span>
          </div>
          <div className={`text-sm ${getQualityColor(callState.quality)}`}>
            Quality: {callState.quality}
          </div>
        </div>
        <button
          onClick={() => setShowChat(!showChat)}
          className="text-white hover:text-blue-400 transition-colors"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className={`${showChat ? 'w-3/4' : 'w-full'} relative bg-gray-900`}>
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
          />
          
          {/* Local Video */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {callState.isCameraOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <CameraIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Screen Share Indicator */}
          {callState.isScreenSharing && (
            <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
              Screen Sharing Active
            </div>
          )}

          {/* Recording Indicator */}
          {callState.isRecording && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Recording</span>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-1/4 bg-white border-l border-gray-300 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h4 className="font-semibold text-gray-900">Chat</h4>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div ref={chatRef} className="flex-1 p-4 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="mb-3">
                  <div className="text-sm text-gray-600 mb-1">
                    {message.sender} • {message.timestamp.toLocaleTimeString()}
                  </div>
                  <div className="bg-gray-100 rounded-lg p-2 text-sm">
                    {message.message}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 input-field"
                />
                <button onClick={sendMessage} className="btn-primary px-4">
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-4">
        <div className="flex justify-center space-x-4">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition-colors ${
              callState.isMuted 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {callState.isMuted ? (
              <SpeakerXMarkIcon className="h-6 w-6 text-white" />
            ) : (
              <MicrophoneIconSolid className="h-6 w-6 text-white" />
            )}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full transition-colors ${
              callState.isCameraOff 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <VideoCameraIconSolid className="h-6 w-6 text-white" />
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              callState.isScreenSharing 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <ComputerDesktopIcon className="h-6 w-6 text-white" />
          </button>

          {userRole === 'host' && (
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-full transition-colors ${
                callState.isRecording 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {callState.isRecording ? (
                <StopIcon className="h-6 w-6 text-white" />
              ) : (
                <PlayIcon className="h-6 w-6 text-white" />
              )}
            </button>
          )}

          <button
            onClick={endCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
          >
            <PhoneXMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall; 