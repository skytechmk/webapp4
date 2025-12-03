import { useState, useEffect, useRef } from 'react';
import { ZipProgress } from '../utils/zipManager';

interface DownloadProgressProps {
    progress: ZipProgress;
    estimatedSizeMb: number;
    onCancel: () => void;
    t: (key: string) => string;
}

export const DownloadProgress = ({ progress, estimatedSizeMb, onCancel, t }: DownloadProgressProps) => {
    const [showDetails, setShowDetails] = useState(false);

    // Format file size
    const formatSize = (mb: number) => {
        if (mb < 1) return '< 1 MB';
        if (mb < 1024) return `${mb.toFixed(1)} MB`;
        return `${(mb / 1024).toFixed(1)} GB`;
    };

    // Calculate estimated time remaining
    const calculateTimeRemaining = () => {
        if (progress.processedFiles === 0) return 'Calculating...';
        if (progress.isCancelled) return 'Cancelled';
        if (progress.isComplete) return 'Completed!';

        const filesPerSecond = progress.processedFiles / (Date.now() - startTimeRef.current) * 1000;
        const remainingFiles = progress.totalFiles - progress.processedFiles;
        const secondsRemaining = remainingFiles / filesPerSecond;

        if (secondsRemaining < 60) return `${Math.ceil(secondsRemaining)} seconds`;
        if (secondsRemaining < 3600) return `${Math.ceil(secondsRemaining / 60)} minutes`;
        return `${Math.ceil(secondsRemaining / 3600)} hours`;
    };

    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        startTimeRef.current = Date.now();
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{t('preparingDownload')}</h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 text-xl"
                        aria-label={t('cancel')}
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Progress bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>{t('progress')}: {progress.progressPercentage}%</span>
                            <span className="text-gray-500">{calculateTimeRemaining()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${progress.progressPercentage}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* File info */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('filesProcessed')}</span>
                            <span className="font-medium">{progress.processedFiles} / {progress.totalFiles}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('estimatedSize')}</span>
                            <span className="font-medium">{formatSize(estimatedSizeMb)}</span>
                        </div>

                        {progress.currentFile && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{t('currentFile')}</span>
                                <span className="font-medium text-indigo-600 truncate max-w-[150px]">
                                    {progress.currentFile}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Error display */}
                    {progress.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                            <div className="flex items-start gap-2">
                                <div className="text-red-500 mt-0.5">⚠️</div>
                                <div>
                                    <p className="font-medium text-red-800">{t('downloadError')}</p>
                                    <p className="text-red-600">{progress.error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 font-medium transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-700 font-medium transition-colors"
                        >
                            {showDetails ? t('hideDetails') : t('showDetails')}
                        </button>
                    </div>

                    {/* Detailed view */}
                    {showDetails && (
                        <div className="mt-4 pt-4 border-t border-gray-100 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">{t('compressionLevel')}</span>
                                <span className="font-medium">Optimal</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">{t('processingMethod')}</span>
                                <span className="font-medium">Chunked</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">{t('memoryUsage')}</span>
                                <span className="font-medium">Optimized</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};