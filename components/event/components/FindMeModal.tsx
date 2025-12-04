import * as React from 'react';
import { X, Search, Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { MediaItem, TranslateFn } from '../../../types';

/**
 * FindMeModal Component
 *
 * A modal for the "Find Me" feature that allows users to:
 * - Upload a photo of themselves
 * - Use camera to capture an image
 * - Have the system scan event photos to find matches
 *
 * @component
 */
interface FindMeModalProps {
    /** Whether the modal is open */
    isFindMeOpen: boolean;
    /** Function to toggle modal visibility */
    setIsFindMeOpen: (open: boolean) => void;
    /** Current find me image, if selected */
    findMeImage: MediaItem | null;
    /** Function to set the find me image */
    setFindMeImage: (image: MediaItem | null) => void;
    /** Whether face scanning is in progress */
    isScanning: boolean;
    /** Function to handle image upload */
    handleFindMeUpload: (file: File) => void;
    /** Translation function for internationalization */
    t: TranslateFn;
}

export const FindMeModal: React.FC<FindMeModalProps> = ({
    isFindMeOpen,
    setIsFindMeOpen,
    findMeImage,
    setFindMeImage,
    isScanning,
    handleFindMeUpload,
    t
}) => {
    const [uploadMethod, setUploadMethod] = React.useState<'camera' | 'upload'>('camera');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFindMeUpload(file);
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    if (!isFindMeOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900">{t('findMeInPhotos')}</h3>
                    <button onClick={() => setIsFindMeOpen(false)} className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center space-y-6">
                    {/* Method Selection */}
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={() => setUploadMethod('camera')}
                            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${uploadMethod === 'camera' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            <Camera size={18} className="inline-block mr-2" />
                            {t('useCamera')}
                        </button>
                        <button
                            onClick={() => setUploadMethod('upload')}
                            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${uploadMethod === 'upload' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            <Upload size={18} className="inline-block mr-2" />
                            {t('uploadPhoto')}
                        </button>
                    </div>

                    {/* Upload Area */}
                    <div className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                        {uploadMethod === 'camera' ? (
                            <div className="space-y-4">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                                    <Camera size={32} className="text-indigo-600" />
                                </div>
                                <p className="text-slate-600">{t('cameraAccessMessage')}</p>
                                <button
                                    onClick={() => { }}
                                    className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                                >
                                    {t('openCamera')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                                    <ImageIcon size={32} className="text-indigo-600" />
                                </div>
                                <p className="text-slate-600">{t('uploadFindMePhoto')}</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={triggerFileUpload}
                                    className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                                >
                                    {t('selectPhoto')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status */}
                    {isScanning && (
                        <div className="flex items-center gap-2 text-indigo-600">
                            <div className="w-4 h-4 rounded-full bg-indigo-100 animate-pulse"></div>
                            <span>{t('scanningPhotos')}</span>
                        </div>
                    )}

                    {/* Current Find Me Image */}
                    {findMeImage && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl w-full">
                            <h4 className="font-semibold text-slate-800 mb-2">{t('yourFindMePhoto')}</h4>
                            <div className="relative">
                                <img
                                    src={findMeImage.url}
                                    alt="Find Me"
                                    className="w-full h-32 object-cover rounded-lg"
                                />
                                <button
                                    onClick={() => setFindMeImage(null)}
                                    className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white"
                                >
                                    <X size={16} className="text-slate-600" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};