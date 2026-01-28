'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your link...');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('No token provided');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (!response.ok) {
          setStatus('error');
          setMessage(result.error || 'Failed to verify link');
          return;
        }

        setStatus('success');
        setMessage('Successfully signed in! Redirecting...');

        setTimeout(() => {
          router.push('/');
        }, 1500);
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification');
        console.error(error);
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-slate-100 mb-4">
          {status === 'verifying' && '🔄 Verifying...'}
          {status === 'success' && '✅ Success!'}
          {status === 'error' && '❌ Error'}
        </h1>
        
        <p className="text-slate-300 mb-6">{message}</p>
        
        {status === 'verifying' && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {status === 'error' && (
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Home
          </button>
        )}
      </div>
    </div>
  );
}
