async function testImages() {
    const API_KEY = "5d44293e1177a6fb42010456a8c6b4ff";
    const TMDB_BASE = 'https://api.themoviedb.org/3';

    const detailUrl = `${TMDB_BASE}/movie/550?api_key=${API_KEY}&language=en-US&append_to_response=images&include_image_language=en,null`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();

    console.log("Images field present:", !!detailData.images);
    if (detailData.images) {
        console.log("Posters length:", detailData.images.posters.length);
        console.log("Backdrops length:", detailData.images.backdrops.length);
        console.log("First Poster:", detailData.images.posters[0]?.file_path);
        console.log("Second Poster:", detailData.images.posters[1]?.file_path);
        console.log("First Backdrop:", detailData.images.backdrops[0]?.file_path);
        console.log("Second Backdrop:", detailData.images.backdrops[1]?.file_path);
    }
}
testImages();
