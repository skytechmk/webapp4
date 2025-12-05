import * as React from 'react';
import { handlePostMessageError, postMessageFallbacks } from '../utils/postMessageUtils';

interface GoogleButtonErrorBoundaryState {
    hasError: boolean;
    errorType?: string;
}

interface GoogleButtonErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export class GoogleButtonErrorBoundary extends React.Component<
    GoogleButtonErrorBoundaryProps,
    GoogleButtonErrorBoundaryState
> {
    constructor(props: GoogleButtonErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): GoogleButtonErrorBoundaryState {
        console.error('Google Button Error Boundary caught an error:', error);
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Google Button Error Boundary details:', error, errorInfo);

        // Check if this is a postMessage-related error
        if (error.message.includes('postMessage') || error.message.includes('Cross-Origin-Opener-Policy')) {
            const postMessageError = {
                type: 'BLOCKED_BY_COOP',
                message: error.message,
                name: 'PostMessageError',
                originalError: error
            };

            // Handle the postMessage error with appropriate fallback
            handlePostMessageError(
                postMessageError as any,
                'Google Button Rendering',
                postMessageFallbacks.googleSignIn
            );

            // Update state to show specific error type
            this.setState({ hasError: true, errorType: 'POST_MESSAGE_BLOCKED' });
        } else {
            this.setState({ hasError: true });
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="h-[44px] w-full flex justify-center">
                    <button
                        onClick={() => {
                            if (window.google && window.google.accounts) {
                                window.google.accounts.id.prompt();
                            }
                        }}
                        className="w-full bg-white text-black font-bold py-3 rounded-full flex items-center justify-center gap-2"
                    >
                        <span>Continue with Google</span>
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}