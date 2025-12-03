import * as React from 'react';
import { TranslateFn } from '../types';

interface FAQSectionProps {
    t: TranslateFn;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ t }) => {
    return (
        <section className="py-24 bg-[#0A0A0A] border-y border-white/5">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-black mb-4">Frequently Asked <span className="text-blue-400">Questions</span></h2>
                    <p className="text-slate-400 text-lg">Everything you need to know about SnapifY</p>
                </div>

                <div className="space-y-6">
                    {[
                        {
                            question: "How does the live slideshow work?",
                            answer: "Photos appear on the big screen within seconds of being taken. Our real-time system ensures instant sharing without any lag or delays."
                        },
                        {
                            question: "Is my event data secure?",
                            answer: "Absolutely. All photos are encrypted, and you control privacy settings. Optional PIN codes and admin moderation keep everything secure."
                        },
                        {
                            question: "Do guests need to download an app?",
                            answer: "No apps required! Guests simply scan a QR code with their phone's camera and can start sharing photos immediately."
                        },
                        {
                            question: "What happens to photos after the event?",
                            answer: "You get a complete gallery with all photos organized by AI. Professional accounts include automated watermarking and instant ZIP delivery."
                        },
                        {
                            question: "Can I use this for corporate events?",
                            answer: "Definitely! SnapifY works perfectly for conferences, team building, product launches, and any event where engagement matters."
                        },
                        {
                            question: "What's the difference between free and paid plans?",
                            answer: "Free plan includes basic event creation and sharing. Paid plans add unlimited events, advanced moderation, custom branding, and priority support."
                        }
                    ].map((faq, i) => (
                        <details key={i} className="group bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all">
                            <summary className="cursor-pointer text-lg font-bold text-white flex items-center justify-between group-open:text-blue-400">
                                {faq.question}
                                <span className="text-slate-400 group-open:rotate-45 transition-transform">＋</span>
                            </summary>
                            <p className="text-slate-400 mt-4 leading-relaxed">{faq.answer}</p>
                        </details>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <p className="text-slate-400 mb-4">Still have questions?</p>
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-bold transition-all">
                        Contact Support
                    </button>
                </div>
            </div>
        </section>
    );
};