'use client';

import React from 'react';

interface SecurityChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SecurityChallengeModal({ isOpen, onClose }: SecurityChallengeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Security Alert
          </h2>
          
          <p className="text-center text-gray-600 dark:text-gray-300">
            For your security, this action was flagged. Please try again.
          </p>
          
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

