import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { TranslateFn } from '../types';

export const OfflineBanner: React.FC<{ t: TranslateFn }> = ({ t }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-red-500 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-[60] shadow-md animate-in slide-in-from-top-full">
      <WifiOff size={14} />
      <span>{t('offlineMode')}</span>
    </div>
  );
};