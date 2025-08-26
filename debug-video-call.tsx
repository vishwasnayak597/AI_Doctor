import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuthContext } from '../frontend/components/AuthProvider';

const DebugVideoCall = () => {
  const router = useRouter();
  const { appointmentId } = router.query;
  const { user, isLoading, isAuthenticated } = useAuthContext();
  
  useEffect(() => {
    console.log('🐛 DEBUG VIDEO CALL PAGE LOADED');
    console.log('Appointment ID:', appointmentId);
    console.log('User:', user);
    console.log('Is Loading:', isLoading);
    console.log('Is Authenticated:', isAuthenticated);
    console.log('Router query:', router.query);
    console.log('Current path:', router.asPath);
  }, [appointmentId, user, isLoading, isAuthenticated, router]);

  return (
    <div>
      <Head>
        <title>Debug Video Call - aiDoc</title>
      </Head>
      
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-3xl font-bold mb-4">🐛 Debug Video Call Page</h1>
        
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">Debug Info:</h2>
          <p>Appointment ID: {appointmentId || 'Loading...'}</p>
          <p>User: {user ? `${user.firstName} ${user.lastName} (${user.role})` : 'Loading...'}</p>
          <p>Is Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>Is Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          <p>Current Path: {router.asPath}</p>
          <p>Page loaded at: {new Date().toISOString()}</p>
        </div>
        
        <div className="mt-4">
          <p className="text-green-400">✅ Page successfully loaded without redirects!</p>
          <p className="text-sm text-gray-400">If you see this, the video call page is working.</p>
        </div>
      </div>
    </div>
  );
};

export default DebugVideoCall; 