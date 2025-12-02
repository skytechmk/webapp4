import React, { useState, useEffect } from 'react';
import { BetaTestingManager, BetaConfig, BetaFeature } from '../lib/beta-testing';
import { User } from '../types';
import { UserPreferencesManager } from '../lib/auth/user-preferences';

interface BetaSettingsProps {
  currentUser: User | null;
  t: (key: string) => string;
  isAdmin?: boolean;
}

export const BetaSettings: React.FC<BetaSettingsProps> = ({
  currentUser,
  t,
  isAdmin = false
}) => {
  const [betaConfig, setBetaConfig] = useState<BetaConfig>(BetaTestingManager.getBetaConfig());
  const [userPreferences, setUserPreferences] = useState(UserPreferencesManager.getPreferences());
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setBetaConfig(BetaTestingManager.getBetaConfig());
    setUserPreferences(UserPreferencesManager.getPreferences());
  }, []);

  const handleConfigUpdate = async (updates: Partial<BetaConfig>) => {
    if (!isAdmin) return;

    setIsUpdating(true);
    try {
      const newConfig = BetaTestingManager.updateBetaConfig(updates);
      setBetaConfig(newConfig);
    } catch (error) {
      console.error('Failed to update beta config:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreferenceUpdate = (updates: Partial<typeof userPreferences>) => {
    const newPrefs = UserPreferencesManager.setPreferences(updates);
    setUserPreferences(newPrefs);
  };

  const handleFeatureToggle = (featureId: string, enabled: boolean) => {
    if (!isAdmin) return;

    const updatedFeatures = betaConfig.features.map(feature =>
      feature.id === featureId ? { ...feature, enabled } : feature
    );

    handleConfigUpdate({ features: updatedFeatures });
  };

  const handleResetBetaData = () => {
    if (!isAdmin || !confirm(t('confirmResetBeta') || 'Are you sure you want to reset all beta testing data?')) return;

    BetaTestingManager.resetBetaTesting();
    setBetaConfig(BetaTestingManager.getBetaConfig());
  };

  const betaStats = BetaTestingManager.getBetaStats();

  return (
    <div className="space-y-6">
      {/* Beta Status Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('betaTestingStatus') || 'Beta Testing Status'}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{betaStats.totalBetaUsers}</div>
            <div className="text-sm text-gray-600">{t('betaUsers') || 'Beta Users'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{betaStats.activeFeatures}</div>
            <div className="text-sm text-gray-600">{t('activeFeatures') || 'Active Features'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{betaStats.feedbackSubmitted}</div>
            <div className="text-sm text-gray-600">{t('feedbackSubmitted') || 'Feedback Submitted'}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{betaStats.version}</div>
            <div className="text-sm text-gray-600">{t('currentVersion') || 'Current Version'}</div>
          </div>
        </div>
      </div>

      {/* User Beta Preferences */}
      {currentUser && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('betaPreferences') || 'Beta Preferences'}
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('betaNotifications') || 'Beta Notifications'}
                </label>
                <p className="text-xs text-gray-500">
                  {t('betaNotificationsDesc') || 'Receive notifications about new beta features'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPreferences.betaNotifications}
                  onChange={(e) => handlePreferenceUpdate({ betaNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('betaFeaturePreviews') || 'Feature Previews'}
                </label>
                <p className="text-xs text-gray-500">
                  {t('betaFeaturePreviewsDesc') || 'Show previews of upcoming beta features'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPreferences.betaFeaturePreviews}
                  onChange={(e) => handlePreferenceUpdate({ betaFeaturePreviews: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('betaFeedbackReminders') || 'Feedback Reminders'}
                </label>
                <p className="text-xs text-gray-500">
                  {t('betaFeedbackRemindersDesc') || 'Remind me to submit feedback on beta features'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPreferences.betaFeedbackReminders}
                  onChange={(e) => handlePreferenceUpdate({ betaFeedbackReminders: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Admin Beta Configuration */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('betaConfiguration') || 'Beta Configuration'}
          </h3>

          <div className="space-y-6">
            {/* Beta Testing Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  {t('enableBetaTesting') || 'Enable Beta Testing'}
                </label>
                <p className="text-xs text-gray-500">
                  {t('enableBetaTestingDesc') || 'Allow users to access beta features'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={betaConfig.enabled}
                  onChange={(e) => handleConfigUpdate({ enabled: e.target.checked })}
                  disabled={isUpdating}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Beta Access Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('betaAccessCode') || 'Beta Access Code'} ({t('optional') || 'Optional'})
              </label>
              <input
                type="text"
                value={betaConfig.betaAccessCode || ''}
                onChange={(e) => handleConfigUpdate({ betaAccessCode: e.target.value || undefined })}
                disabled={isUpdating}
                placeholder={t('enterAccessCode') || 'Enter access code'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('betaAccessCodeDesc') || 'Leave empty to allow open beta access'}
              </p>
            </div>

            {/* Max Beta Users */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('maxBetaUsers') || 'Maximum Beta Users'}
              </label>
              <input
                type="number"
                value={betaConfig.maxBetaUsers}
                onChange={(e) => handleConfigUpdate({ maxBetaUsers: parseInt(e.target.value) || 1000 })}
                disabled={isUpdating}
                min="1"
                max="10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Feature Management */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">
                {t('betaFeatures') || 'Beta Features'}
              </h4>
              <div className="space-y-3">
                {betaConfig.features.map((feature: BetaFeature) => (
                  <div key={feature.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{feature.name}</div>
                      <div className="text-sm text-gray-600">{feature.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('version') || 'Version'}: {feature.version} | {t('roles') || 'Roles'}: {feature.userRoles.join(', ')}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={feature.enabled}
                        onChange={(e) => handleFeatureToggle(feature.id, e.target.checked)}
                        disabled={isUpdating}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleResetBetaData}
                disabled={isUpdating}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {t('resetBetaData') || 'Reset Beta Data'}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                {t('resetBetaDataDesc') || 'This will clear all beta user access and feedback data'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};