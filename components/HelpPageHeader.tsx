import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export interface HelpBreadcrumb {
    label: string;
    path?: string;
    active?: boolean;
}

export interface HelpPageHeaderProps {
    breadcrumbs?: HelpBreadcrumb[];
    backTo?: string | -1;
    backLabel?: string;
    rightBadge?: React.ReactNode;
}

export const HelpPageHeader: React.FC<HelpPageHeaderProps> = ({
    breadcrumbs = [],
    backTo = -1,
    backLabel = 'Back',
    rightBadge
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (typeof backTo === 'string') {
            navigate(backTo);
        } else {
            navigate(-1);
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-[#0c0c0e]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3.5 transition-all shadow-xl shadow-black/40">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                {/* Brand Logo in Corner - Redirects to Home */}
                <div className="flex items-center gap-4 sm:gap-6">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="cursor-pointer flex items-center gap-2 group transition-transform hover:scale-105 active:scale-95 focus:outline-none bg-transparent border-0 p-0"
                        title="My Donkey - Return to Home"
                    >
                        <img
                            src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/logo.png';
                            }}
                            className="h-8 sm:h-10 md:h-11 w-auto object-contain drop-shadow-[0_2px_12px_rgba(229,9,20,0.35)]"
                            alt="My Donkey"
                        />
                    </button>

                    {/* Desktop Breadcrumb Trails */}
                    {breadcrumbs.length > 0 && (
                        <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-2 text-xs text-gray-400 pl-4 border-l border-white/10">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <Home size={13} className="text-gray-400" />
                                <span>Home</span>
                            </button>
                            {breadcrumbs.map((crumb, idx) => (
                                <React.Fragment key={idx}>
                                    <span className="text-gray-600">/</span>
                                    {crumb.path && !crumb.active ? (
                                        <button
                                            type="button"
                                            onClick={() => navigate(crumb.path!)}
                                            className="hover:text-white transition-colors cursor-pointer"
                                        >
                                            {crumb.label}
                                        </button>
                                    ) : (
                                        <span className={crumb.active ? "text-brand-red font-semibold" : "text-gray-300"}>
                                            {crumb.label}
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </nav>
                    )}
                </div>

                {/* Right Action Controls: Right Badge, Back Button, Home Shortcut */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                    {rightBadge && (
                        <div className="hidden sm:block">
                            {rightBadge}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleBack}
                        className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition flex items-center gap-1.5 border border-white/10 text-xs font-medium cursor-pointer active:scale-95"
                    >
                        <ArrowLeft size={15} />
                        <span>{backLabel}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="p-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-brand-red/10 hover:bg-brand-red/20 text-red-400 hover:text-red-300 border border-brand-red/20 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="Return to Home Catalog"
                    >
                        <Home size={15} />
                        <span className="hidden sm:inline">Home</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default HelpPageHeader;
