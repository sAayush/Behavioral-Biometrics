'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventContext';
import { predictAnomaly } from '@/lib/api';
import { SecurityChallengeModal } from '@/components/SecurityChallengeModal';

export default function DashboardPage() {
  const router = useRouter();
  const { authData, logout } = useAuth();
  const { getLastEvents } = useEvents();
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Mock account balance
  const accountBalance = 10000;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTransferSuccess(false);

    try {
      // Get the last 20 events from the global event listener
      const eventsToSend = getLastEvents(20);

      if (!authData) {
        throw new Error('Not authenticated');
      }

      // Call prediction API
      const prediction = await predictAnomaly(authData.user_id, eventsToSend);

      if (prediction.is_anomalous) {
        // Show security challenge modal
        setShowSecurityModal(true);
        setLoading(false);
      } else {
        // Proceed with transfer
        // In a real app, this would call the actual transfer API
        console.log('Transfer approved:', { recipient, amount });
        setTransferSuccess(true);
        setShowTransferForm(false);
        setRecipient('');
        setAmount('');
        setLoading(false);
        
        // Reset success message after 3 seconds
        setTimeout(() => setTransferSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Transfer failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              SecureBank
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {authData?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Balance Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Account Balance
            </h2>
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              ${accountBalance.toLocaleString()}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Available balance
            </p>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Quick Actions
            </h2>
            <button
              onClick={() => setShowTransferForm(!showTransferForm)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {showTransferForm ? 'Cancel Transfer' : 'Transfer Money'}
            </button>
          </div>
        </div>

        {/* Transfer Form */}
        {showTransferForm && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Transfer Money
            </h2>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recipient Email
                </label>
                <input
                  id="recipient"
                  type="email"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="recipient@example.com"
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount ($)
                </label>
                <input
                  id="amount"
                  type="number"
                  required
                  min="0.01"
                  max={accountBalance}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              {transferSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Transfer successful! ${amount} sent to {recipient}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Processing...' : 'Confirm Transfer'}
              </button>
            </form>
          </div>
        )}

        {/* Recent Transactions (Mock) */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Recent Transactions
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Initial Deposit</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
              </div>
              <p className="text-green-600 dark:text-green-400 font-medium">+$10,000.00</p>
            </div>
          </div>
        </div>
      </main>

      <SecurityChallengeModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />
    </div>
  );
}

