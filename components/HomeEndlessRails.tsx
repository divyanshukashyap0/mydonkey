import React, { useState, useEffect, useRef } from 'react';
import { Content } from '../types';
import ContentRail from './ContentRail';
import { useStore } from '../context/StoreContext';
import { fetchHomeCuratedRails, HomeCuratedRail } from '../services/tmdbService';

interface HomeEndlessRailsProps {
    onDetails: (item: Content) => void;
    onPlay?: (item: Content, mode?: 'trailer' | 'movie') => void;
}

export const HomeEndlessRails: React.FC<HomeEndlessRailsProps> = ({ onDetails, onPlay }) => {
    const { settings, sections } = useStore();
    const [rails, setRails] = useState<HomeCuratedRail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const hasFetchedRef = useRef(false);

    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        let isCancelled = false;
        fetchHomeCuratedRails(settings).then(fetchedRails => {
            if (!isCancelled && fetchedRails.length > 0) {
                setRails(fetchedRails);
            }
        }).catch(err => {
            console.error('[HomeEndlessRails] Failed to fetch curated rails:', err);
        }).finally(() => {
            if (!isCancelled) setIsLoading(false);
        });

        return () => {
            isCancelled = true;
        };
    }, [settings]);

    if (isLoading && rails.length === 0) {
        return (
            <div className="space-y-6 px-4 md:px-12 py-4">
                <div className="h-6 w-48 bg-zinc-800/60 rounded animate-pulse" />
                <div className="flex gap-4 overflow-hidden">
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} className="w-40 sm:w-48 aspect-[2/3] bg-zinc-800/40 rounded-xl animate-pulse flex-shrink-0" />
                    ))}
                </div>
            </div>
        );
    }

    // Filter out rails that duplicate sections already shown above
    const homeSections = sections.filter(s => s.enabled && s.scopes?.includes('home'));
    const hasMarvelSection = homeSections.some(s => (s.title || '').toLowerCase().includes('marvel') || s.tagFilter?.toLowerCase() === 'marvel');
    const hasIndianSection = homeSections.some(s => (s.title || '').toLowerCase().includes('indian') || (s.title || '').toLowerCase().includes('bollywood'));

    const distinctRails = rails.filter(rail => {
        if (hasMarvelSection && rail.id === 'rail_marvel_cinematic') return false;
        if (hasIndianSection && rail.id === 'rail_indian_blockbusters') return false;
        return true;
    });

    if (distinctRails.length === 0) return null;

    return (
        <div className="space-y-8 md:space-y-12">
            {distinctRails.map((rail) => (
                <ContentRail
                    key={rail.id}
                    title={rail.title}
                    items={rail.items}
                    onDetails={onDetails}
                    onPlay={onPlay}
                    badge={rail.badge}
                    subtitle={rail.subtitle}
                />
            ))}
        </div>
    );
};
