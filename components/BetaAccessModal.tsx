import React, { useState } from 'react';
import { BetaTestingManager } from '../lib/beta-testing';
import { User } from '../types';

interface BetaAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  t: (key: string) => string;
}

export const BetaAccessModal: React.FC<BetaAccessModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  t
}) => {
  const [accessCode, setAccessCode] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState('');

  const handleRequestAccess = async () => {
    if (!currentUser) return;

    setIsRequesting(true);
    setError('');

    try {
      // Check if access code is required and valid
      const config = BetaTestingManager.getBetaConfig();
      if (config.betaAccessCode && accessCode !== config.betaAccessCode) {
        setError(t('invalidAccessCode') || 'Invalid access code');
        return;
      }

      // Grant beta access
      BetaTestingManager.grantBetaAccess(currentUser.id);

      // Update user object with beta access
      const updatedUser = {
        ...currentUser,
        betaAccess: true,
        betaAccessGrantedAt: new Date().toISOString(),
        betaVersion: BetaTestingManager.getCurrentVersion(),
        betaFeatures: BetaTestingManager.getEnabledFeatures(currentUser).map(f => f.id)
      };

      // Show success message
      alert(t('betaAccessGranted') || 'Beta access granted! Welcome to the beta program.');

      onClose();

      // Note: In a real implementation, this would update the user in the backend
      // For now, the local storage handles the beta access state

    } catch (error) {
      console.error('Failed to grant beta access:', error);
      setError(t('betaAccessError') || 'Failed to grant beta access. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isOpen) return null;

  const hasBetaAccess = BetaTestingManager.hasBetaAccess(currentUser);
  const config = BetaTestingManager.getBetaConfig();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {hasBetaAccess ? (t('betaAccess') || 'Beta Access') : (t('requestBetaAccess') || 'Request Beta Access')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {hasBetaAccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-green-600">✓</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('betaAccessGranted') || 'Beta Access Granted!'}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('betaWelcomeMessage') || 'Welcome to the SnapifY beta program. You now have access to the latest features and can provide feedback to help us improve.'}
              </p>

              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-purple-900 mb-2">
                  {t('yourBetaFeatures') || 'Your Beta Features'}:
                </h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  {BetaTestingManager.getEnabledFeatures(currentUser).map((feature) => (
                    <li key={feature.id} className="flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      {feature.name}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {t('getStarted') || 'Get Started'}
              </button>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-purple-600">β</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('joinBetaProgram') || 'Join the Beta Program'}
                </h3>
                <p className="text-gray-600">
                  {t('betaDescription') || 'Get early access to new features, provide feedback, and help shape the future of SnapifY.'}
                </p>
              </div>

              {config.betaAccessCode && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('accessCode') || 'Access Code'}
                  </label>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder={t('enterAccessCode') || 'Enter beta access code'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {error && (
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  )}
                </div>
              )}

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">
                  {t('betaBenefits') || 'Beta Benefits'}:
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• {t('earlyAccess') || 'Early access to new features'}</li>
                  <li>• {t('provideFeedback') || 'Provide feedback to improve the app'}</li>
                  <li>• {t('exclusiveFeatures') || 'Access to exclusive beta features'}</li>
                  <li>• {t('helpShape') || 'Help shape the future of SnapifY'}</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('maybeLater') || 'Maybe Later'}
                </button>
                <button
                  onClick={handleRequestAccess}
                  disabled={isRequesting || (config.betaAccessCode ? !accessCode : false)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRequesting ? (t('requesting') || 'Requesting...') : (t('requestAccess') || 'Request Access')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};