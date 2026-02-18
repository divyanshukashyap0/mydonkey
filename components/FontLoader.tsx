import React, { useEffect } from 'react';
import { useStore } from '../context/StoreContext';

const FontLoader: React.FC = () => {
    const { settings } = useStore();

    useEffect(() => {
        console.log('[FontLoader] Applying fonts:', { website: settings.websiteFont, rank: settings.rankFont });

        // 1. Website Font (Body)
        const webFont = settings.websiteFont || 'Inter';
        if (webFont !== 'Inter') {
            const linkId = 'dynamic-font-website';
            let link = document.getElementById(linkId) as HTMLLinkElement;
            if (!link) {
                link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            link.href = `https://fonts.googleapis.com/css2?family=${webFont.replace(/\s+/g, '+')}:wght@300;400;500;600;700;900&display=swap`;
        }
        // Always set the variable
        document.documentElement.style.setProperty('--font-body', `"${webFont}", sans-serif`);

        // 2. Rank Font (Special)
        const rankFont = settings.rankFont || 'Anton';
        if (rankFont !== 'Anton') {
            const linkId = 'dynamic-font-rank';
            let link = document.getElementById(linkId) as HTMLLinkElement;
            if (!link) {
                link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            link.href = `https://fonts.googleapis.com/css2?family=${rankFont.replace(/\s+/g, '+')}:wght@400;700;900&display=swap`;
        }
        // Always set the variable
        // Always set the variable
        document.documentElement.style.setProperty('--font-rank', `"${rankFont}", sans-serif`);

        // 3. Hero Font (Title)
        const heroFont = settings.heroFont || settings.websiteFont || 'Inter';
        if (heroFont !== 'Inter' && heroFont !== webFont && heroFont !== rankFont) {
            const linkId = 'dynamic-font-hero';
            let link = document.getElementById(linkId) as HTMLLinkElement;
            if (!link) {
                link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            link.href = `https://fonts.googleapis.com/css2?family=${heroFont.replace(/\s+/g, '+')}:wght@700;900&display=swap`;
        }
        document.documentElement.style.setProperty('--font-hero', `"${heroFont}", sans-serif`);

    }, [settings.websiteFont, settings.rankFont, settings.heroFont]);

    return null;
};

export default FontLoader;
