import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, ArrowLeft, Home, RefreshCw, Search } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Optional close callback (e.g. closing VideoPlayer to return to the previous view) */
    onClose?: () => void;
    /** Optional reset key; changing this resets the caught error state automatically */
    resetKey?: string | number | null;
    /** Optional title shown on the fallback screen */
    title?: string;
    /** Optional subtitle shown on the fallback screen */
    subtitle?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    errorMessage: string;
    searchQuery: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            errorMessage: '',
            searchQuery: '',
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            errorMessage: error?.message || 'An unexpected error occurred.',
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught rendering error:', error, errorInfo);
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps) {
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false, errorMessage: '' });
        }
    }

    handleGoBack = () => {
        this.setState({ hasError: false, errorMessage: '' });
        if (this.props.onClose) {
            this.props.onClose();
            return;
        }
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    };

    handleRetry = () => {
        this.setState({ hasError: false, errorMessage: '' });
    };

    handleGoHome = () => {
        this.setState({ hasError: false, errorMessage: '' });
        if (this.props.onClose) {
            this.props.onClose();
        }
        window.location.href = '/';
    };

    handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = this.state.searchQuery.trim();
        this.setState({ hasError: false, errorMessage: '' });
        if (this.props.onClose) {
            this.props.onClose();
        }
        window.location.href = q ? `/search?q=${encodeURIComponent(q)}` : '/search';
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        const heading = this.props.title || 'Playback Interrupted';
        const description =
            this.props.subtitle ||
            'This title ran into an unexpected error. You can go back to the previous page, retry, or search for something else to watch.';

        return (
            <div className="fixed inset-0 z-[9999] bg-[#0a0a0d] text-white flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Subtle ambient glow */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-brand-red/15 blur-[120px] rounded-full" />
                </div>

                <div className="relative z-10 w-full max-w-md bg-[#121318] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9)] ring-1 ring-white/10 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red">
                        <AlertTriangle size={28} />
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        {heading}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">
                        {description}
                    </p>

                    {/* Instant Search Bar */}
                    <form onSubmit={this.handleSearchSubmit} className="mt-5">
                        <div className="flex items-center gap-2 bg-black/60 border border-white/15 focus-within:border-brand-red/70 rounded-2xl p-1.5 transition">
                            <Search size={16} className="text-gray-400 ml-2.5 shrink-0" />
                            <input
                                type="text"
                                value={this.state.searchQuery}
                                onChange={(e) => this.setState({ searchQuery: e.target.value })}
                                placeholder="Search movies, TV shows, anime..."
                                className="flex-1 bg-transparent text-white placeholder-gray-500 text-xs sm:text-sm px-1.5 py-2 focus:outline-none min-w-0"
                            />
                            <button
                                type="submit"
                                className="px-3.5 py-2 rounded-xl bg-brand-red hover:bg-red-600 active:scale-95 text-white text-xs font-bold shrink-0 transition cursor-pointer"
                            >
                                Search
                            </button>
                        </div>
                    </form>

                    {/* Primary Navigation Actions */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            onClick={this.handleGoBack}
                            className="w-full py-2.5 px-4 rounded-xl bg-white text-black hover:bg-gray-200 active:scale-95 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            <span>Previous Page</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                this.setState({ hasError: false, errorMessage: '' });
                                if (this.props.onClose) this.props.onClose();
                                window.location.href = '/search';
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                            <Search size={15} />
                            <span>Search Again</span>
                        </button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="mt-3 flex items-center justify-center gap-4 pt-3 border-t border-white/10">
                        <button
                            type="button"
                            onClick={this.handleRetry}
                            className="text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
                        >
                            <RefreshCw size={13} />
                            <span>Try Again</span>
                        </button>
                        <button
                            type="button"
                            onClick={this.handleGoHome}
                            className="text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
                        >
                            <Home size={13} />
                            <span>Go Home</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
