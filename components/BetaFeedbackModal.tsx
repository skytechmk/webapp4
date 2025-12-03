import * as React from 'react';
const { useState } = React;
import { BetaTestingManager } from '../lib/beta-testing';
import { User } from '../types';

interface BetaFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  t: (key: string) => string;
}

export const BetaFeedbackModal: React.FC<BetaFeedbackModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  t
}) => {
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [category, setCategory] = useState<'bug' | 'feature-request' | 'improvement' | 'general'>('general');
  const [feature, setFeature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;

    setIsSubmitting(true);

    try {
      BetaTestingManager.submitBetaFeedback(currentUser.id, {
        rating,
        comments,
        feature,
        category
      });

      // Reset form
      setRating(5);
      setComments('');
      setCategory('general');
      setFeature('');

      // Show success message
      alert(t('betaFeedbackSubmitted') || 'Thank you for your feedback!');

      onClose();
    } catch (error) {
      console.error('Failed to submit beta feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const enabledFeatures = BetaTestingManager.getEnabledFeatures(currentUser);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {t('betaFeedback') || 'Beta Feedback'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('rating') || 'Rating'} (1-5)
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('category') || 'Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="general">{t('general') || 'General'}</option>
                <option value="bug">{t('bug') || 'Bug Report'}</option>
                <option value="feature-request">{t('featureRequest') || 'Feature Request'}</option>
                <option value="improvement">{t('improvement') || 'Improvement'}</option>
              </select>
            </div>

            {/* Feature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('feature') || 'Related Feature'} ({t('optional') || 'Optional'})
              </label>
              <select
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">{t('selectFeature') || 'Select a feature...'}</option>
                {enabledFeatures.map((feat) => (
                  <option key={feat.id} value={feat.id}>
                    {feat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('comments') || 'Comments'}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={t('shareThoughts') || 'Share your thoughts...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (t('submitting') || 'Submitting...') : (t('submit') || 'Submit')}
              </button>
            </div>
          </form>

          {/* Version Info */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              {t('betaVersion') || 'Beta Version'}: {BetaTestingManager.getCurrentVersion()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};