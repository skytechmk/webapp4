import React, { memo } from 'react';
import { QrCode, Smartphone, Cast } from 'lucide-react';
import { TranslateFn } from '../types';

interface HowItWorksSectionProps {
    t: TranslateFn;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = memo(({ t }) => {
    return (
        <section id="how-it-works" className="py-24 bg-[#0A0A0A] relative border-y border-white/5 scroll-mt-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-black mb-4">Three Steps to <span className="text-indigo-400">Magic</span></h2>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg">Forget complex apps and signup forms for guests. We made it frictionless.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/20 to-indigo-500/0 border-t border-dashed border-white/10" />

                    {[
                        { icon: QrCode, title: t('step1Title') || "1. Create", desc: t('step1Desc') || "Setup event in 30s" },
                        { icon: Smartphone, title: t('step2Title') || "2. Scan", desc: t('step2Desc') || "Guests scan QR to join" },
                        { icon: Cast, title: t('step3Title') || "3. Show", desc: t('step3Desc') || "Watch live on the big screen" },
                    ].map((step, i) => (
                        <div key={i} className="relative z-10 bg-[#050505] border border-white/10 p-8 rounded-3xl text-center hover:border-indigo-500/30 transition-all group hover:-translate-y-2 duration-300 shadow-2xl shadow-black">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                                <step.icon className="text-indigo-400" size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">{step.title}</h3>
                            <p className="text-slate-400 leading-relaxed">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
});