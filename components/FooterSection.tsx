import React from 'react';
import { Zap } from 'lucide-react';
import { TranslateFn } from '../types';

interface FooterSectionProps {
    t: TranslateFn;
}

export const FooterSection: React.FC<FooterSectionProps> = ({ t }) => {
    return (
        <footer className="bg-black border-t border-white/10 py-12 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <div className="bg-white/10 p-2 rounded-lg"><Zap size={16} /></div>
                    <span className="font-bold tracking-tight">{t('appName')}</span>
                </div>
                <div className="text-sm text-slate-500">
                    © {new Date().getFullYear()} {t('appName')}. All rights reserved.
                </div>
                <button className="text-sm text-slate-400 hover:text-white transition-colors underline decoration-slate-600 underline-offset-4">
                    {t('termsLink')}
                </button>
            </div>
        </footer>
    );
};