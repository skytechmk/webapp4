import * as React from 'react';
import { X, Check, Crown, ArrowUp, User as UserIcon, Shield, Star, Gift } from 'lucide-react';
import { User, UserRole, TierLevel, TranslateFn } from '../../../types';

/**
 * UserUpgradeModal Component
 *
 * A modal for upgrading user tiers and granting admin access.
 * Shows current user information and available upgrade options.
 * Allows administrators to upgrade users to higher tiers or grant admin privileges.
 *
 * @component
 */
interface UserUpgradeModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Function to close the modal */
    onClose: () => void;
    /** User to upgrade */
    user: User;
    /** Function to handle tier upgrade */
    onUpgrade: (newTier: TierLevel) => void;
    /** Translation function for internationalization */
    t: TranslateFn;
}

export const UserUpgradeModal: React.FC<UserUpgradeModalProps> = ({
    isOpen,
    onClose,
    user,
    onUpgrade,
    t
}) => {
    const tiers: TierLevel[] = [TierLevel.BASIC, TierLevel.PRO, TierLevel.STUDIO];

    const getTierFeatures = (tier: TierLevel) => {
        const features: Record<TierLevel, string[]> = {
            [TierLevel.FREE]: [
                t('freeTierFeature1'),
                t('freeTierFeature2'),
                t('freeTierFeature3')
            ],
            [TierLevel.BASIC]: [
                t('basicTierFeature1'),
                t('basicTierFeature2'),
                t('basicTierFeature3'),
                t('basicTierFeature4')
            ],
            [TierLevel.PRO]: [
                t('proTierFeature1'),
                t('proTierFeature2'),
                t('proTierFeature3'),
                t('proTierFeature4'),
                t('proTierFeature5')
            ],
            [TierLevel.STUDIO]: [
                t('studioTierFeature1'),
                t('studioTierFeature2'),
                t('studioTierFeature3'),
                t('studioTierFeature4'),
                t('studioTierFeature5'),
                t('studioTierFeature6')
            ]
        };
        return features[tier] || [];
    };

    const handleUpgrade = (tier: TierLevel) => {
        onUpgrade(tier);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900">{t('upgradeUser')}</h3>
                    <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Current User Info */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <h4 className="font-semibold text-slate-800 mb-3">{t('currentUserInfo')}</h4>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-indigo-600 font-bold text-lg">
                                    {user.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <h5 className="font-semibold text-slate-900">{user.name}</h5>
                                <p className="text-sm text-slate-600">{user.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-medium text-slate-700">{t('currentTier')}: {user.tier}</span>
                                    {user.role === UserRole.ADMIN && (
                                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full font-medium">
                                            {t('admin')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Available Upgrades */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-slate-800 mb-3">{t('availableUpgrades')}</h4>

                        <div className="space-y-4">
                            {tiers.map(tier => (
                                <div key={tier} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Crown size={18} className="text-indigo-600" />
                                                <h5 className="font-semibold text-slate-900">{tier}</h5>
                                                {user.tier === tier && (
                                                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-medium">
                                                        {t('current')}
                                                    </span>
                                                )}
                                            </div>

                                            <ul className="space-y-2 text-sm text-slate-600">
                                                {getTierFeatures(tier).map((feature, index) => (
                                                    <li key={index} className="flex items-center gap-2">
                                                        <Check size={14} className="text-green-500" />
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {user.tier !== tier ? (
                                                <button
                                                    onClick={() => handleUpgrade(tier)}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                                >
                                                    <ArrowUp size={16} />
                                                    {t('upgrade')}
                                                </button>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl font-medium cursor-not-allowed"
                                                >
                                                    {t('currentPlan')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Special Admin Options */}
                    {user.role !== UserRole.ADMIN && (
                        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                            <h4 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                                <Shield size={18} />
                                {t('adminOptions')}
                            </h4>
                            <p className="text-sm text-indigo-700 mb-3">{t('adminUpgradeDescription')}</p>
                            <button
                                onClick={() => { }}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Star size={18} />
                                {t('grantAdminAccess')}
                            </button>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            {t('close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};