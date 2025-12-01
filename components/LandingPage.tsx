import React, { useState, useEffect } from 'react';
import { Globe, Menu, X, Zap } from 'lucide-react';
import { Language, TranslateFn, TierLevel } from '../types';
import { TermsModal } from './TermsModal';
import { HeroSection } from './HeroSection';
import { HowItWorksSection } from './HowItWorksSection';
import { FeaturesSection } from './FeaturesSection';
import { StudioSection } from './StudioSection';
import { ContactSection } from './ContactSection';
import { FAQSection } from './FAQSection';
import { FooterSection } from './FooterSection';

interface LandingPageProps {
    onGoogleLogin: () => void;
    onEmailAuth: (data: any, isSignUp: boolean) => void;
    onContactSales: (tier?: TierLevel) => void;
    isLoggingIn: boolean;
    authError: string;
    language: Language;
    onChangeLanguage: (lang: Language) => void;
    t: TranslateFn;
}

export const LandingPage: React.FC<LandingPageProps> = ({
    onGoogleLogin,
    onEmailAuth,
    onContactSales,
    isLoggingIn,
    authError,
    language,
    onChangeLanguage,
    t
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const scrollToAuth = () => {
        document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' });
    };

    // Keyboard navigation for language menu
    useEffect(() => {
        if (!showLangMenu) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const languages = ['en', 'mk', 'tr', 'sq'] as Language[];
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedIndex(prev => (prev + 1) % languages.length);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedIndex(prev => prev <= 0 ? languages.length - 1 : prev - 1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (focusedIndex >= 0) {
                        onChangeLanguage(languages[focusedIndex]);
                        setShowLangMenu(false);
                        setFocusedIndex(-1);
                    }
                    break;
                case 'Escape':
                    setShowLangMenu(false);
                    setFocusedIndex(-1);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showLangMenu, focusedIndex, onChangeLanguage]);

    // Reset focused index when menu opens
    useEffect(() => {
        if (showLangMenu) {
            setFocusedIndex(0);
        }
    }, [showLangMenu]);

    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans selection:bg-indigo-500/30" role="main">
            {/* --- NAVIGATION --- */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/5 bg-black/50 supports-[backdrop-filter]:bg-black/20">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                        <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                            <Zap size={20} className="text-white fill-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">{t('appName')}</span>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                        <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">How it Works</button>
                        <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Features</button>
                        <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Pricing</button>

                        <div className="h-4 w-px bg-white/10" />

                        <div className="relative group">
                            <button onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center text-sm text-slate-300 hover:text-white gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                                <Globe size={14} className="text-slate-400" />
                                <span className="font-semibold">{language.toUpperCase()}</span>
                            </button>
                            {showLangMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                                    <div className="absolute top-full right-0 mt-4 w-32 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50">
                                        {(['en', 'mk', 'tr', 'sq'] as Language[]).map((lang, index) => (
                                            <button
                                                key={lang}
                                                onClick={() => { onChangeLanguage(lang); setShowLangMenu(false); setFocusedIndex(-1); }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 focus:bg-white/5 focus:outline-none ${language === lang ? 'text-indigo-400 font-bold' : 'text-slate-300'} ${focusedIndex === index ? 'bg-white/5' : ''}`}
                                            >
                                                {lang.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <button onClick={scrollToAuth} className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-indigo-50 hover:scale-105 transition-all shadow-lg shadow-white/10" aria-label="Sign in to your account">
                            {t('signIn')}
                        </button>
                    </div>

                    <button
                        className="md:hidden text-white p-2"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black pt-24 px-6 md:hidden animate-in slide-in-from-top-10">
                    <div className="flex flex-col gap-6 text-xl font-bold">
                        <button onClick={() => { setMobileMenuOpen(false); scrollToAuth(); }} className="text-left text-slate-300 hover:text-white transition-colors py-2 touch-manipulation min-h-[48px]">{t('signIn')}</button>
                        <button onClick={() => { setMobileMenuOpen(false); document.getElementById('how-it-works')?.scrollIntoView(); }} className="text-left text-slate-300 hover:text-white transition-colors py-2 touch-manipulation min-h-[48px]">How It Works</button>
                        <button onClick={() => { setMobileMenuOpen(false); document.getElementById('features')?.scrollIntoView(); }} className="text-left text-slate-300 hover:text-white transition-colors py-2 touch-manipulation min-h-[48px]">Features</button>
                        <button onClick={() => { setMobileMenuOpen(false); document.getElementById('pricing')?.scrollIntoView(); }} className="text-left text-slate-300 hover:text-white transition-colors py-2 touch-manipulation min-h-[48px]">Pricing</button>
                        <div className="h-px bg-white/10" />
                        <div className="grid grid-cols-4 gap-2">
                            {(['en', 'mk', 'tr', 'sq'] as Language[]).map(lang => (
                                <button key={lang} onClick={() => { onChangeLanguage(lang); setMobileMenuOpen(false); }} className={`p-3 rounded-lg text-sm text-center border touch-manipulation min-h-[48px] transition-all ${language === lang ? 'bg-indigo-600 border-indigo-500' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                                    {lang.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <HeroSection
                onGoogleLogin={onGoogleLogin}
                onEmailAuth={onEmailAuth}
                onContactSales={onContactSales}
                isLoggingIn={isLoggingIn}
                authError={authError}
                language={language}
                onChangeLanguage={onChangeLanguage}
                t={t}
            />

            <HowItWorksSection t={t} />

            <FeaturesSection t={t} />

            <StudioSection t={t} onContactSales={onContactSales} />

            <ContactSection t={t} />

            <FAQSection t={t} />

            <FooterSection t={t} />

            {showTerms && <TermsModal onClose={() => setShowTerms(false)} t={t} />}
        </div>
    );
};