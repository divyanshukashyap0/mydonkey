import { fetchTMDBDetails, fetchTMDBSeason, fetchTMDBEpisode, extractTMDBTrailer, extractTMDBEpisodeVideo } from './services/tmdbService.ts';

// Mocking fetch as the service uses it and we are in a node-like environment (Vite/TS/JS)
// But wait, I can just use the existing test-tmdb.mjs as a reference and create a new one.

const TMDB_ID = 82856; // The Mandalorian
const API_KEY = process.env.VITE_TMDB_API_KEY;

async function test() {
    console.log("Testing TMDB Enhancements...");
    
    try {
        const detail = await fetchTMDBDetails(TMDB_ID, 'tv');
        console.log("TV Details Fetched:", detail.name);
        
        const season = await fetchTMDBSeason(TMDB_ID, 1);
        console.log("Season 1 Fetched:", season.name);
        
        const seasonTrailer = extractTMDBTrailer(season);
        console.log("Season Trailer ID:", seasonTrailer);
        
        if (season.episodes && season.episodes.length > 0) {
            const ep = season.episodes[0];
            const epDetail = await fetchTMDBEpisode(TMDB_ID, 1, ep.episode_number);
            console.log("Episode 1 Details Fetched:", epDetail.name);
            
            const epVideo = extractTMDBEpisodeVideo(epDetail);
            console.log("Episode 1 Video ID:", epVideo);
        }
        
    } catch (e) {
        console.error("Test failed:", e.message);
    }
}

test();
