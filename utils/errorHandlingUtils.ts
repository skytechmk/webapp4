/**
 * Error Handling Utilities Module
 * Focused utility functions for error handling
 */

export const handleError = (
    error: any,
    defaultMessage: string,
    t: (key: string) => string
): string => {
    let errorMessage = defaultMessage;

    if (error.message === 'Storage limit exceeded' || (error.response && error.response.status === 413)) {
        errorMessage = t('storageLimit') || "Storage limit exceeded. Please upgrade your plan.";
    } else if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
        errorMessage = "Network connection issue. Please check your internet connection and try again.";
    } else if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        errorMessage = "Upload timed out. Please try again with a smaller file.";
    }

    return errorMessage;
};