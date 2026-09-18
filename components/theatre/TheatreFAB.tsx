import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Armchair, Sparkles } from 'lucide-react';

interface TheatreFABProps {
  className?: string;
  onClick?: () => void;
}

export const TheatreFAB: React.FC<TheatreFABProps> = ({ className = '', onClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide the FAB if we're already on the theatre page or in an active video player
  if (location.pathname.startsWith('/theatre') || location.pathname.startsWith('/theater') || location.pathname.startsWith('/watch/')) {
    return null;
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/theatre');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed right-5 bottom-6 md:bottom-8 z-[95] inline-flex items-center gap-2.5 px-4 md:px-5 py-2.5 md:py-3 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-extrabold text-xs md:text-sm shadow-[0_8px_30px_rgba(245,158,11,0.45),0_4px_20px_rgba(0,0,0,0.8)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.65)] hover:scale-105 active:scale-95 transition-all duration-300 border border-yellow-200/50 group cursor-pointer ${className}`}
      title="Enter 3D Virtual Cinema"
      aria-label="Enter 3D Virtual Cinema"
    >
      <div className="relative">
        <Armchair size={18} className="transition-transform group-hover:-rotate-6" />
        <Sparkles size={10} className="absolute -top-1 -right-1 text-white animate-ping opacity-75" />
      </div>
      <span className="tracking-tight uppercase font-black">3D Theatre</span>
      <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-black/20 text-black">
        VR Room
      </span>
    </button>
  );
};

export default TheatreFAB;
