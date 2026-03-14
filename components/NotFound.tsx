import React from 'react';
import { Home } from 'lucide-react';

interface NotFoundProps {
    onBack: () => void;
    title?: string;
    message?: string;
}

const NotFound: React.FC<NotFoundProps> = ({ 
    onBack, 
    title = "404", 
    message = "Content Unavailable or Link Broken" 
}) => {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-4 relative overflow-hidden glitch-page-active">
            {/* Full Page Glitch Overlays */}
            <div className="glitch-overlay" />
            
            {/* Background Glitch Elements */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="glitch-wrapper z-10">
                <h1 className="glitch-text font-black" data-text={title}>
                    {title}
                </h1>
                <div className="glitch-subtext font-bold mb-8">
                    SYSTEM_ERROR
                </div>
            </div>

            <div className="z-10 space-y-6">
                <p className="text-gray-400 text-xl max-w-md mx-auto leading-relaxed">
                    {message}
                </p>
                
                <button
                    onClick={onBack}
                    className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-black uppercase text-sm tracking-widest rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                    <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <Home size={20} className="relative z-10 group-hover:text-white transition-colors" />
                    <span className="relative z-10 group-hover:text-white transition-colors">Return to Reality</span>
                </button>
            </div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 background-size-[100%_2px,3px_100%]" />
        </div>
    );
};

export default NotFound;
