import * as React from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { TranslateFn } from '../../../types';

/**
 * DeleteConfirmationModal Component
 *
 * A confirmation modal for delete actions that requires explicit user confirmation.
 * Shows a warning message and provides cancel/delete buttons.
 * Used for deleting users, events, or media items.
 *
 * @component
 */
interface DeleteConfirmationModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Function to close the modal without deleting */
    onClose: () => void;
    /** Function to confirm deletion */
    onConfirm: () => void;
    /** Type of item being deleted ('user' | 'event' | 'media') */
    itemType: 'user' | 'event' | 'media';
    /** Name of the item being deleted */
    itemName: string;
    /** Translation function for internationalization */
    t: TranslateFn;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    itemType,
    itemName,
    t
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900">{t('confirmDeletion')}</h3>
                    <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center space-y-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle size={32} className="text-red-600" />
                    </div>

                    <div className="text-center space-y-2">
                        <h4 className="text-lg font-semibold text-slate-900">{t('deleteWarning')}</h4>
                        <p className="text-slate-600">
                            {t('deleteItemWarning')} {t(itemType)}: {itemName}
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            {t('actionCannotBeUndone')}
                        </p>
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} />
                            {t('delete')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};