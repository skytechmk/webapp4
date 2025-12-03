import * as React from 'react';
import { TranslateFn } from '../types';

interface ContactSectionProps {
    t: TranslateFn;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ t }) => {
    return (
        <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto scroll-mt-20">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-center">Contact Sales</h2>
            <p className="text-slate-400 text-center max-w-2xl mx-auto mb-16 text-lg">Get in touch with our team to discuss your event needs.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                    {
                        icon: '💬',
                        method: 'WhatsApp',
                        contact: '+41 77 958 68 45',
                        link: 'https://wa.me/41779586845'
                    },
                    {
                        icon: '📱',
                        method: 'Viber',
                        contact: '+41 77 958 68 45',
                        link: 'viber://chat?number=%2B41779586845'
                    },
                    {
                        icon: '✉️',
                        method: 'Email',
                        contact: 'admin@skytech.mk',
                        link: 'mailto:admin@skytech.mk'
                    }
                ].map((contact, i) => (
                    <a
                        key={i}
                        href={contact.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#111] border border-white/10 p-8 rounded-3xl text-center hover:border-indigo-500/30 transition-all group hover:-translate-y-1 duration-300 shadow-2xl shadow-black"
                    >
                        <div className="text-4xl mb-4">{contact.icon}</div>
                        <h3 className="text-xl font-bold mb-2 text-white">{contact.method}</h3>
                        <p className="text-slate-400">{contact.contact}</p>
                    </a>
                ))}
            </div>
        </section>
    );
};