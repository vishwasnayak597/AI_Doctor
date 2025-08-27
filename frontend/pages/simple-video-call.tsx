import React, { useState } from 'react';
import Head from 'next/head';

const SimpleVideoCallPage: React.FC = () => {
  const [showInterface, setShowInterface] = useState<boolean>(false);

  console.log('🚀 SIMPLE VIDEO CALL PAGE LOADED SUCCESSFULLY');

  return (
    <>
      <Head>
        <title>Simple Video Call - aiDoc</title>
      </Head>

      <div className="min-h-screen bg-gray-900 text-white">
        {!showInterface ? (
          // Pre-call screen
          <div className="flex items-center justify-center min-h-screen">
            <div className="bg-white text-gray-900 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="text-4xl mb-4">🎥</div>
                <h1 className="text-2xl font-bold mb-4">
                  Simple Video Call Test
                </h1>
                <p className="text-gray-600 mb-6">
                  This is a test to see if video call pages work at all.
                </p>
                
                <button
                  onClick={() => {
                    console.log('✅ Start call button clicked!');
                    setShowInterface(true);
                  }}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold mb-4"
                >
                  🎥 Test Start Call
                </button>

                <div className="text-sm text-gray-500">
                  <p>Timestamp: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Call interface
          <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 text-white p-4">
              <h1 className="text-xl font-semibold">✅ Call Interface Loaded!</h1>
              <p className="text-sm text-gray-300">This proves the video call interface can work</p>
            </div>

            {/* Video Area */}
            <div className="flex-1 bg-black flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">📹</div>
                <h2 className="text-2xl font-bold mb-2">Video Call Active</h2>
                <p className="text-gray-300 mb-4">
                  This is a simple test interface
                </p>
                <div className="bg-gray-800 rounded-lg p-4 inline-block">
                  <p className="text-sm">✅ Interface loads correctly</p>
                  <p className="text-sm">✅ JavaScript works</p>
                  <p className="text-sm">✅ State management works</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-800 p-6">
              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={() => alert('Mute button works!')}
                  className="p-4 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors"
                >
                  🎤
                </button>

                <button
                  onClick={() => alert('Video button works!')}
                  className="p-4 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors"
                >
                  📹
                </button>

                <button
                  onClick={() => {
                    console.log('✅ End call clicked');
                    setShowInterface(false);
                  }}
                  className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  📞
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