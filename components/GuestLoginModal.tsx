
import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { TranslateFn } from '../types';

interface GuestLoginModalProps {
  onLogin: (name: string) => void;
  onCancel: () => void;
  t: TranslateFn;
}

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({ onLogin, onCancel, t }) => {
  const [guestName, setGuestName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
        onLogin(guestName);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{t('joinParty')}</h3>
          <p className="text-slate-500 text-sm mt-1">{t('enterName')}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            required
            autoFocus
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder={t('yourName')}
            className="bg-white text-slate-900 w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all mb-4"
          />
          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            {t('continue')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full mt-3 text-slate-500 text-sm font-medium hover:text-slate-800"
          >
            {t('cancel')}
          </button>
        </form>
      </div>
    </div>
  );
};
