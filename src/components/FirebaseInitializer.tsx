'use client';

import React, { useState } from 'react';
import { initializeFirebaseQuizzes, hasFirebaseQuizzes } from '@/lib/questions';
import { Loader2, Check, AlertCircle } from 'lucide-react';

/**
 * Component for initializing Firebase with quiz data
 * This is meant for admin use during development or initial setup
 */
export function FirebaseInitializer() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'initializing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleCheck = async () => {
    setStatus('checking');
    try {
      const hasData = await hasFirebaseQuizzes();
      if (hasData) {
        setStatus('success');
        setMessage('Firebase already has quiz data.');
      } else {
        setStatus('idle');
        setMessage('Firebase does not have quiz data. Click "Initialize" to upload hardcoded quizzes.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Failed to check Firebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleInitialize = async () => {
    setStatus('initializing');
    setMessage('Uploading hardcoded quizzes to Firebase...');

    try {
      const success = await initializeFirebaseQuizzes();
      if (success) {
        setStatus('success');
        setMessage('Successfully initialized Firebase with quiz data!');
      } else {
        setStatus('error');
        setMessage('Failed to initialize Firebase with quiz data.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
      case 'initializing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-400 border-green-500/30 bg-green-900/20';
      case 'error':
        return 'text-red-400 border-red-500/30 bg-red-900/20';
      case 'checking':
      case 'initializing':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';
      default:
        return 'text-gray-400 border-gray-500/30 bg-gray-800/20';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Firebase Quiz Data Initializer</h3>
      <p className="text-gray-400 text-sm mb-6">
        This tool helps initialize Firebase with the hardcoded quiz data.
        Use this during development or initial setup.
      </p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={handleCheck}
          disabled={status === 'checking' || status === 'initializing'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {status === 'checking' ? 'Checking...' : 'Check Firebase'}
        </button>
        <button
          onClick={handleInitialize}
          disabled={status === 'initializing' || status === 'checking'}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {status === 'initializing' ? 'Initializing...' : 'Initialize Firebase'}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm">{message}</span>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>• Check: Verifies if Firebase already contains quiz data</p>
        <p>• Initialize: Uploads hardcoded quizzes to Firebase (safe to run multiple times)</p>
        <p>• The app will automatically fall back to hardcoded data if Firebase is unavailable</p>
      </div>
    </div>
  );
}