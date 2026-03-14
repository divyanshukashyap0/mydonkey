import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = process.env.VITE_TMDB_API_KEY;

if (!API_KEY) {
    console.error("VITE_TMDB_API_KEY not found in .env");
    process.exit(1);
}

async function fetchTMDBSeason(tmdbId, seasonNumber) {
    const url = `${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}?api_key=${API_KEY}&language=en-US&append_to_response=videos`;
    const res = await fetch(url);
    return res.json();
}

async function fetchTMDBEpisode(tmdbId, seasonNumber, episodeNumber) {
    const url = `${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${API_KEY}&language=en-US&append_to_response=videos`;
    const res = await fetch(url);
    return res.json();
}

function extractTMDBTrailer(detail) {
    if (!detail.videos || !detail.videos.results) return undefined;
    const trailer = detail.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const teaser = detail.videos.results.find(v => v.type === 'Teaser' && v.site === 'YouTube');
    return (trailer || teaser)?.key;
}

function extractTMDBEpisodeVideo(detail) {
    if (!detail.videos || !detail.videos.results) return undefined;
    const clip = detail.videos.results.find(v => (v.type === 'Clip' || v.type === 'Teaser' || v.type === 'Trailer') && v.site === 'YouTube');
    return clip?.key;
}

const TMDB_ID = 82856; // The Mandalorian

async function test() {
    console.log("Testing TMDB Enhancements (MJS)...");
    
    try {
        console.log("Fetching Season 1...");
        const season = await fetchTMDBSeason(TMDB_ID, 1);
        const seasonTrailer = extractTMDBTrailer(season);
        console.log("Season 1 Trailer ID:", seasonTrailer);
        
        if (season.episodes && season.episodes.length > 0) {
            const ep = season.episodes[0];
            console.log(`Fetching Episode 1 (${ep.name})...`);
            const epDetail = await fetchTMDBEpisode(TMDB_ID, 1, ep.episode_number);
            const epVideo = extractTMDBEpisodeVideo(epDetail);
            console.log("Episode 1 Video ID:", epVideo);
        }
        
        if (seasonTrailer && (season.episodes[0] && extractTMDBEpisodeVideo(await fetchTMDBEpisode(TMDB_ID, 1, 1)))) {
            console.log("SUCCESS: Season trailer and episode video extracted correctly!");
        } else {
            console.warn("PARTIAL SUCCESS: Check if IDs are missing (some shows might not have them).");
        }
        
    } catch (e) {
        console.error("Test failed:", e.message);
    }
}

test();
