import React from 'react';
import type { AppProps } from 'next/app';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../components/AuthProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/globals.css';

/**
 * Main App component with error boundary and global providers
 */
const App: React.FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Component {...pageProps} />
        <Toaster 
          position="top-right" 
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '14px',
              maxWidth: '500px',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
            loading: {
              iconTheme: {
                primary: '#3B82F6',
                secondary: '#fff',
              },
            },
          }} 
        />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App; 