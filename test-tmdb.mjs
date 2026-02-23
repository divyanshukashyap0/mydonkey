async function testTrailer() {
    const API_KEY = "5d44293e1177a6fb42010456a8c6b4ff";
    const TMDB_BASE = 'https://api.themoviedb.org/3';

    const detailUrl = `${TMDB_BASE}/movie/550?api_key=${API_KEY}&language=en-US&append_to_response=videos`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();

    console.log("Videos field present:", !!detailData.videos);
    if (detailData.videos) {
        console.log("Videos results length:", detailData.videos.results.length);
        const trailer = detailData.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        console.log("Found Trailer:", trailer);
    }
}
testTrailer();
