import React from 'react';
import Head from 'next/head';

const TestVideoPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Test Video Page - aiDoc</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              ✅ TEST PAGE WORKS!
            </h1>
            <p className="text-gray-600 mb-6">
              If you can see this page, the deployment is working!
            </p>
            <p className="text-sm text-gray-500">
              Timestamp: {new Date().toISOString()}
            </p>
            
            <button 
              onClick={() => alert('JavaScript is working!')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Test JavaScript
            </button>
            
            <div className="mt-4">
              <a 
                href="/video-call/68aae708fc4d8b90de6b35f7"
                className="text-blue-600 hover:underline"
              >
                → Go to Video Call Page
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TestVideoPage; 