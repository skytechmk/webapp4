import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TranslateFn } from '../types';

interface StudioSectionProps {
    t: TranslateFn;
    onContactSales: (tier?: any) => void;
}

export const StudioSection: React.FC<StudioSectionProps> = ({ t, onContactSales }) => {
    return (
        <section className="py-24 bg-gradient-to-b from-[#0A0A0A] to-black border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
                <div className="bg-gradient-to-br from-amber-500/5 to-orange-600/5 border border-amber-500/20 rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

                    <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                        <div className="flex-1 space-y-8 text-center md:text-left">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wider">
                                {t('studioDashboard') || "SnapifY for Professionals"}
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-amber-50">{t('proTitle')}</h2>
                            <p className="text-amber-100/70 text-lg max-w-lg leading-relaxed mx-auto md:mx-0">
                                {t('proDesc')} Instant delivery, automated watermarking, and lead generation. Stop chasing clients for emails.
                            </p>
                            <ul className="space-y-4 inline-block text-left">
                                {['Automated Watermarking', 'Instant ZIP Delivery', 'Client Data Capture', 'White-label Galleries'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-amber-100/80">
                                        <CheckCircle2 size={20} className="text-amber-400 shrink-0" /> {item}
                                    </li>
                                ))}
                            </ul>
                            <div className="pt-4">
                                <button onClick={() => onContactSales()} className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20">
                                    Apply for Studio Account
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 w-full relative perspective-1000">
                            {/* Mock UI for Studio */}
                            <div className="bg-[#0f0f0f] border border-amber-500/20 rounded-2xl p-6 shadow-2xl rotate-y-12 md:rotate-6 hover:rotate-0 transition-transform duration-700 max-w-sm mx-auto">
                                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold border border-amber-500/30">LS</div>
                                        <div>
                                            <div className="font-bold text-white">Luxe Studios</div>
                                            <div className="text-xs text-slate-400">Pro Dashboard</div>
                                        </div>
                                    </div>
                                    <div className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">+24 Leads</div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-white/5 rounded-lg border border-white/5 p-4">
                                        <div className="flex justify-between text-xs text-slate-400 mb-2">
                                            <span>Storage Used</span>
                                            <span>75GB / 100GB</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full w-3/4 bg-amber-500 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="h-32 bg-[url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80')] bg-cover rounded-lg opacity-50 flex items-end p-2 relative">
                                        <div className="absolute bottom-2 right-2 text-[10px] text-white/50 font-bold">Luxe Studios ©</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};