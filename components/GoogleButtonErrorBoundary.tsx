import * as React from 'react';

interface GoogleButtonErrorBoundaryState {
    hasError: boolean;
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