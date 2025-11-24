import React from 'react';
import { Language, TranslateFn } from '../../types';
import { LandingPage } from '../LandingPage';
import { PWAInstallPrompt } from '../PWAInstallPrompt';
import { ContactModal } from '../ContactModal';

interface LandingViewProps {
  onGoogleLogin: () => void;
  onEmailAuth: (data: any, isSignUp: boolean) => Promise<void>;
  onContactSales: () => void;
  isLoggingIn: boolean;
  authError: string;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  t: TranslateFn;
  showContactModal: boolean;
  onCloseContactModal: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onGoogleLogin,
  onEmailAuth,
  onContactSales,
  isLoggingIn,
  authError,
  language,
  onChangeLanguage,
  t,
  showContactModal,
  onCloseContactModal
}) => {
  return (
    <div className="min-h-full w-full">
      <LandingPage
        onGoogleLogin={onGoogleLogin}
        onEmailAuth={onEmailAuth}
        onContactSales={onContactSales}
        isLoggingIn={isLoggingIn}
        authError={authError}
        language={language}
        onChangeLanguage={onChangeLanguage}
        t={t}
      />
      <PWAInstallPrompt t={t} />
      {showContactModal && <ContactModal onClose={onCloseContactModal} t={t} />}
    </div>
  );
};