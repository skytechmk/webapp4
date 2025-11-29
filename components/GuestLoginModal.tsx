import React, { useState } from 'react';
import { User as UserIcon, LogIn, Shield, Camera, Check } from 'lucide-react';
import { TranslateFn } from '../types';

interface GuestLoginModalProps {
  onLogin: (name: string) => void;
  onRegister: () => void; 
  onCancel: () => void;
  t: TranslateFn;
}

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({ onLogin, onRegister, onCancel, t }) => {
  const [guestName, setGuestName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
        onLogin(guestName);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col">
        <button 
            onClick={onCancel} 
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
            ✕
        </button>

        <div className="p-8 pb-6 text-center">
             <h2 className="text-2xl font-black text-slate-900 mb-2">{t('joinParty')}</h2>
             <p className="text-slate-500 text-sm">{t('chooseAccess')}</p>
        </div>
        
        <div className="px-8 space-y-6 pb-8">
            {/* Option 1: Guest Access */}
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 relative group">
                 <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-sm">
                     {t('guestAccess')}
                 </div>
                 <form onSubmit={handleSubmit} className="mt-2">
                    <div className="mb-4">
                         <input
                            id="guest-name-input"
                            name="guest-name"
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder={t('yourName')}
                            className="bg-white text-slate-900 w-full px-4 py-3.5 rounded-xl border border-indigo-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium"
                            autoComplete="name"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!guestName.trim()}
                        className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                    >
                        {t('continueAsGuest')} <Camera size={18} />
                    </button>
                 </form>
                 <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-indigo-400 font-medium">
                     <span className="flex items-center"><Check size={10} className="mr-1"/> {t('quickUpload')}</span>
                     <span className="flex items-center"><Check size={10} className="mr-1"/> {t('publicGallery')}</span>
                 </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full absolute"></div>
                <span className="bg-white px-3 text-xs font-bold text-slate-400 uppercase tracking-wider relative z-10">OR</span>
            </div>

            {/* Option 2: Member Access */}
            <div>
                <button
                    onClick={onRegister}
                    className="w-full py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 group"
                >
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-slate-900 transition-colors">
                        <LogIn size={16} />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm">{t('memberLogin')}</span>
                        <span className="block text-[10px] text-slate-400 font-normal">{t('privateUploadsHistory')}</span>
                    </div>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};