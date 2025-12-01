declare global {
    interface Window {
        google: any;
        googleSignInInitialized?: boolean;
    }
}
import React, { useState, useEffect, useRef, memo } from 'react';
import {
    ArrowRight, Play
} from 'lucide-react';
import { Language, TranslateFn } from '../types';
import { HERO_IMAGES } from '../constants';
import { GoogleButtonErrorBoundary } from './GoogleButtonErrorBoundary';
import { LazyImage } from './LazyImage';

interface HeroSectionProps {
    onGoogleLogin: () => void;
    onEmailAuth: (data: any, isSignUp: boolean) => void;
    onContactSales: (tier?: any) => void;
    isLoggingIn: boolean;
    authError: string;
    language: Language;
    onChangeLanguage: (lang: Language) => void;
    t: TranslateFn;
}

export const HeroSection: React.FC<HeroSectionProps> = memo(({
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
    const [showLangMenu, setShowLangMenu] = useState(false);
    const googleButtonRef = useRef<HTMLDivElement>(null);

    // Form State
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPhotographer, setIsPhotographer] = useState(false);
    const [studioName, setStudioName] = useState('');

    useEffect(() => {
        // Hero Rotator
        const interval = setInterval(() => {
            setCurrentHeroImageIndex((prevIndex) => (prevIndex + 1) % HERO_IMAGES.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Performance monitoring
    useEffect(() => {
        if ('performance' in window && 'mark' in window.performance) {
            performance.mark('hero-section-mounted');
        }
    }, []);

    // Google Button Logic - Wait for proper initialization
    useEffect(() => {
        const renderGoogleButton = () => {
            if (window.google && window.google.accounts && window.google.accounts.id && window.googleSignInInitialized && googleButtonRef.current) {
                try {
                    // Clear any existing content first
                    googleButtonRef.current.innerHTML = '';
                    window.google.accounts.id.renderButton(
                        googleButtonRef.current,
                        {
                            theme: "filled_black",
                            size: "large",
                            width: window.innerWidth < 640 ? 320 : 400,
                            text: "continue_with",
                            shape: "pill",
                        }
                    );
                } catch (e) {
                    console.error("GSI Render Error", e);
                    // Fallback button on error
                    if (googleButtonRef.current) {
                        googleButtonRef.current.innerHTML = `<button onclick="if(window.google) window.google.accounts.id.prompt();" class="w-full bg-white text-black font-bold py-3 rounded-full flex items-center justify-center gap-2"><span>Continue with Google</span></button>`;
                    }
                }
            }
        };

        // Check immediately if everything is ready
        if (window.google && window.google.accounts && window.google.accounts.id && window.googleSignInInitialized) {
            renderGoogleButton();
        } else {
            // Poll for Google Sign-In readiness with exponential backoff
            let delay = 100;
            const maxDelay = 5000;
            const checkGoogleReady = () => {
                if (window.google && window.google.accounts && window.google.accounts.id && window.googleSignInInitialized) {
                    renderGoogleButton();
                    if ('performance' in window && 'mark' in window.performance) {
                        performance.mark('google-button-rendered');
                    }
                } else {
                    // Continue polling with increasing delay
                    setTimeout(checkGoogleReady, delay);
                    delay = Math.min(delay * 1.5, maxDelay);
                }
            };

            // Start polling after a brief delay
            const timeoutId = setTimeout(checkGoogleReady, 100);

            // Fallback after 10 seconds
            const fallbackTimeout = setTimeout(() => {
                if (googleButtonRef.current && !googleButtonRef.current.innerHTML.includes('Google')) {
                    googleButtonRef.current.innerHTML = `<button onclick="if(window.google) window.google.accounts.id.prompt();" class="w-full bg-white text-black font-bold py-3 rounded-full flex items-center justify-center gap-2"><span>Continue with Google</span></button>`;
                }
            }, 10000);

            return () => {
                clearTimeout(timeoutId);
                clearTimeout(fallbackTimeout);
            };
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onEmailAuth({ name, email, password, isPhotographer, studioName }, isSignUp);
    };

    const scrollToAuth = () => {
        document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans selection:bg-indigo-500/30" role="main">

            {/* --- BACKGROUND LAYERS --- */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {HERO_IMAGES.map((src, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${idx === currentHeroImageIndex ? 'opacity-30' : 'opacity-0'}`}
                    >
                        <LazyImage src={src} alt="Background" className="w-full h-full object-cover scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-[#050505]" />
                    </div>
                ))}
                {/* Noise texture overlay for premium feel */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            {/* --- HERO SECTION --- */}
            <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex flex-col justify-center">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* Left Content */}
                    <div className="flex-1 text-center lg:text-left space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 animate-pulse">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            The #1 Event Sharing Platform
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
                            {t('heroTitlePrefix')} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                                {t('heroTitleSuffix')}
                            </span>
                        </h1>

                        <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
                            {t('heroDesc')}
                        </p>

                        {/* Key Benefits */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto lg:mx-0 mt-8 mb-8">
                            {[
                                { icon: '⚡', text: 'Setup in 30 seconds' },
                                { icon: '📱', text: 'Works on any device' },
                                { icon: '🔒', text: 'Private & secure' }
                            ].map((benefit, i) => (
                                <div key={i} className="flex items-center gap-3 text-slate-300">
                                    <span className="text-2xl">{benefit.icon}</span>
                                    <span className="text-sm font-medium">{benefit.text}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                            <button onClick={scrollToAuth} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white px-8 py-4 rounded-full font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 group touch-manipulation min-h-[48px]">
                                {t('getStarted')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <div className="pt-8 flex items-center justify-center lg:justify-start gap-12 opacity-80">
                            <div className="flex flex-col">
                                <span className="text-3xl font-bold text-white tracking-tighter">1M+</span>
                                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{t('statPhotos') || "Photos Shared"}</span>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-3xl font-bold text-white tracking-tighter">50k+</span>
                                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{t('statEvents') || "Events Hosted"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Content - Auth Card */}
                    <div className="flex-1 w-full max-w-md relative group perspective-1000">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-1000" />

                        <div id="auth-card" className="relative bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 p-8 rounded-[1.8rem] shadow-2xl">
                            <div className="flex mb-8 bg-black/40 p-1.5 rounded-xl border border-white/5">
                                <button onClick={() => setIsSignUp(false)} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300 touch-manipulation min-h-[48px] ${!isSignUp ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white active:bg-white/10'}`}>
                                    {t('signIn')}
                                </button>
                                <button onClick={() => setIsSignUp(true)} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300 touch-manipulation min-h-[48px] ${isSignUp ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-white active:bg-white/10'}`}>
                                    {t('signUp')}
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {isSignUp && (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">{t('fullName')}</label>
                                            <input
                                                type="text" value={name} onChange={e => setName(e.target.value)}
                                                className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                                placeholder="Jane Doe"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => setIsPhotographer(!isPhotographer)}>
                                            <input type="checkbox" checked={isPhotographer} onChange={e => setIsPhotographer(e.target.checked)} className="w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-600 bg-transparent" />
                                            <span className="text-sm font-medium text-slate-300">{t('iAmPhotographer')}</span>
                                        </div>
                                        {isPhotographer && (
                                            <div className="animate-in fade-in">
                                                <input
                                                    type="text" value={studioName} onChange={e => setStudioName(e.target.value)}
                                                    className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-200 placeholder-amber-500/50 focus:border-amber-500 outline-none transition-all"
                                                    placeholder={t('studioName')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="email" className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">{t('email')}</label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="name@example.com"
                                        aria-describedby="email-error"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password" className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">{t('password')}</label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full mt-1.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="••••••••"
                                        aria-describedby="password-error"
                                        required
                                    />
                                </div>

                                {authError && (
                                    <div
                                        id="auth-error"
                                        className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center animate-in fade-in"
                                        role="alert"
                                        aria-live="polite"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <span>⚠️</span>
                                            <span>{authError}</span>
                                        </div>
                                    </div>
                                )}

                                <button disabled={isLoggingIn} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:from-indigo-700 active:to-purple-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex justify-center items-center touch-manipulation min-h-[48px]">
                                    {isLoggingIn ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isSignUp ? t('createAccount') : t('signIn'))}
                                </button>
                            </form>

                            <div className="flex items-center gap-4 my-6 opacity-50">
                                <div className="h-px bg-white flex-1" />
                                <span className="text-xs font-bold tracking-widest">OR</span>
                                <div className="h-px bg-white flex-1" />
                            </div>

                            <GoogleButtonErrorBoundary>
                                <div ref={googleButtonRef} className="h-[44px] w-full flex justify-center" />
                            </GoogleButtonErrorBoundary>

                            <p className="text-center text-xs text-slate-500 mt-6">
                                {t('terms')} <button onClick={() => {/* TODO: Show terms */ }} className="text-indigo-400 hover:underline underline-offset-2">{t('termsLink')}</button>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
});