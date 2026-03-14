import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function test(tmdbId, type) {
    console.log(`Testing ${type} ${tmdbId}...`);
    
    const url1 = `${TMDB_BASE}/${type}/${tmdbId}?api_key=${API_KEY}&language=en-US&append_to_response=videos`;
    const url2 = `${TMDB_BASE}/${type}/${tmdbId}?api_key=${API_KEY}&language=en-US&append_to_response=videos&include_video_language=en,null`;

    const res1 = await fetch(url1);
    const data1 = await res1.json();
    
    const res2 = await fetch(url2);
    const data2 = await res2.json();

    console.log(`Standard Videos Count: ${data1.videos?.results?.length || 0}`);
    console.log(`Extended Videos Count: ${data2.videos?.results?.length || 0}`);
    
    if (data2.videos?.results) {
        data2.videos.results.forEach(v => {
            console.log(`- ${v.name} (${v.type}) [${v.site}] [${v.iso_639_1}]`);
        });
    }
}

// Let's test with a show that might have international or unindexed trailers
// Stranger Things (66732)
test(66732, 'tv');
