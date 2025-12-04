import React, { useState, useEffect } from 'react';
import { mobilePerformanceTest } from '../utils/mobilePerformanceTest';
import { useMobilePerformance } from '../context/MobilePerformanceContext';
import { MobileOptimizedImage, MobileOptimizedVideo } from '../context/MobilePerformanceContext';

interface MobilePerformanceTestProps {
    onTestComplete?: (results: any) => void;
    showDetailedResults?: boolean;
}

export const MobilePerformanceTest: React.FC<MobilePerformanceTestProps> = ({
    onTestComplete,
    showDetailedResults = false
}) => {
    const [testResults, setTestResults] = useState<any>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState<string | null>(null);

    const mobilePerf = useMobilePerformance();

    const runPerformanceTests = async () => {
        setIsTesting(true);
        setProgress('Starting performance tests...');
        setError(null);

        try {
            const results: Record<string, any> = {};

            // Test 1: Performance Profile
            setProgress('Testing device profile...');
            results.performanceProfile = mobilePerformanceTest.testPerformanceProfile();

            // Test 2: Image Loading
            setProgress('Testing image loading...');
            const imageTest = await mobilePerformanceTest.testImageLoading(
                'https://via.placeholder.com/600x400',
                'medium'
            );
            results.imageLoading = imageTest;

            // Test 3: Video Loading
            setProgress('Testing video loading...');
            const videoTest = await mobilePerformanceTest.testVideoLoading(
                'https://www.w3schools.com/html/mov_bbb.mp4',
                'medium'
            );
            results.videoLoading = videoTest;

            // Test 4: Touch Performance
            setProgress('Testing touch performance...');
            const touchTest = await mobilePerformanceTest.testTouchPerformance(() => {
                // Simple callback for testing
                return;
            }, 5);
            results.touchPerformance = touchTest;

            // Test 5: Network Performance
            setProgress('Testing network performance...');
            const networkTest = await mobilePerformanceTest.testNetworkPerformance(
                'https://via.placeholder.com/100x100'
            );
            results.networkPerformance = networkTest;

            // Test 6: Strategy Analysis
            setProgress('Analyzing optimization strategies...');
            results.strategies = {
                imageLoading: mobilePerf.imageLoadingStrategy,
                video: mobilePerf.videoStrategy,
                animation: mobilePerf.animationSettings,
                touch: mobilePerf.touchSettings
            };

            setTestResults(results);
            onTestComplete?.(results);

            return results;
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Unknown error during testing');
            console.error('Performance test failed:', error);
            throw error;
        } finally {
            setIsTesting(false);
            setProgress('Performance tests completed');
        }
    };

    const getPerformanceScore = (): number => {
        if (!testResults) return 0;

        let score = 0;
        const maxScore = 100;

        // Device profile score
        if (testResults.performanceProfile?.isMobile) score += 10;
        if (!testResults.performanceProfile?.isSlowNetwork) score += 15;
        if (testResults.performanceProfile?.memoryStatus !== 'low') score += 10;

        // Image loading score
        if (testResults.imageLoading?.success) {
            score += 20;
            if (testResults.imageLoading.loadTime < 500) score += 10;
        }

        // Video loading score
        if (testResults.videoLoading?.success) {
            score += 15;
            if (testResults.videoLoading.loadTime < 1000) score += 5;
        }

        // Touch performance score
        if (testResults.touchPerformance?.success) {
            score += 10;
            if (testResults.touchPerformance.averageTime < 20) score += 5;
        }

        // Network performance score
        if (testResults.networkPerformance?.success) {
            score += 10;
            if (testResults.networkPerformance.downloadSpeed > 100) score += 5;
        }

        return Math.min(Math.max(0, score), maxScore);
    };

    const getPerformanceGrade = (score: number): string => {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    };

    const getOptimizationRecommendations = (): string[] => {
        if (!testResults) return [];

        const recommendations: string[] = [];

        // Mobile-specific recommendations
        if (testResults.performanceProfile?.isMobile) {
            recommendations.push('📱 Mobile device detected - optimizations are active');

            if (testResults.performanceProfile.isSlowNetwork) {
                recommendations.push('🌐 Slow network detected - using aggressive optimizations');
                recommendations.push('📶 Consider using WiFi for better performance');
            }

            if (testResults.performanceProfile.memoryStatus === 'low') {
                recommendations.push('💾 Low memory detected - reducing animation complexity');
            }
        } else {
            recommendations.push('💻 Desktop device detected - using standard settings');
        }

        // Image loading recommendations
        if (testResults.imageLoading?.loadTime > 1000) {
            recommendations.push('🖼️ Images loading slowly - consider compression');
        }

        // Video loading recommendations
        if (testResults.videoLoading?.loadTime > 2000) {
            recommendations.push('🎥 Videos loading slowly - consider lower resolution');
        }

        // Touch performance recommendations
        if (testResults.touchPerformance?.averageTime > 50) {
            recommendations.push('👆 Touch response could be improved - consider debouncing');
        }

        return recommendations;
    };

    useEffect(() => {
        // Auto-run tests on component mount if not already run
        if (!testResults && !isTesting) {
            runPerformanceTests();
        }
    }, []);

    const performanceScore = getPerformanceScore();
    const performanceGrade = getPerformanceGrade(performanceScore);
    const recommendations = getOptimizationRecommendations();

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                📊 Mobile Performance Test
                {isTesting && <span className="text-sm text-slate-500">({progress})</span>}
            </h2>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4">
                    ❌ Error: {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <h3 className="font-bold text-indigo-800 mb-2">Performance Score</h3>
                    <div className="text-4xl font-black text-indigo-600 mb-1">
                        {testResults ? performanceScore : '--'}
                    </div>
                    <div className="text-sm text-indigo-500 font-bold">
                        Grade: {testResults ? performanceGrade : '--'}
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h3 className="font-bold text-slate-800 mb-2">Device Profile</h3>
                    {testResults?.performanceProfile ? (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Mobile:</span>
                                <span className="font-bold">{testResults.performanceProfile.isMobile ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Platform:</span>
                                <span className="font-bold">
                                    {testResults.performanceProfile.isIOS ? 'iOS' :
                                        testResults.performanceProfile.isAndroid ? 'Android' : 'Other'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Network:</span>
                                <span className="font-bold">
                                    {testResults.performanceProfile.isSlowNetwork ? 'Slow' : 'Normal'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Memory:</span>
                                <span className="font-bold">
                                    {testResults.performanceProfile.memoryStatus}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-400">Running tests...</div>
                    )}
                </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-green-800 mb-2">Optimization Recommendations</h3>
                {recommendations.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                        {recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-green-500">All optimizations are working well!</p>
                )}
            </div>

            {showDetailedResults && testResults && (
                <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h3 className="font-bold text-slate-800 mb-3">Detailed Test Results</h3>

                        <div className="space-y-3">
                            <div>
                                <h4 className="font-semibold text-slate-700 mb-1">Image Loading</h4>
                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Load Time:</span>
                                        <span className="font-bold">
                                            {testResults.imageLoading?.loadTime.toFixed(2) || 'N/A'}ms
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Success:</span>
                                        <span className="font-bold">
                                            {testResults.imageLoading?.success ? '✅' : '❌'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-700 mb-1">Video Loading</h4>
                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Load Time:</span>
                                        <span className="font-bold">
                                            {testResults.videoLoading?.loadTime.toFixed(2) || 'N/A'}ms
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Success:</span>
                                        <span className="font-bold">
                                            {testResults.videoLoading?.success ? '✅' : '❌'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-700 mb-1">Touch Performance</h4>
                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Avg Time:</span>
                                        <span className="font-bold">
                                            {testResults.touchPerformance?.averageTime.toFixed(2) || 'N/A'}ms
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Success:</span>
                                        <span className="font-bold">
                                            {testResults.touchPerformance?.success ? '✅' : '❌'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-700 mb-1">Network Performance</h4>
                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Download Speed:</span>
                                        <span className="font-bold">
                                            {testResults.networkPerformance?.downloadSpeed.toFixed(2) || 'N/A'} KB/s
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Latency:</span>
                                        <span className="font-bold">
                                            {testResults.networkPerformance?.latency.toFixed(2) || 'N/A'}ms
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Success:</span>
                                        <span className="font-bold">
                                            {testResults.networkPerformance?.success ? '✅' : '❌'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h3 className="font-bold text-blue-800 mb-3">Optimization Strategies</h3>

                        <div className="space-y-3">
                            <div>
                                <h4 className="font-semibold text-blue-700 mb-1">Image Loading Strategy</h4>
                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-blue-500">Loading:</span>
                                        <span className="font-bold">
                                            {testResults.strategies?.imageLoading.loading}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-500">Quality:</span>
                                        <span className="font-bold">
                                            {testResults.strategies?.imageLoading.quality}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-blue-700 mb-1">Video Strategy</h4>
                                <div className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-blue-500">AutoPlay:</span>
                                        <span className="font-bold">
                                            {testResults.strategies?.video.autoPlay ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-500">Resolution:</span>
                                        <span className="font-bold">
                                            {testResults.strategies?.video.maxResolution}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={runPerformanceTests}
                    disabled={isTesting}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    {isTesting ? 'Testing...' : 'Run Performance Tests'}
                </button>

                {testResults && (
                    <button
                        onClick={() => mobilePerformanceTest.logPerformanceReport()}
                        className="bg-slate-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-slate-700 transition-colors"
                    >
                        📋 Log Report
                    </button>
                )}
            </div>

            {/* Mobile Optimized Components Demo */}
            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-800 mb-3">Mobile Optimized Components Demo</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <p className="text-sm text-slate-500 mb-2">Optimized Image</p>
                        <MobileOptimizedImage
                            src="https://via.placeholder.com/300x200"
                            alt="Optimized Test Image"
                            priority="high"
                            className="w-full rounded-lg shadow-md"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Strategy: {mobilePerf.imageLoadingStrategy.loading} /
                            {mobilePerf.imageLoadingStrategy.quality}
                        </p>
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-slate-500 mb-2">Optimized Video</p>
                        <MobileOptimizedVideo
                            src="https://www.w3schools.com/html/mov_bbb.mp4"
                            priority="medium"
                            className="w-full rounded-lg shadow-md"
                            controls
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Strategy: {mobilePerf.videoStrategy.preload} /
                            {mobilePerf.videoStrategy.maxResolution}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Mobile Performance Test Modal Component
interface MobilePerformanceTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTestComplete?: (results: any) => void;
}

export const MobilePerformanceTestModal: React.FC<MobilePerformanceTestModalProps> = ({
    isOpen,
    onClose,
    onTestComplete
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-slate-600 hover:text-slate-900 transition-colors z-10"
                >
                    ✕
                </button>

                <div className="p-6">
                    <MobilePerformanceTest
                        onTestComplete={onTestComplete}
                        showDetailedResults
                    />
                </div>
            </div>
        </div>
    );
};