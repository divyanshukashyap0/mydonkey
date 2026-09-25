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


};

export default TheatreFAB;
