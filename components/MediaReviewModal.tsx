import React, { useState } from 'react';
import { X, RotateCcw, Type, Send, Loader2 } from 'lucide-react';
import { TranslateFn } from '../types';

interface MediaReviewModalProps {
  type: 'image' | 'video';
  src: string;
  onConfirm: (caption: string) => void;
  onRetake: () => void;
  onCancel: () => void;
  isUploading: boolean;
  t: TranslateFn;
}

export const MediaReviewModal: React.FC<MediaReviewModalProps> = ({
  type,
  src,
  onConfirm,
  onRetake,
  onCancel,
  isUploading,
  t
}) => {
  const [caption, setCaption] = useState('');

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in fade-in duration-200 h-[100dvh]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
        <button 
            onClick={onCancel} 
            disabled={isUploading}
            className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors disabled:opacity-0"
        >
          <X size={24} />
        </button>
        <h3 className="text-white font-bold text-lg drop-shadow-md">Preview</h3>
        <div className="w-10" /> 
      </div>

      {/* Content - Uses min-h-0 to prevent flex overflow */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-black relative overflow-hidden">
        {type === 'video' ? (
          <video 
            src={src} 
            autoPlay 
            controls 
            loop 
            playsInline 
            className="max-w-full max-h-full object-contain" 
          />
        ) : (
          <img 
            src={src} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain" 
          />
        )}
      </div>

      {/* Controls - Safe bottom padding for iPhone X+ */}
      <div className="bg-black/80 backdrop-blur-xl p-6 pb-8 z-20 border-t border-white/10">
        <div className="relative mb-4">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                <Type size={16} />
            </div>
            <input 
                type="text" 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t('leaveMessage') || "Add a caption..."}
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onRetake}
            disabled={isUploading}
            className="flex-1 py-3.5 bg-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={18} />
            {t('retry') || "Retake"}
          </button>
          <button 
            onClick={() => onConfirm(caption)}
            disabled={isUploading}
            className="flex-[2] py-3.5 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-70 shadow-lg shadow-indigo-900/30"
          >
            {isUploading ? (
                <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Uploading...</span>
                </>
            ) : (
                <>
                    <Send size={18} />
                    {t('upload') || "Upload"}
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};