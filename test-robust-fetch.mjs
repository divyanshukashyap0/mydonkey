import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function fetchTMDBEpisode(tmdbId, seasonNumber, episodeNumber) {
    const url = `${TMDB_BASE}/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${API_KEY}&language=en-US&append_to_response=videos&include_video_language=en,null`;
    const res = await fetch(url);
    if (!res.ok) return {};
    return res.json();
}

function extractTMDBEpisodeVideo(detail) {
    if (!detail.videos || !detail.videos.results) return undefined;
    const items = detail.videos.results;
    const clip = items.find(v => (v.type === 'Clip' || v.type === 'Teaser' || v.type === 'Trailer' || v.type === 'Opening Credits' || v.type === 'Featurette') && v.site === 'YouTube');
    return clip?.key || items.find(v => v.site === 'YouTube')?.key;
}

const TESTS = [
    { id: 82856, season: 1, episode: 1, name: "The Mandalorian" },
    { id: 66732, season: 1, episode: 1, name: "Stranger Things" },
    { id: 60625, season: 2, episode: 1, name: "Rick and Morty S02E01" }
];

async function runTests() {
    for (const t of TESTS) {
        const detail = await fetchTMDBEpisode(t.id, t.season, t.episode);
        const videoId = extractTMDBEpisodeVideo(detail);
        console.log(`${t.name}: ${videoId || 'NOT FOUND'}`);
    }
}

runTests();
