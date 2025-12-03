import * as React from 'react';
const { memo } = React;
import { Cast, Aperture, Shield, CheckCircle2 } from 'lucide-react';
import { TranslateFn } from '../types';

interface FeaturesSectionProps {
    t: TranslateFn;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = memo(({ t }) => {
    return (
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto scroll-mt-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            <h2 className="text-3xl md:text-5xl font-black mb-16 text-center">Everything you need to <br />capture the <span className="text-purple-400">Chaos & Joy</span></h2>

            <div className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-2 gap-6 h-auto md:h-[600px]">
                {/* Large Left Card - Live Wall */}
                <div className="md:col-span-4 md:row-span-2 bg-[#111] border border-white/10 rounded-[2rem] overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                    <img src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 grayscale group-hover:grayscale-0" alt="Live Wall" />
                    <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                            <Cast className="text-white" size={28} />
                        </div>
                        <h3 className="text-3xl font-bold mb-3">{t('featLiveWall') || "Live Slideshow"}</h3>
                        <p className="text-slate-300 max-w-md text-lg leading-relaxed">{t('featLiveWallDesc') || "Turn any TV or projector into a live social feed. Photos pop up seconds after they're snapped."}</p>
                    </div>
                </div>

                {/* Top Right - AI */}
                <div className="md:col-span-2 bg-[#111] border border-white/10 rounded-[2rem] p-8 hover:bg-[#161616] transition-colors relative overflow-hidden group">
                    <div className="absolute top-[-20px] right-[-20px] p-0 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                        <Aperture size={180} />
                    </div>
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                        <span className="text-pink-500">✨</span> {t('featAI') || "AI Find Me"}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">{t('featAIDesc') || "Guests take a selfie and our AI instantly filters the gallery to show only their photos."}</p>
                    <div className="w-full h-24 bg-gradient-to-r from-pink-500/20 to-purple-600/20 rounded-xl border border-pink-500/20 flex items-center justify-center">
                        <span className="text-pink-300 text-xs font-mono">Face Detection Active</span>
                    </div>
                </div>

                {/* Bottom Right - Privacy */}
                <div className="md:col-span-2 bg-[#111] border border-white/10 rounded-[2rem] p-8 hover:bg-[#161616] transition-colors relative">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                        <Shield className="text-emerald-400" size={24} /> {t('featPrivacy') || "Private & Secure"}
                    </h3>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">{t('featPrivacyDesc') || "Optional PIN codes, admin moderation, and private uploads."}</p>
                    <div className="flex gap-2">
                        <div className="h-3 flex-1 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                        <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                </div>
            </div>
        </section>
    );
});