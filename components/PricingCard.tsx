
import * as React from 'react';
import { Check, Crown } from 'lucide-react';
import { PricingTier, TierLevel, TranslateFn } from '../types';

interface PricingCardProps {
  tier: PricingTier;
  onSelect: (tier: TierLevel) => void;
  current?: boolean;
  t: TranslateFn;
}

export const PricingCard: React.FC<PricingCardProps> = ({ tier, onSelect, current, t }) => {
  const isStudio = tier.id === TierLevel.STUDIO;
  const isPro = tier.id === TierLevel.PRO;
  const isFree = tier.id === TierLevel.FREE;

  // Studio Theme: Gold/Amber
  // Pro Theme: Indigo/Purple
  // Basic/Free: Slate

  let borderClass = 'border-slate-200';
  let ringClass = '';
  let badgeClass = '';
  let buttonClass = 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100';

  if (isStudio) {
    borderClass = 'border-amber-500 bg-slate-900 text-white';
    ringClass = 'ring-2 ring-amber-400';
    badgeClass = 'bg-gradient-to-r from-amber-400 to-yellow-600 text-black';
    buttonClass = 'bg-amber-500 text-black hover:bg-amber-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.5)]';
  } else if (isPro) {
    borderClass = 'border-indigo-500';
    ringClass = 'ring-2 ring-indigo-200';
    badgeClass = 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white';
    buttonClass = 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl';
  } else if (tier.id === TierLevel.BASIC) {
     buttonClass = 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl';
  }

  return (
    <div className={`relative p-8 border rounded-2xl shadow-sm flex flex-col transition-transform hover:-translate-y-1 duration-300 ${borderClass} ${ringClass} ${isStudio ? 'bg-slate-900' : 'bg-white'}`}>
      {(isPro || isStudio) && (
        <span className={`absolute top-0 right-0 px-3 py-1 -mt-3 -mr-3 text-xs font-medium rounded-full ${badgeClass}`}>
          {isStudio ? t('forProfessionals') : t('bestValue')}
        </span>
      )}
      
      <div className="mb-4">
        <div className="flex items-center gap-2">
            {isStudio && <Crown size={20} className="text-amber-400" />}
            <h3 className={`text-lg font-semibold ${isStudio ? 'text-white' : 'text-slate-900'}`}>{tier.name}</h3>
        </div>
        <p className={`text-sm mt-1 ${isStudio ? 'text-slate-400' : 'text-slate-500'}`}>{tier.limit}</p>
      </div>
      
      <div className="mb-6">
        <span className={`text-4xl font-bold ${isStudio ? 'text-white' : 'text-slate-900'}`}>{tier.price}</span>
        {!isFree && <span className={`${isStudio ? 'text-slate-500' : 'text-slate-500'}`}>/{t('event')}</span>}
      </div>
      
      <ul className="space-y-4 mb-8 flex-1">
        {tier.features.map((feature, idx) => (
          <li key={idx} className="flex items-start">
            <Check className={`w-5 h-5 mr-3 flex-shrink-0 ${isStudio ? 'text-amber-400' : 'text-green-500'}`} />
            <span className={`text-sm ${isStudio ? 'text-slate-300' : 'text-slate-600'}`}>{feature}</span>
          </li>
        ))}
      </ul>
      
      <button
        onClick={() => onSelect(tier.id)}
        className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
          current
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : buttonClass
        }`}
        disabled={current}
      >
        {current ? t('currentPlan') : tier.cta}
      </button>
    </div>
  );
};
