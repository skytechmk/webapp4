import * as React from 'react';
const { useState, useEffect, useRef } = React;
import { Globe, Menu, X, Zap, Star, Shield, Smartphone, Camera, QrCode, Image as ImageIcon, Check, Mail, Star as StarIcon, MessageCircle } from 'lucide-react';
import { Language, TranslateFn, TierLevel } from '../types';
import { TermsModal } from './TermsModal';
import { getPricingTiers as getPricingTiersFromConstants } from '../constants';
import { BetaTestingManager } from '../lib/beta-testing';

interface LandingPageProps {
    onGoogleLogin: () => void;
    onEmailAuth: (data: any, isSignUp: boolean) => void;
    onContactSales: (tier?: TierLevel) => void;
    isLoggingIn: boolean;
    authError: string;
    language: Language;
    onChangeLanguage: (lang: Language) => void;
    t: TranslateFn;
    currentUser?: User | null;
}

// --- Mock Data & Constants ---
const HERO_IMAGES = [
    "https://images.unsplash.com/photo-1530103862676-de3c9a59af57?auto=format&fit=crop&q=80&w=2940", // Friends/Party (Updated)
    "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=2940", // Graduation/Event
    "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=2940", // Conference/Professional
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=2940", // Nightclub/Event
    "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=2940"  // Wedding Ceremony
];

// Use the centralized pricing tiers from constants.ts
const getPricingTiers = (t: TranslateFn) => getPricingTiersFromConstants(t);

// --- Sub-Components ---

