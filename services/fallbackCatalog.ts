import { Content, Section } from '../types';
import { tmdbPosterUrl, tmdbBackdropUrl, fetchCuratedHeroContent, fetchTMDBDiscoverByCategory, mapTMDBGenres } from './tmdbService';

/**
 * Curated Pre-compiled Fallback Content (Instant Boot <1ms)
 * Used whenever Firestore quota is exhausted or Firestore is unreachable.
 * Strictly covers:
 * 1. Marvel Cinematic Universe Movies (Avengers, Spider-Man, Deadpool, Iron Man, Thor, etc.)
 * 2. Bollywood & Top Indian Movies (RRR, Jawan, Pathaan, KGF 2, Kalki 2898 AD, Stree 2, Dangal, Pushpa, etc.)
 * 3. Top Indian TV & Web Series (Sacred Games, Mirzapur, The Family Man, Panchayat, Scam 1992, Farzi, etc.)
 * 4. Marvel Cinematic Universe TV Series (Loki, WandaVision, Moon Knight, Daredevil, etc.)
 * 5. Top Anime Series & Movies (Attack on Titan, Demon Slayer, Jujutsu Kaisen, Naruto, One Piece, etc.)
 */
export const FALLBACK_CATALOG: Content[] = [
    // â”€â”€ MARVEL MOVIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
        id: 'tmdb_299534',
        tmdbId: 299534,
        imdbId: 'tt4154796',
        title: 'Avengers: Endgame',
        overview: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos\' actions and restore balance to the universe.',
        poster_path: 'https://image.tmdb.org/t/p/w500/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
        youtubeId: 'TcMBFSGVi1c',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/299534',
        type: 'movie',
        genres: ['Action', 'Adventure', 'Sci-Fi'],
        release_date: '2019-04-24',
        vote_average: 8.3,
        year: 2019,
        duration: '3h 1m',
        rating: 'U/A 13+',
        resolution: '4K',
        tags: ['Marvel', 'MCU', 'Avengers', 'Superhero'],
        cast: ['Robert Downey Jr.', 'Chris Evans', 'Mark Ruffalo', 'Chris Hemsworth', 'Scarlett Johansson'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_634649',
        tmdbId: 634649,
        imdbId: 'tt10872600',
        title: 'Spider-Man: No Way Home',
        overview: 'Peter Parker is unmasked and no longer able to separate his normal life from the high-stakes of being a super-hero. When he asks for help from Doctor Strange the stakes become even more dangerous, forcing him to discover what it truly means to be Spider-Man.',
        poster_path: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/uyrOU4BDm2kbVxFsMiDFIHDhc4d.jpg',
        youtubeId: 'JfVOs4VSpmA',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/634649',
        type: 'movie',
        genres: ['Action', 'Adventure', 'Sci-Fi'],
        release_date: '2021-12-15',
        vote_average: 8.0,
        year: 2021,
        duration: '2h 28m',
        rating: 'U/A 13+',
        resolution: '4K',
        tags: ['Marvel', 'MCU', 'Spider-Man', 'Superhero'],
        cast: ['Tom Holland', 'Zendaya', 'Benedict Cumberbatch', 'Jacob Batalon'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_533535',
        tmdbId: 533535,
        imdbId: 'tt6263850',
        title: 'Deadpool & Wolverine',
        overview: 'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.',
        poster_path: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg',
        youtubeId: '73_1biulkYk',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/533535',
        type: 'movie',
        genres: ['Action', 'Comedy', 'Sci-Fi'],
        release_date: '2024-07-24',
        vote_average: 7.7,
        year: 2024,
        duration: '2h 8m',
        rating: 'A',
        resolution: '4K',
        tags: ['Marvel', 'MCU', 'Deadpool', 'Wolverine', 'Superhero'],
        cast: ['Ryan Reynolds', 'Hugh Jackman', 'Emma Corrin', 'Morena Baccarin'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-07-25T00:00:00Z',
    },
    {
        id: 'tmdb_299536',
        tmdbId: 299536,
        imdbId: 'tt4154756',
        title: 'Avengers: Infinity War',
        overview: 'As the Avengers and their allies have continued to protect the world from threats too large for any one hero to handle, a new danger has emerged from the cosmic shadows: Thanos.',
        poster_path: 'https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/mDfJG3LC3Dqb67AZ52x3Z0jU0uB.jpg',
        youtubeId: '6ZfuNTqbHE8',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/299536',
        type: 'movie',
        genres: ['Action', 'Adventure', 'Sci-Fi'],
        release_date: '2018-04-25',
        vote_average: 8.3,
        year: 2018,
        duration: '2h 29m',
        rating: 'U/A 13+',
        resolution: '4K',
        tags: ['Marvel', 'MCU', 'Avengers', 'Superhero'],
        cast: ['Robert Downey Jr.', 'Chris Hemsworth', 'Mark Ruffalo', 'Chris Evans'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_1726',
        tmdbId: 1726,
        imdbId: 'tt0371746',
        title: 'Iron Man',
        overview: 'After being held captive in an Afghan cave, billionaire engineer Tony Stark creates a unique weaponized suit of armor to fight evil.',
        poster_path: 'https://image.tmdb.org/t/p/w500/78lPtwv72eTNqFW9COBYI0dWDJa.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/cKvDv2LpwVEqbdXWoQl4XgGN6le.jpg',
        youtubeId: '8ugaeA-nMTc',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/1726',
        type: 'movie',
        genres: ['Action', 'Sci-Fi', 'Adventure'],
        release_date: '2008-04-30',
        vote_average: 7.6,
        year: 2008,
        duration: '2h 6m',
        rating: 'U/A 13+',
        resolution: 'HD',
        tags: ['Marvel', 'MCU', 'Iron Man', 'Superhero'],
        cast: ['Robert Downey Jr.', 'Terrence Howard', 'Jeff Bridges', 'Gwyneth Paltrow'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_284053',
        tmdbId: 284053,
        imdbId: 'tt3501632',
        title: 'Thor: Ragnarok',
        overview: 'Thor is imprisoned on the other side of the universe and finds himself in a race against time to get back to Asgard to stop Ragnarok, the destruction of his home world and the end of Asgardian civilization, at the hands of an all-powerful new threat, the ruthless Hela.',
        poster_path: 'https://image.tmdb.org/t/p/w500/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/vLmHH8jAy8Jq8uBsLucd3592WGh.jpg',
        youtubeId: 'ue80QwXMRHg',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/284053',
        type: 'movie',
        genres: ['Action', 'Adventure', 'Comedy', 'Fantasy'],
        release_date: '2017-10-24',
        vote_average: 7.6,
        year: 2017,
        duration: '2h 10m',
        rating: 'U/A 13+',
        resolution: '4K',
        tags: ['Marvel', 'MCU', 'Thor', 'Hulk', 'Superhero'],
        cast: ['Chris Hemsworth', 'Tom Hiddleston', 'Cate Blanchett', 'Mark Ruffalo'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_284054',
        tmdbId: 284054,
        imdbId: 'tt1825683',
        title: 'Black Panther',
        overview: 'King T\'Challa returns home to the reclusive, technologically advanced African nation of Wakanda to serve as his country\'s new leader. However, T\'Challa soon finds that he is challenged for the throne from factions within his own country.',
        poster_path: 'https://image.tmdb.org/t/p/w500/uxzzxijgPIY7slzFvMotPv8wjKA.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/b6ZJZHUdMEFECvGiDpJjlfUWela.jpg',
        youtubeId: 'xjDjIWPwcPU',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/284054',
        type: 'movie',
        genres: ['Action', 'Adventure', 'Sci-Fi'],
        release_date: '2018-02-13',
        vote_average: 7.4,
        year: 2018,
        duration: '2h 14m',
        rating: 'U/A 13+',
        resolution: '4K',
        tags: ['Marvel', 'MCU', 'Black Panther', 'Superhero'],
        cast: ['Chadwick Boseman', 'Michael B. Jordan', 'Lupita Nyong\'o', 'Danai Gurira'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },

    // â”€â”€ INDIAN MOVIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
        id: 'tmdb_579974',
        tmdbId: 579974,
        imdbId: 'tt8178634',
        title: 'RRR',
        overview: 'A fictional history of two legendary revolutionaries\' journey away from home before they began fighting for their country in the 1920s.',
        poster_path: 'https://image.tmdb.org/t/p/w500/u0XUBNQWlOvrh0Gd97ARGpIkL0.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/i0Y0wP8H6SRgjr6QmuwbtQbS24D.jpg',
        youtubeId: 'NgBoMJy386M',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/579974',
        type: 'movie',
        genres: ['Action', 'Drama', 'Adventure'],
        release_date: '2022-03-24',
        vote_average: 8.1,
        year: 2022,
        duration: '3h 7m',
        rating: 'U/A 16+',
        resolution: '4K',
        country: 'India',
        language: 'te',
        origin_country: ['IN'],
        original_language: 'te',
        tags: ['Indian', 'Tollywood', 'SS Rajamouli', 'Action', 'Blockbuster'],
        cast: ['N.T. Rama Rao Jr.', 'Ram Charan', 'Ajay Devgn', 'Alia Bhatt'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_872906',
        tmdbId: 872906,
        imdbId: 'tt15354916',
        title: 'Jawan',
        overview: 'An emotional journey of a prison warden driven by a personal vendetta while keeping a promise made years ago, facing a monstrous outlaw who knows no fear.',
        poster_path: 'https://image.tmdb.org/t/p/w500/jFt1gS4BGHlK8xt76Y81Alp4dbt.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/5LtSjMNw6j3LkG29Oa4O0iY5U8.jpg',
        youtubeId: 'MWOlnZSnXJo',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/872906',
        type: 'movie',
        genres: ['Action', 'Thriller', 'Drama'],
        release_date: '2023-09-07',
        vote_average: 7.6,
        year: 2023,
        duration: '2h 49m',
        rating: 'U/A 16+',
        resolution: '4K',
        country: 'India',
        language: 'hi',
        origin_country: ['IN'],
        original_language: 'hi',
        tags: ['Indian', 'Bollywood', 'Shah Rukh Khan', 'Atlee', 'Action'],
        cast: ['Shah Rukh Khan', 'Nayanthara', 'Vijay Sethupathi', 'Deepika Padukone'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_864692',
        tmdbId: 864692,
        imdbId: 'tt12844910',
        title: 'Pathaan',
        overview: 'An Indian RAW agent teams up with an undercover spy to take down a former operative-turned-rogue who plans to unleash a deadly synthetic virus across India.',
        poster_path: 'https://image.tmdb.org/t/p/w500/arf00BkwvXo0CFKbaD9OpqdE4Nu.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/9wRAIQeOv2qzcgpfvA4dYZKeezl.jpg',
        youtubeId: 'vqu4z34wENw',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/864692',
        type: 'movie',
        genres: ['Action', 'Thriller', 'Adventure'],
        release_date: '2023-01-25',
        vote_average: 7.2,
        year: 2023,
        duration: '2h 26m',
        rating: 'U/A 16+',
        resolution: '4K',
        country: 'India',
        language: 'hi',
        origin_country: ['IN'],
        original_language: 'hi',
        tags: ['Indian', 'Bollywood', 'Shah Rukh Khan', 'YRF Spy Universe'],
        cast: ['Shah Rukh Khan', 'Deepika Padukone', 'John Abraham', 'Dimple Kapadia'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_587412',
        tmdbId: 587412,
        imdbId: 'tt10698680',
        title: 'K.G.F: Chapter 2',
        overview: 'The blood-soaked land of Kolar Gold Fields has a new overlord now - Rocky, whose name strikes fear in the heart of his foes. His allies look up to Rocky as their Savior, the government sees him as a threat, and his enemies are clamoring for revenge.',
        poster_path: 'https://image.tmdb.org/t/p/w500/khNVygolU0TxLIDWff5tQlAhZ23.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/nsV5Mfi9FAV4w8eDsdr7uqVswOk.jpg',
        youtubeId: 'JKa05nyUmuQ',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/587412',
        type: 'movie',
        genres: ['Action', 'Crime', 'Drama'],
        release_date: '2022-04-14',
        vote_average: 8.2,
        year: 2022,
        duration: '2h 48m',
        rating: 'U/A 16+',
        resolution: '4K',
        country: 'India',
        language: 'kn',
        origin_country: ['IN'],
        original_language: 'kn',
        tags: ['Indian', 'Sandalwood', 'Yash', 'Prashanth Neel', 'Blockbuster'],
        cast: ['Yash', 'Sanjay Dutt', 'Raveena Tandon', 'Srinidhi Shetty'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_1022789',
        tmdbId: 1022789,
        imdbId: 'tt12735488',
        title: 'Kalki 2898 AD',
        overview: 'A modern-day avatar of Vishnu, a Hindu god, is believed to have descended to the earth to protect the world from evil forces in a futuristic dystopian world.',
        poster_path: 'https://image.tmdb.org/t/p/w500/xYqeUheNCep7ll9AotOcclGhP0X.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/p5ozvmdgsmbWe0H8Xk7Rc8SCwAB.jpg',
        youtubeId: 'kQDd1AhGIHk',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/1022789',
        type: 'movie',
        genres: ['Sci-Fi', 'Action', 'Fantasy'],
        release_date: '2024-06-27',
        vote_average: 7.8,
        year: 2024,
        duration: '3h 1m',
        rating: 'U/A 13+',
        resolution: '4K',
        country: 'India',
        language: 'te',
        origin_country: ['IN'],
        original_language: 'te',
        tags: ['Indian', 'Prabhas', 'Amitabh Bachchan', 'Sci-Fi', 'Kalki'],
        cast: ['Prabhas', 'Amitabh Bachchan', 'Kamal Haasan', 'Deepika Padukone'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-06-28T00:00:00Z',
    },
    {
        id: 'tmdb_1163258',
        tmdbId: 1163258,
        imdbId: 'tt23849204',
        title: '12th Fail',
        overview: 'Inspired by real-life stories, Manoj Kumar Sharma overcomes extreme poverty and hardships from Chambal to restart his academic journey and prepare for the world\'s most competitive civil services exam.',
        poster_path: 'https://image.tmdb.org/t/p/w500/eebUPRI4Z5e1Z7Hev4JZAwMIFkX.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/6RV2o8PBCEyw9ylOWViV1CtULIF.jpg',
        youtubeId: 'we3H4Wn_mXg',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/1163258',
        type: 'movie',
        genres: ['Drama', 'Biography'],
        release_date: '2023-10-27',
        vote_average: 8.6,
        year: 2023,
        duration: '2h 27m',
        rating: 'U',
        resolution: 'HD',
        country: 'India',
        language: 'hi',
        origin_country: ['IN'],
        original_language: 'hi',
        tags: ['Indian', 'Bollywood', 'Inspirational', 'Vidhu Vinod Chopra'],
        cast: ['Vikrant Massey', 'Medha Shankr', 'Anant V Joshi', 'Anshumaan Pushkar'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_360814',
        tmdbId: 360814,
        imdbId: 'tt5074352',
        title: 'Dangal',
        overview: 'Former wrestler Mahavir Singh Phogat trains his daughters Geeta and Babita to become world-class female wrestlers against all social odds.',
        poster_path: 'https://image.tmdb.org/t/p/w500/cJRPOLEexI7qp2DKtFfCh7YaaUG.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/l0fNAHLOFReQJsxCOmGWvJDnimn.jpg',
        youtubeId: 'x_7YlGv9u1g',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/360814',
        type: 'movie',
        genres: ['Drama', 'Sports', 'Biography'],
        release_date: '2016-12-21',
        vote_average: 8.4,
        year: 2016,
        duration: '2h 41m',
        rating: 'U',
        resolution: 'HD',
        country: 'India',
        language: 'hi',
        origin_country: ['IN'],
        original_language: 'hi',
        tags: ['Indian', 'Bollywood', 'Aamir Khan', 'Sports', 'Dangal'],
        cast: ['Aamir Khan', 'Fatima Sana Shaikh', 'Sanya Malhotra', 'Sakshi Tanwar'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },

    // â”€â”€ INDIAN TV & WEB SERIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
        id: 'tmdb_79352',
        tmdbId: 79352,
        imdbId: 'tt6077448',
        title: 'Sacred Games',
        overview: 'A link in their pasts leads an honest cop to a fugitive gang boss, whose cryptic warning spurs the officer on a quest to save Mumbai from cataclysm.',
        poster_path: 'https://image.tmdb.org/t/p/w500/uEbNtFbK4At9WBDGap23lt1qO9n.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/qtac9X9lSLqZFbxS71347N8MiID.jpg',
        youtubeId: '28j8h0RRb48',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/79352',
        type: 'tv',
        genres: ['Crime', 'Drama', 'Thriller'],
        release_date: '2018-07-06',
        vote_average: 8.5,
        year: 2018,
        rating: 'A',
        resolution: '4K',
        country: 'India',
        language: 'hi',
        origin_country: ['IN'],
        original_language: 'hi',
        tags: ['Indian', 'Web Series', 'Nawazuddin Siddiqui', 'Saif Ali Khan', 'Crime'],
        cast: ['Saif Ali Khan', 'Nawazuddin Siddiqui', 'Radhika Apte', 'Pankaj Tripathi'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_84105',
        tmdbId: 84105,
        imdbId: 'tt6473300',
        title: 'Mirzapur',
        overview: 'The iron-fisted Akhandanand Tripathi is a millionaire carpet exporter and the mafia don of Mirzapur. His son Munna, an unworthy, power-hungry heir, will stop at nothing to inherit his father\'s legacy.',
        poster_path: 'https://image.tmdb.org/t/p/w500/1rxLUFVrtTo82OxhbDXJDiJVkwL.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/3dV7pWAdwIPKR2lMIACMfObXdgK.jpg',
        youtubeId: 'ZNeGF-PvRHY',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/84105',
        type: 'tv',
        genres: ['Crime', 'Action', 'Drama'],
        release_date: '2018-11-16',
        vote_average: 8.4,
        year: 2018,
        rating: 'A',
        resolution: '4K',
        country: 'India',
        language: 'hi',
        origin_country: ['IN'],
        original_language: 'hi',
        tags: ['Indian', 'Web Series', 'Pankaj Tripathi', 'Ali Fazal', 'Mirzapur'],
        cast: ['Pankaj Tripathi', 'Ali Fazal', 'Divyenndu', 'Shweta Tripathi'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_93352',
        tmdbId: 93352,
        imdbId: 'tt9544034',
        title: 'The Family Man',
        overview: 'A middle-class man secretly works as a world-class spy for the National Investigation Agency while trying to protect his family from the impact of his secretive job.',
        poster_path: 'https://image.tmdb.org/t/p/w500/tE1NUJqw9gV6AVjQ1GTK78LbWJ9.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/eEzKigDI64OomZV6VTJvoPGmVu1.jpg',
        youtubeId: 'NGf_B81HC2M',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/93352',
        type: 'tv',
        genres: ['Action', 'Comedy', 'Drama'],
        release_date: '2019-09-20',
        vote_average: 8.5,
        year: 2019,
        rating: 'U/A 16+',
        resolution: '4K',
        country: 'India',
        language: 'hi',
        origin_country: ['IN'],
        original_language: 'hi',
        tags: ['Indian', 'Web Series', 'Manoj Bajpayee', 'Spy', 'Thriller'],
        cast: ['Manoj Bajpayee', 'Priyamani', 'Sharib Hashmi', 'Samantha Ruth Prabhu'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_101352',
        tmdbId: 101352,
        imdbId: 'tt12004706',
        title: 'Panchayat',
        overview: 'An engineering graduate who takes up a job as a secretary of a Panchayat office in a remote village of Phulera, Uttar Pradesh due to a lack of better job options.',
        poster_path: 'https://image.tmdb.org/t/p/w500/xrfvAhrMdT6Uwg5fyTyQAZBYyiu.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/iZ8EtGAqKWZdRJPzWfFseNfVxjh.jpg',
        youtubeId: 'mojZJ7uegm8',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/101352',
        type: 'tv',
        genres: ['Comedy', 'Drama'],
        release_date: '2020-04-03',
        vote_average: 8.7,
        year: 2020,
        rating: 'U/A 13+',
        resolution: 'HD',
        country: 'India',
        language: 'hi',
        origin_country: ['IN'],
        original_language: 'hi',
        tags: ['Indian', 'TVF', 'Panchayat', 'Jitendra Kumar', 'Comedy'],
        cast: ['Jitendra Kumar', 'Raghubir Yadav', 'Neena Gupta', 'Chandan Roy'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_111363',
        tmdbId: 111188,
        imdbId: 'tt12392890',
        title: 'Scam 1992: The Harshad Mehta Story',
        overview: 'Set in 1980s and 90s Bombay, the series follows the life of Harshad Mehta, a stockbroker who took the stock market to dizzying heights and his catastrophic downfall.',
        poster_path: 'https://image.tmdb.org/t/p/w500/fiimZ9Xt5cPTPHNrbS4QautBXpU.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/tTYP1npvBU90NthceezScfXGiOl.jpg',
        youtubeId: 'ISORfez27og',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/111363',
        type: 'tv',
        genres: ['Crime', 'Drama', 'Biography'],
        release_date: '2020-10-09',
        vote_average: 8.8,
        year: 2020,
        rating: 'U/A 16+',
        resolution: 'HD',
        country: 'India',
        language: 'hi',
        origin_country: ['IN'],
        original_language: 'hi',
        tags: ['Indian', 'Hansal Mehta', 'Pratik Gandhi', 'Stock Market', 'Scam 1992'],
        cast: ['Pratik Gandhi', 'Shreya Dhanwanthary', 'Hemant Kher', 'Nikhil Dwivedi'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },

    // â”€â”€ MARVEL TV SERIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
        id: 'tmdb_84958',
        tmdbId: 84958,
        imdbId: 'tt9140554',
        title: 'Loki',
        overview: 'After stealing the Tesseract during the events of â€œAvengers: Endgame,â€ an alternate version of Loki is brought to the mysterious Time Variance Authority (TVA).',
        poster_path: 'https://image.tmdb.org/t/p/w500/kEl2t3OhXc3Zb9FBh1AuYzRTgZp.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/q3jHCb4dMfYF6ojikKuHd6LscxC.jpg',
        youtubeId: 'nW948Va-l10',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/84958',
        type: 'tv',
        genres: ['Sci-Fi', 'Action', 'Adventure'],
        release_date: '2021-06-09',
        vote_average: 8.2,
        year: 2021,
        rating: 'U/A 13+',
        resolution: '4K',
        tags: ['Marvel', 'MCU', 'Loki', 'TVA', 'Superhero'],
        cast: ['Tom Hiddleston', 'Sophia Di Martino', 'Owen Wilson', 'Gugu Mbatha-Raw'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_85271',
        tmdbId: 85271,
        imdbId: 'tt9140560',
        title: 'WandaVision',
        overview: 'Wanda Maximoff and Visionâ€”two super-powered beings living idealized suburban livesâ€”begin to suspect that everything is not as it seems.',
        poster_path: 'https://image.tmdb.org/t/p/w500/ijWWwINc8h71NQ8j1LTJMFSj5wr.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/lOr9NKxh4vMweufMOUDJjJhCRHW.jpg',
        youtubeId: 'sj9J2ecsSpo',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/85271',
        type: 'tv',
        genres: ['Sci-Fi', 'Mystery', 'Drama'],
        release_date: '2021-01-15',
        vote_average: 8.1,
        year: 2021,
        rating: 'U/A 13+',
        resolution: '4K',
        tags: ['Marvel', 'MCU', 'WandaVision', 'Scarlet Witch', 'Superhero'],
        cast: ['Elizabeth Olsen', 'Paul Bettany', 'Kathryn Hahn', 'Teyonah Parris'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_61889',
        tmdbId: 61889,
        imdbId: 'tt3322312',
        title: 'Daredevil',
        overview: 'Blinded as a young boy, Matt Murdock fights injustice by day as a lawyer and by night as the superhero Daredevil in Hell\'s Kitchen, New York City.',
        poster_path: 'https://image.tmdb.org/t/p/w500/QWbPaDxiB6LW2LjASknzYBvjMj.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/pPALpad1Fh14g7ejyQjqKzlhrBw.jpg',
        youtubeId: 'jAy6NJ_D5vU',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/61889',
        type: 'tv',
        genres: ['Action', 'Crime', 'Drama'],
        release_date: '2015-04-10',
        vote_average: 8.3,
        year: 2015,
        rating: 'A',
        resolution: 'HD',
        tags: ['Marvel', 'Daredevil', 'Kingpin', 'Punisher', 'Crime'],
        cast: ['Charlie Cox', 'Deborah Ann Woll', 'Elden Henson', 'Vincent D\'Onofrio'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },

    // â”€â”€ ANIME SERIES & MOVIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
        id: 'tmdb_1429',
        tmdbId: 1429,
        imdbId: 'tt2560140',
        title: 'Attack on Titan',
        overview: 'Several hundred years ago, humans were nearly exterminated by Titans. Eren Yeager vows to cleanse the earth of the giant humanoids that brought humanity to the brink of extinction.',
        poster_path: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg',
        youtubeId: 'MGRm4IzK1SQ',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/1429',
        type: 'tv',
        genres: ['Anime', 'Action', 'Animation', 'Fantasy'],
        release_date: '2013-04-07',
        vote_average: 8.7,
        year: 2013,
        rating: 'A',
        resolution: 'HD',
        tags: ['Anime', 'Eren Yeager', 'Titans', 'Action', 'Animation'],
        cast: ['Yuki Kaji', 'Yui Ishikawa', 'Marina Inoue', 'Hiroshi Kamiya'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_85937',
        tmdbId: 85937,
        imdbId: 'tt9335498',
        title: 'Demon Slayer: Kimetsu no Yaiba',
        overview: 'Tanjiro Kamado, a young boy whose family is slaughtered by demons, joins the Demon Slayer Corps to find a cure for his sister Nezuko, who has been turned into a demon.',
        poster_path: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg',
        youtubeId: 'VQGCKyvzIM4',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/85937',
        type: 'tv',
        genres: ['Anime', 'Action', 'Animation', 'Fantasy'],
        release_date: '2019-04-06',
        vote_average: 8.7,
        year: 2019,
        rating: 'U/A 16+',
        resolution: 'HD',
        tags: ['Anime', 'Tanjiro', 'Nezuko', 'Action', 'Ufotable'],
        cast: ['Natsuki Hanae', 'Akari Kito', 'Hiro Shimono', 'Yoshitsugu Matsuoka'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_95479',
        tmdbId: 95479,
        imdbId: 'tt12343534',
        title: 'Jujutsu Kaisen',
        overview: 'A boy swallows a cursed talisman - the finger of a demon - and becomes cursed himself. He enters a shaman\'s school to be able to locate the demon\'s other body parts and exorcise himself.',
        poster_path: 'https://image.tmdb.org/t/p/w500/6qQzMJG27XOJsyAEEIisoJB45j2.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/qpin8cASXEVtwhzNsprHYFiOAGk.jpg',
        youtubeId: 'pkZXflMmZ2w',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/95479',
        type: 'tv',
        genres: ['Anime', 'Action', 'Animation', 'Fantasy'],
        release_date: '2020-10-03',
        vote_average: 8.6,
        year: 2020,
        rating: 'U/A 16+',
        resolution: 'HD',
        tags: ['Anime', 'Gojo Satoru', 'Yuji Itadori', 'MAPPA', 'Action'],
        cast: ['Junya Enoki', 'Yuma Uchida', 'Asami Seto', 'Yuichi Nakamura'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_37854',
        tmdbId: 37854,
        imdbId: 'tt0388629',
        title: 'One Piece',
        overview: 'Years ago, the fearsome Pirate King, Gol D. Roger was executed leaving behind a huge cache of riches and the famed One Piece. Monkey D. Luffy sets out to become the King of the Pirates.',
        poster_path: 'https://image.tmdb.org/t/p/w500/dB4EDhre2dsC2kxYDavyKWqLQwi.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/2rmK7mnchw9Xr3XdiTFSxTTLXqv.jpg',
        youtubeId: 'Ades3pQbeh8',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/37854',
        type: 'tv',
        genres: ['Anime', 'Action', 'Adventure', 'Animation'],
        release_date: '1999-10-20',
        vote_average: 8.7,
        year: 1999,
        rating: 'U/A 13+',
        resolution: 'HD',
        tags: ['Anime', 'Luffy', 'Straw Hat', 'Adventure', 'Pirates'],
        cast: ['Mayumi Tanaka', 'Akemi Okamura', 'Kazuya Nakai', 'Kappei Yamaguchi'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_13916',
        tmdbId: 13916,
        imdbId: 'tt0877057',
        title: 'Death Note',
        overview: 'Light Yagami, an ace student with great prospects, stumbles upon a notebook which drops from the realm of the Death Gods. Any human whose name is written in this notebook shall die.',
        poster_path: 'https://image.tmdb.org/t/p/w500/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/z8IPicmEKXUO4I2UDdMEqw7RqOE.jpg',
        youtubeId: 'NlJZ-YgAt-c',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/13916',
        type: 'tv',
        genres: ['Anime', 'Mystery', 'Animation', 'Thriller'],
        release_date: '2006-10-04',
        vote_average: 8.6,
        year: 2006,
        rating: 'U/A 16+',
        resolution: 'HD',
        tags: ['Anime', 'Light Yagami', 'L', 'Ryuk', 'Psychological Thriller'],
        cast: ['Mamoru Miyano', 'Kappei Yamaguchi', 'Shidou Nakamura', 'Aya Hirano'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_46260',
        tmdbId: 46260,
        imdbId: 'tt0409591',
        title: 'Naruto',
        overview: 'Moments prior to Naruto Uzumaki\'s birth, a huge demon known as the Nine-Tailed Fox attacked the Hidden Leaf Village and wreaked havoc. Naruto grows up an outcast, dreaming of becoming the Hokage.',
        poster_path: 'https://image.tmdb.org/t/p/w500/xppeysfvDKVx775MFuH8Z9BlpMk.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/5F0HVEgkgP99fEWDjPyikGt9jQi.jpg',
        youtubeId: 'j2hiC9Gm4Fw',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/46260',
        type: 'tv',
        genres: ['Anime', 'Action', 'Animation', 'Adventure'],
        release_date: '2002-10-03',
        vote_average: 8.4,
        year: 2002,
        rating: 'U/A 13+',
        resolution: 'HD',
        tags: ['Anime', 'Naruto', 'Ninja', 'Shonen', 'Sasuke'],
        cast: ['Junko Takeuchi', 'Noriaki Sugiyama', 'Chie Nakamura', 'Kazuhiko Inoue'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_114410',
        tmdbId: 114410,
        imdbId: 'tt13616990',
        title: 'Chainsaw Man',
        overview: 'Denji is a teenage boy living with a Chainsaw Devil named Pochita. When he is betrayed and killed, Pochita makes a contract with him to revive him as Chainsaw Man.',
        poster_path: 'https://image.tmdb.org/t/p/w500/iFM1dyFi0rByvEomEkmm7NpQeeb.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/5DUMPBSnHOZsbBv81GFXZXvDpo6.jpg',
        youtubeId: 'q15CRdE5Bv0',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/114410',
        type: 'tv',
        genres: ['Anime', 'Action', 'Animation', 'Fantasy'],
        release_date: '2022-10-12',
        vote_average: 8.6,
        year: 2022,
        rating: 'A (18+)',
        resolution: '4K',
        tags: ['Anime', 'Chainsaw Man', 'Denji', 'Makima', 'MAPPA'],
        cast: ['Kikunosuke Toya', 'Tomori Kusunoki', 'Shogo Sakata', 'Fairouz Ai'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_127532',
        tmdbId: 127532,
        imdbId: 'tt21209876',
        title: 'Solo Leveling',
        overview: 'In a world where hunters must battle deadly monsters to protect humanity, Sung Jinwoo, the weakest hunter of all mankind, finds himself in a mysterious double dungeon that changes his destiny forever.',
        poster_path: 'https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuEWJt6dJ1.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/xMNH87maNLt9n2bMDYeI6db5VFm.jpg',
        youtubeId: 'vgmPq5N5ZlQ',
        videoUrl: 'https://proxy.garageband.rocks/embed/tv/127532',
        type: 'tv',
        genres: ['Anime', 'Action', 'Animation', 'Fantasy'],
        release_date: '2024-01-07',
        vote_average: 8.7,
        year: 2024,
        rating: 'U/A 16+',
        resolution: '4K',
        tags: ['Anime', 'Sung Jinwoo', 'Shadow Monarch', 'Solo Leveling', 'Action'],
        cast: ['Taito Ban', 'Genta Nakamura', 'Reina Ueda', 'Daisuke Hirakawa'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-07T00:00:00Z',
    },
    {
        id: 'tmdb_372058',
        tmdbId: 372058,
        imdbId: 'tt5311514',
        title: 'Your Name.',
        overview: 'High schoolers Mitsuha and Taki are complete strangers living separate lives in rural Japan and Tokyo. But one day, they suddenly switch bodies, embarking on an emotional journey across time and space.',
        poster_path: 'https://image.tmdb.org/t/p/w500/vfJFJPepRKapMd5G2ro7klIRysq.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/mMtUybQ6hL24FXo0F3Z4j2KG7kZ.jpg',
        youtubeId: 'xU47nhruN-Q',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/372058',
        type: 'movie',
        genres: ['Anime', 'Animation', 'Romance', 'Drama', 'Fantasy'],
        release_date: '2016-08-26',
        vote_average: 8.5,
        year: 2016,
        duration: '1h 46m',
        rating: 'U',
        resolution: '4K',
        tags: ['Anime', 'Makoto Shinkai', 'Romance', 'Masterpiece', 'Drama'],
        cast: ['Ryunosuke Kamiki', 'Mone Kamishiraishi', 'Ryo Narita', 'Aoi Yuki'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    },
    {
        id: 'tmdb_129',
        tmdbId: 129,
        imdbId: 'tt0245429',
        title: 'Spirited Away',
        overview: 'A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had to free her family.',
        poster_path: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/dyJvKsNs2KP8qQnAXbRwDjblViy.jpg',
        youtubeId: 'ByXuk9QqQkk',
        videoUrl: 'https://proxy.garageband.rocks/embed/movie/129',
        type: 'movie',
        genres: ['Anime', 'Animation', 'Fantasy'],
        release_date: '2001-07-20',
        vote_average: 8.5,
        year: 2001,
        duration: '2h 5m',
        rating: 'U',
        resolution: '4K',
        tags: ['Anime', 'Studio Ghibli', 'Hayao Miyazaki', 'Masterpiece'],
        cast: ['Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki', 'Takashi Naito'],
        allowPlayback: true,
        isPublished: true,
        createdAt: '2024-01-01T00:00:00Z',
    }
];

/**
 * Fallback Sections for Home, Movie, and TV Page Rails when Firestore is quota-limited
 */
export const FALLBACK_SECTIONS: Section[] = [
    {
        id: 'sec_marvel_blockbusters',
        title: 'Marvel Cinematic Universe',
        order: 1,
        type: 'tag',
        tagFilter: 'Marvel',
        enabled: true,
        scopes: ['home', 'movie'],
        showRanking: true
    },
    {
        id: 'sec_indian_blockbusters',
        title: 'Bollywood & Indian Blockbusters',
        order: 2,
        type: 'tag',
        tagFilter: 'Indian',
        enabled: true,
        scopes: ['home', 'movie'],
        showRanking: true
    },
    {
        id: 'sec_indian_webseries',
        title: 'Top Indian Web Series',
        order: 3,
        type: 'tag',
        tagFilter: 'Web Series',
        enabled: true,
        scopes: ['home', 'tv'],
        showRanking: false
    },

    {
        id: 'sec_popular_anime',
        title: 'Popular Anime & Animation',
        order: 5,
        type: 'genre',
        genreFilter: 'Anime',
        enabled: true,
        scopes: ['tv'],
        showRanking: false
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC FALLBACK ENGINE
// Fetches unlimited real content from TMDB when Firestore quota is exceeded.
// Covers all 9 Indian languages × 2 media types × 2 sort orders × 2 pages.
// Results cached in sessionStorage (3h TTL) — subsequent navigations are instant.
// ─────────────────────────────────────────────────────────────────────────────

const DYNAMIC_CACHE_KEY = 'tmdb_dynamic_fallback_v3';
const DYNAMIC_CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

interface DynamicCache {
    items: Content[];
    ts: number;
}

function loadDynamicCache(): Content[] | null {
    try {
        const raw = sessionStorage.getItem(DYNAMIC_CACHE_KEY);
        if (!raw) return null;
        const parsed: DynamicCache = JSON.parse(raw);
        if (Date.now() - parsed.ts > DYNAMIC_CACHE_TTL_MS) return null;
        return parsed.items && parsed.items.length > 0 ? parsed.items : null;
    } catch { return null; }
}

function saveDynamicCache(items: Content[]): void {
    try {
        const payload: DynamicCache = { items, ts: Date.now() };
        sessionStorage.setItem(DYNAMIC_CACHE_KEY, JSON.stringify(payload));
    } catch { /* quota full, skip */ }
}

// All major Indian languages
const FALLBACK_INDIAN_LANGS = ['hi', 'ta', 'te', 'ml', 'kn', 'bn', 'pa', 'mr', 'gu'];

export const LANG_LABEL: Record<string, string> = {
    hi: 'Bollywood & Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    ml: 'Malayalam',
    kn: 'Kannada',
    bn: 'Bengali',
    pa: 'Punjabi',
    mr: 'Marathi',
    gu: 'Gujarati',
};

function mapRawToContent(r: any, mediaType: 'movie' | 'tv', extraTags: string[] = []): Content {
    const date = r.release_date || r.first_air_date || '';
    const year = parseInt(date.split('-')[0]) || new Date().getFullYear();
    return {
        id: `tmdb_${r.id}`,
        tmdbId: r.id,
        title: r.title || r.name || 'Untitled',
        type: mediaType,
        poster_path: r.poster_path ? tmdbPosterUrl(r.poster_path) : '',
        backdrop_path: r.backdrop_path ? tmdbBackdropUrl(r.backdrop_path) : '',
        overview: r.overview || '',
        vote_average: r.vote_average || 0,
        release_date: date,
        year,
        genres: mapTMDBGenres(r.genre_ids || []),
        tags: extraTags,
        youtubeId: '',
        videoUrl: `https://proxy.garageband.rocks/embed/${mediaType}/${r.id}`,
        allowPlayback: true,
        isPublished: true,
        resolution: 'HD',
        createdAt: new Date().toISOString(),
        original_language: r.original_language || '',
        origin_country: r.origin_country || [],
    };
}

async function tmdbDiscover(
    mediaType: 'movie' | 'tv',
    extraParams: Record<string, string>
): Promise<any[]> {
    const API_KEY = (import.meta as any).env?.VITE_TMDB_API_KEY as string | undefined;
    if (!API_KEY) return [];
    const params = new URLSearchParams({
        api_key: API_KEY,
        language: 'en-US',
        include_adult: 'false',
        ...extraParams,
    });
    try {
        const proxyUrl = `/api/tmdb?path=${encodeURIComponent(`/discover/${mediaType}`)}&${params.toString()}`;
        let res = await fetch(proxyUrl);
        if (!res.ok) {
            const directUrl = `https://api.themoviedb.org/3/discover/${mediaType}?${params.toString()}`;
            res = await fetch(directUrl);
        }
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []).map((r: any) => ({ ...r, media_type: mediaType }));
    } catch {
        return [];
    }
}

export async function fetchDynamicFallbackContent(): Promise<Content[]> {
    const cached = loadDynamicCache();
    if (cached && cached.length > 0) return cached;

    try {
        const tasks: Promise<any[]>[] = [];

        // Indian: 9 langs x 2 types x popular+topRated x 2 pages = 72 tasks
        for (const lang of FALLBACK_INDIAN_LANGS) {
            for (const mediaType of ['movie', 'tv'] as const) {
                for (const [sortBy, voteMin] of [['popularity.desc', '5'], ['vote_average.desc', '30']] as const) {
                    for (const page of ['1', '2']) {
                        tasks.push(tmdbDiscover(mediaType, {
                            sort_by: sortBy, with_original_language: lang,
                            with_origin_country: 'IN', 'vote_count.gte': voteMin, page,
                        }));
                    }
                }
            }
        }
        // Anime
        for (const page of ['1', '2', '3']) {
            tasks.push(tmdbDiscover('tv', { sort_by: 'popularity.desc', with_original_language: 'ja', with_genres: '16', 'vote_count.gte': '30', page }));
            tasks.push(tmdbDiscover('movie', { sort_by: 'popularity.desc', with_original_language: 'ja', with_genres: '16', 'vote_count.gte': '30', page }));
        }
        // Marvel
        for (const page of ['1', '2', '3']) {
            tasks.push(tmdbDiscover('movie', { sort_by: 'popularity.desc', with_companies: '420,7505', page }));
        }

        const settled = await Promise.allSettled(tasks);
        const rawItems: any[] = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);

        const seen = new Set<string>();
        const allContent: Content[] = [];

        for (const r of rawItems) {
            const key = `tmdb_${r.id}`;
            if (seen.has(key) || !r.poster_path) continue;
            seen.add(key);
            const lang = r.original_language || '';
            const isIndian = FALLBACK_INDIAN_LANGS.includes(lang);
            const isAnime = lang === 'ja' && (r.genre_ids || []).includes(16);
            const tags: string[] = [];
            if (isIndian) { tags.push('Indian'); if (LANG_LABEL[lang]) tags.push(LANG_LABEL[lang]); }
            if (isAnime) tags.push('Anime', 'Animation', 'Japanese');
            if (!isIndian && !isAnime) tags.push('Marvel', 'MCU');
            const mediaType: 'movie' | 'tv' = r.media_type === 'tv' ? 'tv' : 'movie';
            allContent.push(mapRawToContent(r, mediaType, tags));
        }

        // Ensure static seed items are always present
        for (const staticItem of FALLBACK_CATALOG) {
            if (!seen.has(staticItem.id)) { seen.add(staticItem.id); allContent.push(staticItem); }
        }

        allContent.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
        console.log(`[Fallback Engine] Loaded ${allContent.length} titles from TMDB`);
        saveDynamicCache(allContent);
        return allContent;
    } catch (err) {
        console.warn('[Fallback Engine] TMDB fetch failed, using static seed:', err);
        return FALLBACK_CATALOG;
    }
}

export function buildDynamicSections(content: Content[]): Section[] {
    const sections: Section[] = [];
    let order = 1;

    sections.push({ id: 'sec_dyn_trending', title: 'Trending Now in India', order: order++, type: 'tag', tagFilter: 'Indian', enabled: true, scopes: ['home'], showRanking: true });

    const langCounts: Record<string, { movie: number; tv: number }> = {};
    for (const item of content) {
        const lang = item.original_language || '';
        if (!FALLBACK_INDIAN_LANGS.includes(lang)) continue;
        if (!langCounts[lang]) langCounts[lang] = { movie: 0, tv: 0 };
        if (item.type === 'movie') langCounts[lang].movie++;
        else langCounts[lang].tv++;
    }

    for (const lang of FALLBACK_INDIAN_LANGS) {
        const counts = langCounts[lang];
        if (!counts) continue;
        const label = LANG_LABEL[lang] || lang;
        if (counts.movie >= 3) sections.push({ id: `sec_dyn_${lang}_m`, title: `${label} Movies`, order: order++, type: 'tag', tagFilter: label, enabled: true, scopes: ['home', 'movie'], showRanking: false });
        if (counts.tv >= 3) sections.push({ id: `sec_dyn_${lang}_tv`, title: `${label} Web Series & Shows`, order: order++, type: 'tag', tagFilter: label, enabled: true, scopes: ['home', 'tv'], showRanking: false });
    }

    if (content.some(c => (c.tags || []).includes('Anime')))
        sections.push({ id: 'sec_dyn_anime', title: 'Popular Anime & Animation', order: order++, type: 'genre', genreFilter: 'Anime', enabled: true, scopes: ['home', 'tv'], showRanking: false });

    if (content.some(c => (c.tags || []).includes('Marvel')))
        sections.push({ id: 'sec_dyn_marvel', title: 'Marvel Cinematic Universe', order: order++, type: 'tag', tagFilter: 'Marvel', enabled: true, scopes: ['home', 'movie'], showRanking: false });

    return sections;
}