const PricingCard = ({ tier, t, onSelect }: { tier: any, t: TranslateFn, onSelect: (id: string) => void }) => (
    <div className={`relative p-6 rounded-3xl flex flex-col h-full transition-all duration-300 hover:-translate-y-1 ${tier.recommended ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 ring-4 ring-indigo-500/20' : 'bg-white border border-slate-200 text-slate-900 hover:shadow-lg'}`}>
        {tier.recommended && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-lg">
                <StarIcon size={12} className="mr-1 fill-white" /> {t('recommended')}
            </div>
        )}
        <h3 className={`text-xl font-bold mb-2 ${tier.recommended ? 'text-white' : 'text-slate-900'}`}>{tier.name}</h3>
        <div className={`text-3xl font-black mb-6 ${tier.recommended ? 'text-white' : 'text-slate-900'}`}>
            {tier.price}<span className={`text-sm font-normal ${tier.recommended ? 'text-slate-400' : 'text-slate-500'}`}>/mo</span>
        </div>
        <ul className="space-y-3 mb-8 flex-grow">
            {tier.features.map((feature: string, idx: number) => (
                <li key={idx} className={`flex items-start text-sm ${tier.recommended ? 'text-slate-300' : 'text-slate-600'}`}>
                    <Check size={16} className={`mr-2 mt-0.5 shrink-0 ${tier.recommended ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    {feature}
                </li>
            ))}
        </ul>
        <button
            onClick={() => onSelect(tier.id)}
            className={`w-full py-3.5 rounded-2xl font-bold transition-all active:scale-95 ${tier.recommended ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
        >
            {tier.price === 'Custom' ? t('contactSales') : t('selectPlan')}
        </button>
    </div>
);

// --- Main LandingPage Component ---

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
    const [currentHeroImageIndex, setCurrentHeroImageIndex] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const googleButtonRef = useRef<HTMLDivElement>(null);

    // Form State
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPhotographer, setIsPhotographer] = useState(false);
    const [studioName, setStudioName] = useState('');

    // Beta Feedback State
    const [feedback, setFeedback] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [feedbackError, setFeedbackError] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    // Auth mode state
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentHeroImageIndex((prevIndex) => (prevIndex + 1) % HERO_IMAGES.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Render Google Button with Retry Logic
    useEffect(() => {
        const renderGoogleButton = () => {
            if (googleButtonRef.current && !window.google) {
                // Fallback visuals if script hasn't loaded yet
                if (googleButtonRef.current) {
                    googleButtonRef.current.innerHTML = `
                    <button
                        class="w-full h-full bg-white text-slate-900 border border-slate-200 rounded-full font-bold px-4 py-3 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group"
                    >
                        <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span class="tracking-tight">${t('continue_with')}</span>
                    </button>
                `;
                    const btn = googleButtonRef.current.querySelector('button');
                    if (btn) btn.onclick = onGoogleLogin;
                }
                return;
            }

            if (window.google && googleButtonRef.current) {
                try {
                    window.google.accounts.id.renderButton(
                        googleButtonRef.current,
                        {
                            theme: "filled_white",
                            size: "large",
                            width: "100%",
                            text: "continue_with",
                            shape: "pill",
                            logo_alignment: "left"
                        }
                    );
                } catch (e) {
                    console.error("GSI Render Error", e);
                }
            }
        };

        renderGoogleButton();
        const interval = setInterval(() => {
            if (window.google) {
                renderGoogleButton();
                clearInterval(interval);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [t, onGoogleLogin]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onEmailAuth({ name, email, password, isPhotographer, studioName }, isSignUp);
    };

    // Feedback submit handler
    const handleFeedbackSubmit = async () => {
        if (!feedback.trim()) {
            setFeedbackError('Please enter your feedback');
            return;
        }

        if (feedback.length > 500) {
            setFeedbackError('Feedback exceeds 500 character limit');
            return;
        }

        setIsSubmittingFeedback(true);
        try {
            // Import API dynamically to avoid circular dependencies
            const apiModule = await import('../services/api');
            const api = apiModule.api;

            // Submit feedback via API
            const result = await api.submitFeedback({
                userId: currentUser?.id || 'anonymous',
                comments: feedback,
                category: 'general',
                source: 'landing-page',
                version: '2.2'
            });

            if (result.success) {
                setFeedbackSubmitted(true);
                setFeedback('');
            } else {
                throw new Error('Feedback submission failed');
            }
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            setFeedbackError('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    // Sync authMode with isSignUp state
    useEffect(() => {
        setAuthMode(isSignUp ? 'signup' : 'signin');
    }, [isSignUp]);

    // Deluxe & Playful Theme Implementation
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-pink-50/20 text-slate-900 relative overflow-hidden flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">

            {/* Animated Gradient Background Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-40 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-blob" />
                <div className="absolute top-0 -right-40 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-rose-400/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
            </div>

            {/* Background Hero Layer with Enhanced Effects */}
            <div className="absolute top-0 left-0 right-0 h-[600px] md:h-[700px] overflow-hidden pointer-events-none rounded-b-[3rem] md:rounded-b-[5rem] shadow-2xl z-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
                {HERO_IMAGES.map((src, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentHeroImageIndex ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <img
                            src={src}
                            alt="Background"
                            className="w-full h-full object-cover animate-float-delayed scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/70 via-purple-900/50 to-slate-900/90" />
                        {/* Sparkle overlay */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)] animate-pulse-slow" />
                    </div>
                ))}

                {/* Floating particles */}
                <div className="absolute inset-0">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white/40 rounded-full animate-float"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${5 + Math.random() * 10}s`
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <nav className="relative z-20 flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
                <div className="flex items-center space-x-2 font-bold text-2xl tracking-tight cursor-pointer">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-xl shadow-lg">
                        <Zap size={20} className="text-white fill-white" />
                    </div>
                    <span className="text-white drop-shadow-md">{t('appName')}</span>
                </div>

                <div className="hidden md:flex items-center space-x-4">
                    <div className="relative group">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="flex items-center text-sm text-white/80 hover:text-white transition-colors px-3 py-2 rounded-full hover:bg-white/10 backdrop-blur-sm"
                        >
                            <Globe size={16} className="mr-2" />
                            {language.toUpperCase()}
                        </button>
                        {showLangMenu && (
                            <React.Fragment>
                                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowLangMenu(false)} />
                                <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-xl ring-1 ring-black/5 overflow-hidden py-1 z-50 text-slate-900 animate-in fade-in zoom-in-95 origin-top-right">
                                    {['en', 'mk', 'tr', 'sq'].map(lang => (
                                        <button
                                            key={lang}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onChangeLanguage(lang as Language);
                                                setShowLangMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm ${language === lang ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            {lang.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </React.Fragment>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            const el = document.getElementById('auth-card');
                            el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="bg-white text-slate-900 px-6 py-2.5 rounded-full font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        {t('getStarted')}
                    </button>
                </div>

                <button className="md:hidden text-white p-2 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </nav>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="absolute top-20 left-4 right-4 z-50 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl p-6 md:hidden flex flex-col space-y-6 animate-in slide-in-from-top-5 shadow-2xl">
                    <div className="grid grid-cols-2 gap-3">
                        {['en', 'mk', 'tr', 'sq'].map(lang => (
                            <button
                                key={lang}
                                onClick={() => { onChangeLanguage(lang as Language); setMobileMenuOpen(false); }}
                                className={`px-3 py-3 rounded-xl text-sm font-bold flex items-center justify-center ${language === lang ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 text-slate-600'}`}
                            >
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div className="h-px bg-slate-100" />
                    <button
                        onClick={() => {
                            const el = document.getElementById('auth-card');
                            el?.scrollIntoView({ behavior: 'smooth' });
                            setMobileMenuOpen(false);
                        }}
                        className="w-full bg-slate-900 text-white px-4 py-4 rounded-xl font-bold text-center hover:bg-slate-800 transition-colors"
                    >
                        {t('getStarted')}
                    </button>
                </div>
            )}

            {/* Main Content */}
            <main className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-24 md:pt-16 flex flex-col items-center text-center flex-grow w-full">

                {/* Floating Badge with Glassmorphism */}
                <div className="animate-float mb-8 group cursor-default">
                    <span className="inline-flex items-center py-2 px-5 rounded-full bg-white/20 backdrop-blur-xl text-white text-sm font-bold border border-white/30 shadow-2xl shadow-indigo-500/20 hover:scale-105 transition-transform duration-300">
                        <StarIcon size={14} className="mr-2 fill-yellow-400 text-yellow-400" />
                        {t('ultimateEventCompanion')}
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tight leading-tight text-white drop-shadow-2xl">
                    {t('heroTitlePrefix')} <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-pink-200 to-purple-200 animate-gradient-x inline-block">
                        {t('heroTitleSuffix')}
                    </span>
                </h1>

                <p className="text-lg md:text-xl text-indigo-100 max-w-2xl mb-12 leading-relaxed drop-shadow-lg font-medium">
                    {t('heroDesc')}
                </p>

                {/* Auth Card - Deluxe Glassmorphism Variant */}
                <div id="auth-card" className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 md:p-10 border-2 border-transparent bg-gradient-to-br from-white via-white to-indigo-50/30 hover:shadow-3xl hover:shadow-indigo-500/20 transition-all duration-500 group relative overflow-hidden">
                    {/* Animated gradient border effect */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />

                    <h2 className="text-2xl md:text-3xl font-bold mb-6 text-slate-900 text-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {authMode === 'signin' ? t('signIn') : t('signUp')}
                    </h2>
                    <div className="flex mb-6 bg-slate-100 rounded-2xl p-1.5">
                        <button
                            onClick={() => { setIsSignUp(false); }}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${!isSignUp ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {t('signIn')}
                        </button>
                        <button
                            onClick={() => { setIsSignUp(true); }}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${isSignUp ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {t('signUp')}
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 text-left">
                        {isSignUp && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">{t('fullName')}</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 hover:border-slate-300"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 p-4 rounded-xl border-2 border-indigo-100 transition-all hover:border-indigo-200">
                                    <label className="flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={isPhotographer}
                                            onChange={e => setIsPhotographer(e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-transform hover:scale-110"
                                        />
                                        <span className="ml-3 text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                            {t('iAmPhotographer')}
                                        </span>
                                    </label>
                                    {isPhotographer && (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-indigo-600 mb-1.5 uppercase tracking-wider ml-1">{t('studioName')}</label>
                                            <div className="relative">
                                                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={studioName}
                                                    onChange={e => setStudioName(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white border-2 border-indigo-200 text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300"
                                                    placeholder="Luxe Studios"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">{t('email')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 hover:border-slate-300"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider ml-1">{t('password')}</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 hover:border-slate-300"
                                placeholder="••••••••"
                            />
                        </div>

                        {authError && (
                            <div className="text-red-600 text-sm font-medium text-center bg-red-50 border-2 border-red-200 py-3 rounded-xl animate-in fade-in slide-in-from-top-2 flex items-center justify-center shadow-sm">
                                <Shield size={16} className="mr-2" />
                                {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1 active:translate-y-0 flex justify-center items-center group mt-2 relative overflow-hidden"
                        >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                            {isLoggingIn ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="flex items-center relative z-10">
                                    {isSignUp ? t('createAccount') : t('signIn')}
                                    <Mail className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t-2 border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-3 text-slate-500 font-bold">or</span>
                            </div>
                        </div>
                        {/* Google Button Container */}
                        <div ref={googleButtonRef} className="w-full h-[44px] flex justify-center"></div>

                        <p className="text-xs text-slate-400 mt-6 text-center leading-relaxed font-medium">
                            {t('terms')}
                            <span className="mx-1">•</span>
                            <button
                                type="button"
                                onClick={() => setShowTerms(true)}
                                className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2 transition-colors cursor-pointer"
                            >
                                {t('termsLink')}
                            </button>
                        </p>
                    </form>
                </div>

                {/* Pricing Section - Deluxe Edition */}
                <div className="mt-32 w-full max-w-7xl">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 px-4">
                        <div className="text-left">
                            <h2 className="text-3xl md:text-5xl font-black mb-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {t('pricingTitle')}
                            </h2>
                            <p className="text-slate-600 text-lg font-medium">
                                Scale your event photography business.
                            </p>
                        </div>
                        <div className="flex space-x-2 mt-4 md:mt-0">
                            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all cursor-pointer">
                                Monthly
                            </span>
                            <span className="text-slate-400 px-5 py-2 text-xs font-bold uppercase tracking-wider hover:text-slate-600 transition-colors cursor-pointer">
                                Yearly (-20%)
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                        {getPricingTiers(t).map(tier => (
                            <PricingCard
                                key={tier.id}
                                tier={tier}
                                t={t}
                                onSelect={(id) => {
                                    const el = document.getElementById('auth-card');
                                    el?.scrollIntoView({ behavior: 'smooth' });
                                    if (id !== 'FREE') onContactSales(id as TierLevel);
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Beta Feedback Section - Deluxe Edition */}
                <div className="mt-24 w-full max-w-4xl mx-auto px-4">
                    <div className="bg-gradient-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 rounded-3xl p-8 md:p-10 border-2 border-indigo-100 shadow-xl shadow-indigo-500/10 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 relative overflow-hidden group">
                        {/* Animated gradient border effect */}
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />

                        <div className="text-center mb-6 relative z-10">
                            <h3 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {t('betaFeedbackTitle')}
                            </h3>
                            <p className="text-slate-600 font-medium">{t('betaFeedbackSubtitle')}</p>
                            <p className="text-xs text-slate-500 mt-2">{t('betaFeedbackCharLimit')}</p>
                        </div>

                        {!feedbackSubmitted ? (
                            <div className="space-y-4 relative z-10">
                                <textarea
                                    value={feedback}
                                    onChange={(e) => {
                                        setFeedback(e.target.value);
                                        setFeedbackError('');
                                    }}
                                    className="w-full p-4 rounded-xl border-2 border-indigo-200 bg-white/80 backdrop-blur-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none transition-all min-h-[120px] resize-y shadow-sm hover:border-indigo-300"
                                    placeholder={t('betaFeedbackPlaceholder')}
                                    maxLength={500}
                                />

                                {feedbackError && (
                                    <div className="text-red-600 text-sm font-medium text-center bg-red-50 border-2 border-red-200 py-2 rounded-xl shadow-sm">
                                        {feedbackError}
                                    </div>
                                )}

                                <button
                                    onClick={() => handleFeedbackSubmit()}
                                    disabled={isSubmittingFeedback}
                                    className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1 active:translate-y-0 flex justify-center items-center group/btn relative overflow-hidden"
                                >
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000" />

                                    {isSubmittingFeedback ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <span className="flex items-center relative z-10">
                                            {t('submitFeedback')}
                                            <MessageCircle className="ml-2 w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                        </span>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-8 relative z-10">
                                <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                                    <Check size={32} className="text-white" />
                                </div>
                                <p className="text-slate-700 font-bold text-lg">{t('feedbackThanks')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="relative z-10 w-full border-t border-slate-200 bg-white py-12 px-6 text-center text-slate-400 text-sm">
                <div className="flex items-center justify-center mb-6 opacity-30 grayscale hover:grayscale-0 transition-all cursor-pointer">
                    <Zap size={24} className="text-indigo-600 fill-indigo-600" />
                    <span className="ml-2 font-bold text-slate-900 text-lg">SnapifY</span>
                </div>
                <p>© {new Date().getFullYear()} SnapifY Inc. All rights reserved.</p>
            </footer>

            {showTerms && <TermsModal onClose={() => setShowTerms(false)} t={t} />}
        </div>
    );
};