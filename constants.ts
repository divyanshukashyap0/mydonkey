import { ContentItem, UserPlan, InfoPageData } from './types';
// Note: ContentType enum should be imported if used, but here we use string literals or the enum if available.
// Assuming ContentType is an enum in types.ts. If it's a string union, we use string literals.
// Based on previous checks, ContentType is likely an enum or we can just use the values.
// Checking line 1: import { ContentItem, ContentType ... }
import { ContentType } from './types';

export const MOCK_PLANS: UserPlan[] = [
  {
    id: 'mobile',
    name: 'Mobile',
    price: 149,
    period: '3 Months',
    features: ['1 Device', 'Mobile Only', 'Ads Enabled', 'HD (720p)'],
    maxDevices: 1,
    quality: 'Good',
    resolution: '720p',
    ads: true,
  },
  {
    id: 'super',
    name: 'Super',
    price: 299,
    period: '3 Months',
    features: ['2 Devices', 'Mobile + Web + TV', 'Ads Enabled', 'Full HD (1080p)'],
    maxDevices: 2,
    quality: 'Better',
    resolution: '1080p',
    ads: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 499,
    period: '3 Months',
    features: ['4 Devices', 'All Platforms', 'Ad-Free (Except Sports)', '4K UHD + Dolby'],
    maxDevices: 4,
    quality: 'Best',
    resolution: '4K +HDR',
    ads: false,
  },
];

export const MOCK_CONTENT: (ContentItem & { rank?: number })[] = [
  {
    id: 'tmdb_597089',
    title: 'Article 15',
    overview: 'In the rural heartland of India, an upright city-bred police officer embarks on a crusade against violent social discrimination and caste atrocities.',
    poster_path: 'https://image.tmdb.org/t/p/w500/hx0J2j51B5dGekBq2mZ82jN5T4T.jpg',
    backdrop_path: 'https://image.tmdb.org/t/p/w1280/1st4iR7q26B2pEmsPZz5q0V7u3s.jpg',
    type: ContentType.MOVIE,
    rating: 'U/A 16+',
    year: 2019,
    duration: '2h 10m',
    tags: ['Crime', 'Drama', 'Thriller'],
    genres: ['Crime', 'Drama', 'Thriller'],
    country: 'India',
    language: 'hi',
    origin_country: ['IN'],
    original_language: 'hi',
    tmdbId: 597089,
    imdbId: 'tt10324144',
    videoUrl: 'https://proxy.garageband.rocks/embed/movie/597089',
    vote_average: 7.8,
    release_date: '2019-06-28',
    cast: ['Ayushmann Khurrana', 'Nassar', 'Manoj Pahwa', 'Kumud Mishra'],
    isPublished: true,
    allowPlayback: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '1',
    title: 'Echoes of Mumbai',
    overview: 'A gritty underworld drama set in the heart of the city.',
    poster_path: 'https://picsum.photos/300/450?random=1',
    backdrop_path: 'https://picsum.photos/1920/1080?random=1',
    type: ContentType.SERIES,
    rating: 'U/A 16+',
    year: 2026,
    tags: ['Drama', 'Crime', 'Thriller'],
    isOriginal: true,
    progress: 45,
    rank: 1,
    cast: ['Nawazuddin Siddiqui', 'Radhika Apte', 'Pankaj Tripathi'],
    episodes: [
      { id: 'e1', title: 'The Beginning', duration: '45m', episodeNumber: 1, overview: 'The city sleeps, but the underworld awakens.', stillUrl: 'https://picsum.photos/300/170?random=101' },
      { id: 'e2', title: 'Betrayal', duration: '48m', episodeNumber: 2, overview: 'Trust is a luxury no one can afford.', stillUrl: 'https://picsum.photos/300/170?random=102' },
      { id: 'e3', title: 'Rise of the Don', duration: '50m', episodeNumber: 3, overview: 'Power shifts in the darkest corners.', stillUrl: 'https://picsum.photos/300/170?random=103' },
    ],
    youtubeId: 'dummy_yt_1',
    genres: ['Crime', 'Thriller'],
    release_date: '2026-01-01',
    vote_average: 8.5,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Cyber Heist 2077',
    overview: 'In a future where data is currency, one thief risks it all.',
    poster_path: 'https://picsum.photos/300/450?random=2',
    backdrop_path: 'https://picsum.photos/1920/1080?random=2',
    type: ContentType.MOVIE,
    rating: 'A',
    year: 2023,
    duration: '2h 15m',
    tags: ['Sci-Fi', 'Action'],
    rank: 2,
    cast: ['Keanu Reeves', 'Scarlett Johansson'],
    youtubeId: 'dummy_yt_2',
    genres: ['Sci-Fi', 'Action'],
    release_date: '2023-01-01',
    vote_average: 8.0,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Mumbai Indians vs CSK',
    overview: 'IPL 2025: The El Clásico of Cricket.',
    poster_path: 'https://picsum.photos/300/170?random=3',
    backdrop_path: 'https://picsum.photos/1920/1080?random=3',
    type: ContentType.SPORTS,
    tags: ['Cricket', 'Live'],
    matchInfo: {
      team1: 'MI',
      team2: 'CSK',
      logo1: 'https://upload.wikimedia.org/wikipedia/en/c/cd/Mumbai_Indians_Logo.svg',
      logo2: 'https://upload.wikimedia.org/wikipedia/en/2/2b/Chennai_Super_Kings_Logo.svg',
      score1: '182/4 (18.2)',
      score2: '178/8 (20.0)',
      status: 'LIVE',
      league: 'IPL 2025',
      stats: [
        { label: 'Run Rate', value1: '10.2', value2: '8.9' },
        { label: 'Sixes', value1: '8', value2: '5' },
        { label: 'Fours', value1: '14', value2: '12' },
        { label: 'Win Prob', value1: '72%', value2: '28%' }
      ],
      commentary: [
        { time: '18.2', text: 'SIX! Massive hit over long-on!', type: 'GOAL' },
        { time: '18.1', text: 'Single taken, good running.', type: 'INFO' },
        { time: '17.6', text: 'OUT! Caught at deep mid-wicket.', type: 'WICKET' }
      ]
    },
    youtubeId: 'dummy_yt_3',
    genres: ['Sports'],
    release_date: '2025-01-01',
    vote_average: 9.0,
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Love in Ladakh',
    overview: 'A romantic journey through the highest passes.',
    poster_path: 'https://picsum.photos/300/450?random=4',
    backdrop_path: 'https://picsum.photos/1920/1080?random=4',
    type: ContentType.MOVIE,
    rating: 'U',
    year: 2022,
    duration: '1h 50m',
    tags: ['Romance', 'Travel'],
    progress: 10,
    rank: 3,
    youtubeId: 'dummy_yt_4',
    genres: ['Romance'],
    release_date: '2022-01-01',
    vote_average: 7.5,
    createdAt: new Date().toISOString()
  },
  {
    id: '5',
    title: 'Man Utd vs Liverpool',
    overview: 'Premier League Matchday 12.',
    poster_path: 'https://picsum.photos/300/170?random=5',
    backdrop_path: 'https://picsum.photos/1920/1080?random=5',
    type: ContentType.SPORTS,
    tags: ['Football', 'Live'],
    matchInfo: {
      team1: 'MUN',
      team2: 'LIV',
      logo1: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
      logo2: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
      score1: '2',
      score2: '2',
      status: 'LIVE',
      league: 'PL 2025',
      stats: [
        { label: 'Possession', value1: '45%', value2: '55%' },
        { label: 'Shots', value1: '8', value2: '12' },
        { label: 'On Target', value1: '4', value2: '6' },
      ],
      commentary: [
        { time: '88:00', text: 'Corner kick for Liverpool.', type: 'INFO' },
        { time: '85:23', text: 'Yellow card for Casemiro.', type: 'INFO' },
        { time: '72:10', text: 'GOAL! Salah equalizes!', type: 'GOAL' }
      ]
    },
    youtubeId: 'dummy_yt_5',
    genres: ['Sports'],
    release_date: '2025-01-01',
    vote_average: 8.8,
    createdAt: new Date().toISOString()
  },
  {
    id: '6',
    title: 'Funny Cat Fails',
    overview: 'Hilarious clips to brighten your day.',
    poster_path: 'https://picsum.photos/300/530?random=6',
    backdrop_path: 'https://picsum.photos/300/530?random=6',
    type: ContentType.SPARKS,
    tags: ['Comedy', 'Viral'],
    youtubeId: 'dummy_yt_6',
    genres: ['Comedy'],
    release_date: '2026-01-01',
    vote_average: 9.2,
    createdAt: new Date().toISOString()
  },
  {
    id: '7',
    title: 'Cooking 101: Pasta',
    overview: 'Learn to make authentic pasta in 30 seconds.',
    poster_path: 'https://picsum.photos/300/530?random=7',
    backdrop_path: 'https://picsum.photos/300/530?random=7',
    type: ContentType.SPARKS,
    tags: ['Food', 'DIY'],
    youtubeId: 'dummy_yt_7',
    genres: ['DIY'],
    release_date: '2026-01-01',
    vote_average: 8.5,
    createdAt: new Date().toISOString()
  },
  {
    id: '8',
    title: 'The Lost Kingdom',
    overview: 'An epic fantasy saga.',
    poster_path: 'https://picsum.photos/300/450?random=8',
    backdrop_path: 'https://picsum.photos/1920/1080?random=8',
    type: ContentType.MOVIE,
    isOriginal: true,
    rating: 'U/A 13+',
    tags: ['Fantasy', 'Adventure'],
    progress: 80,
    rank: 4,
    cast: ['Hrithik Roshan', 'Aishwarya Rai'],
    youtubeId: 'dummy_yt_8',
    genres: ['Fantasy'],
    release_date: '2022-01-01',
    vote_average: 7.9,
    createdAt: new Date().toISOString()
  },
  {
    id: '9',
    title: 'Chhota Bheem: Kung Fu',
    overview: 'Bheem travels to China to learn Kung Fu.',
    poster_path: 'https://picsum.photos/300/450?random=9',
    backdrop_path: 'https://picsum.photos/1920/1080?random=9',
    type: ContentType.MOVIE,
    rating: 'U',
    year: 2019,
    tags: ['Kids', 'Animation', 'Action'],
    rank: 5,
    youtubeId: 'dummy_yt_9',
    genres: ['Kids'],
    release_date: '2019-01-01',
    vote_average: 8.1,
    createdAt: new Date().toISOString()
  },
  {
    id: '10',
    title: 'Jungle Tales',
    overview: 'Animal stories for kids.',
    poster_path: 'https://picsum.photos/300/450?random=10',
    backdrop_path: 'https://picsum.photos/1920/1080?random=10',
    type: ContentType.SERIES,
    rating: 'U',
    year: 2021,
    tags: ['Kids', 'Animals'],
    youtubeId: 'dummy_yt_10',
    genres: ['Kids'],
    release_date: '2021-01-01',
    vote_average: 8.0,
    createdAt: new Date().toISOString()
  },
  {
    id: '11',
    title: 'Vikram Vedha',
    overview: 'A classic neo-noir action thriller.',
    poster_path: 'https://picsum.photos/300/450?random=11',
    backdrop_path: 'https://picsum.photos/1920/1080?random=11',
    type: ContentType.MOVIE,
    rating: 'U/A 16+',
    year: 2017,
    tags: ['Tamil', 'Thriller'],
    rank: 6,
    youtubeId: 'dummy_yt_11',
    genres: ['Thriller'],
    release_date: '2017-01-01',
    vote_average: 8.8,
    createdAt: new Date().toISOString()
  },
  {
    id: '12',
    title: 'Pushpa: The Rise',
    overview: 'Red sandalwood smuggling in the Seshachalam Hills.',
    poster_path: 'https://picsum.photos/300/450?random=12',
    backdrop_path: 'https://picsum.photos/1920/1080?random=12',
    type: ContentType.MOVIE,
    rating: 'U/A 16+',
    year: 2021,
    tags: ['Telugu', 'Action'],
    rank: 7,
    youtubeId: 'dummy_yt_12',
    genres: ['Action'],
    release_date: '2021-01-01',
    vote_average: 8.4,
    createdAt: new Date().toISOString()
  },
  {
    id: '13',
    title: 'Super Smash League',
    overview: 'Badminton Finals: India vs Malaysia.',
    poster_path: 'https://picsum.photos/300/170?random=13',
    backdrop_path: 'https://picsum.photos/1920/1080?random=13',
    type: ContentType.SPORTS,
    tags: ['Badminton', 'Live'],
    matchInfo: {
      team1: 'IND',
      team2: 'MAS',
      score1: '21-19',
      score2: '18-21',
      status: 'LIVE',
      league: 'BWF Open',
      stats: [
        { label: 'Smash Speed', value1: '320km/h', value2: '310km/h' },
        { label: 'Net Play', value1: '8/10', value2: '9/10' }
      ]
    },
    youtubeId: 'dummy_yt_13',
    genres: ['Sports'],
    release_date: '2025-01-01',
    vote_average: 8.2,
    createdAt: new Date().toISOString()
  },
  {
    id: '14',
    title: 'Formula 1: Monaco GP',
    overview: 'Highlights from the Grand Prix.',
    poster_path: 'https://picsum.photos/300/170?random=14',
    backdrop_path: 'https://picsum.photos/1920/1080?random=14',
    type: ContentType.SPORTS,
    tags: ['F1', 'Highlights'],
    youtubeId: 'dummy_yt_14',
    genres: ['Sports', 'Racing'],
    release_date: '2026-05-26',
    vote_average: 9.5,
    createdAt: '2026-05-26T14:00:00Z'
  },
  {
    id: '15',
    title: 'World Chess Final',
    overview: 'Championship Finals.',
    poster_path: 'https://picsum.photos/300/170?random=15',
    backdrop_path: 'https://picsum.photos/1920/1080?random=15',
    type: ContentType.SPORTS,
    tags: ['Chess', 'Strategy'],
    youtubeId: 'dummy_yt_15',
    genres: ['Sports', 'Strategy'],
    release_date: '2026-11-20',
    vote_average: 8.8,
    createdAt: '2026-11-20T10:00:00Z'
  },
  {
    id: '16',
    title: 'UFC 300',
    overview: 'Top 10 Knockouts of the Year.',
    poster_path: 'https://picsum.photos/300/170?random=16',
    backdrop_path: 'https://picsum.photos/1920/1080?random=16',
    type: ContentType.SPORTS,
    tags: ['UFC', 'Fighting'],
    youtubeId: 'dummy_yt_16',
    genres: ['Sports', 'Fighting'],
    release_date: '2026-04-13',
    vote_average: 9.2,
    createdAt: '2026-04-13T22:00:00Z'
  },
  {
    id: 'mov_1',
    title: 'Avatar: The Way of Water',
    overview: 'A visual masterpiece with stunning special effects.',
    poster_path: 'https://picsum.photos/300/450?random=17',
    backdrop_path: 'https://picsum.photos/1920/1080?random=17',
    type: ContentType.MOVIE,
    rating: 'U/A 13+',
    year: 2022,
    tags: ['Sci-Fi', 'Adventure'],
    youtubeId: 'dummy_yt_17',
    genres: ['Sci-Fi', 'Adventure'],
    release_date: '2022-12-16',
    vote_average: 7.6,
    createdAt: '2022-12-16T00:00:00Z',
    rank: 4
  },
  {
    id: 'mov_2',
    title: 'Sita Ramam',
    overview: 'An untold love story that transcends time.',
    poster_path: 'https://picsum.photos/300/450?random=18',
    backdrop_path: 'https://picsum.photos/1920/1080?random=18',
    type: ContentType.MOVIE,
    rating: 'U',
    year: 2022,
    tags: ['Romance', 'Drama'],
    youtubeId: 'dummy_yt_18',
    genres: ['Romance', 'Drama'],
    release_date: '2022-08-05',
    vote_average: 8.6,
    createdAt: '2022-08-05T00:00:00Z',
    rank: 5
  },
  {
    id: 'mov_3',
    title: 'KGF: Chapter 2',
    overview: 'The rise of a new don in the underworld.',
    poster_path: 'https://picsum.photos/300/450?random=19',
    backdrop_path: 'https://picsum.photos/1920/1080?random=19',
    type: ContentType.MOVIE,
    rating: 'A',
    year: 2022,
    tags: ['Action', 'Thriller'],
    youtubeId: 'dummy_yt_19',
    genres: ['Action', 'Thriller'],
    release_date: '2022-04-14',
    vote_average: 8.3,
    createdAt: '2022-04-14T00:00:00Z',
    rank: 6
  },
  {
    id: 'tv_2',
    title: 'Stranger Things',
    overview: 'When a young boy vanishes, a small town uncovers a mystery.',
    poster_path: 'https://picsum.photos/300/450?random=20',
    backdrop_path: 'https://picsum.photos/1920/1080?random=20',
    type: ContentType.SERIES,
    rating: 'U/A 16+',
    year: 2016,
    tags: ['Sci-Fi', 'Horror'],
    youtubeId: 'dummy_yt_20',
    genres: ['Sci-Fi', 'Horror'],
    release_date: '2016-07-15',
    vote_average: 8.7,
    createdAt: '2016-07-15T00:00:00Z',
    episodes: []
  },
  {
    id: 'tv_3',
    title: 'Money Heist',
    overview: 'An unusual group of robbers attempt the most perfect robbery.',
    poster_path: 'https://picsum.photos/300/450?random=21',
    backdrop_path: 'https://picsum.photos/1920/1080?random=21',
    type: ContentType.SERIES,
    rating: 'A',
    year: 2017,
    tags: ['Crime', 'Thriller'],
    isOriginal: true,
    youtubeId: 'dummy_yt_21',
    genres: ['Crime', 'Thriller'],
    release_date: '2017-05-02',
    vote_average: 8.2,
    createdAt: '2017-05-02T00:00:00Z',
    rank: 8
  },
  {
    id: 'tv_4',
    title: 'The Office',
    overview: 'A mockumentary on a group of typical office workers.',
    poster_path: 'https://picsum.photos/300/450?random=22',
    backdrop_path: 'https://picsum.photos/1920/1080?random=22',
    type: ContentType.SERIES,
    rating: 'U/A 13+',
    year: 2005,
    tags: ['Comedy', 'Sitcom'],
    youtubeId: 'dummy_yt_22',
    genres: ['Comedy', 'Sitcom'],
    release_date: '2005-03-24',
    vote_average: 8.9,
    createdAt: '2005-03-24T00:00:00Z',
    rank: 9
  },
  {
    id: 'mov_5',
    title: 'Inception',
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology.',
    poster_path: 'https://picsum.photos/300/450?random=23',
    backdrop_path: 'https://picsum.photos/1920/1080?random=23',
    type: ContentType.MOVIE,
    rating: 'U/A 13+',
    year: 2010,
    tags: ['Sci-Fi', 'Action'],
    youtubeId: 'dummy_yt_23',
    genres: ['Sci-Fi', 'Action'],
    release_date: '2010-07-16',
    vote_average: 8.8,
    createdAt: '2010-07-16T00:00:00Z',
    rank: 9
  },
  {
    id: 'mov_6',
    title: 'Interstellar',
    overview: 'A team of explorers travel through a wormhole in space.',
    poster_path: 'https://picsum.photos/300/450?random=24',
    backdrop_path: 'https://picsum.photos/1920/1080?random=24',
    type: ContentType.MOVIE,
    rating: 'U/A 13+',
    year: 2014,
    tags: ['Sci-Fi', 'Drama'],
    youtubeId: 'dummy_yt_24',
    genres: ['Sci-Fi', 'Drama'],
    release_date: '2014-11-07',
    vote_average: 8.6,
    createdAt: '2014-11-07T00:00:00Z',
    rank: 10
  }
];

export const CATEGORIES = [
  { id: 'trending', title: 'Trending Now' },
  { id: 'originals', title: 'My Donkey Originals' },
  { id: 'action', title: 'Action Movies' },
  { id: 'bollywood', title: 'Best of Bollywood' },
  { id: 'south', title: 'South Indian Hits' },
];

export const FOOTER_PAGE_CONTENT: Record<string, InfoPageData> = {
  'About Us': {
    id: 'about',
    title: 'About My Donkey',
    description: 'We are storytelling the future of entertainment.',
    sections: [
      {
        heading: 'Our Mission',
        content: 'To bring the world closer together through empathy and shared stories. My Donkey is more than just streaming; it is a cultural bridge connecting over 150 countries through the power of cinema and sports.'
      },
      {
        heading: 'Our Journey',
        content: 'Founded in 2026, My Donkey started as a small project to highlight regional Indian cinema and has quickly grown into a global powerhouse featuring international content, live sports, and cutting-edge interactive features.',
        steps: [
          '2026: Founded in Mumbai',
          '2025: Launched Global Streaming',
          '2025: Reached 10 Million Subscribers'
        ]
      },
      {
        heading: 'Leadership',
        listItems: ['CEO: Donkey Kong', 'CTO: Shrek', 'Head of Content: Puss in Boots']
      }
    ],
    lastUpdated: 'Jan 15, 2025'
  },
  'Careers': {
    id: 'careers',
    title: 'Careers at My Donkey',
    description: 'Join the herd. Build the future of streaming.',
    sections: [
      {
        heading: 'Why Work With Us?',
        content: 'We offer a culture of freedom and responsibility. We value people over process and innovation over caution.'
      },
      {
        heading: 'Open Positions',
        listItems: [
          'Senior Backend Engineer (Go/Node.js)',
          'UI/UX Designer (Figma/React)',
          'Content Acquisitions Manager - APAC',
          'Data Scientist - Recommendation AI'
        ]
      },
      {
        heading: 'Hiring Process',
        steps: [
          'Apply Online via LinkedIn or our Portal',
          'Initial Screening Call',
          'Technical Assessment / Portfolio Review',
          'Culture Fit Interview',
          'Offer & Onboarding'
        ]
      }
    ]
  },
  'Press': {
    id: 'press',
    title: 'Press Room',
    description: 'Latest news, assets, and announcements.',
    sections: [
      {
        heading: 'Media Inquiries',
        content: 'For press related questions, please submit an inquiry via our Support Desk.'
      },
      {
        heading: 'Recent News',
        listItems: [
          'My Donkey acquires rights to IPL 2026',
          'New partnership with Major Hollywood Studios',
          'Quarterly Earnings Report: Q4 2026'
        ]
      }
    ]
  },
  'Blog': {
    id: 'blog',
    title: 'The Donkey Blog',
    description: 'Stories behind the screens.',
    sections: [
      {
        heading: 'Tech Spotlight',
        content: 'How we reduced latency by 50% using our new CDN architecture.'
      },
      {
        heading: 'Creator Corner',
        content: 'Meet the filmmakers changing the landscape of regional cinema.'
      }
    ]
  },
  'Investors': {
    id: 'investors',
    title: 'Investor Relations',
    description: 'Financial performance and corporate governance.',
    sections: [
      {
        heading: 'Stock Information',
        content: 'Ticker: DONK (NSE/BSE)'
      },
      {
        heading: 'Financial Reports',
        listItems: ['Annual Report 2026', 'Q3 2026 Earnings Call Transcript']
      }
    ]
  },
  'Help Center': {
    id: 'help',
    title: 'Help Center',
    description: 'How can we help you today?',
    sections: [
      {
        heading: 'Top Topics',
        steps: [
          'Resetting your password',
          'Managing payment methods',
          'Troubleshooting buffering issues',
          'Understanding parental controls'
        ]
      },
      {
        heading: 'Contact Support',
        content: 'Our team is available 24/7. Submit a ticket through our online Support Desk for instant assistance.'
      }
    ]
  },
  'Supported Devices': {
    id: 'devices',
    title: 'Supported Devices',
    description: 'Watch anywhere, anytime.',
    sections: [
      {
        heading: 'TVs & Streaming Players',
        listItems: ['Samsung Smart TVs (2018+)', 'LG WebOS', 'Android TV / Google TV', 'Apple TV (4th Gen+)', 'Fire TV Stick 4K']
      },
      {
        heading: 'Mobile & Tablet',
        listItems: ['iOS 14.0 or later', 'Android 8.0 or later']
      },
      {
        heading: 'Computer',
        listItems: ['Chrome', 'Firefox', 'Safari', 'Edge']
      }
    ]
  },
  'Contact Us': {
    id: 'contact',
    title: 'Contact Us',
    description: 'We love hearing from our herd.',
    sections: [
      {
        heading: 'Customer Service',
        content: '000-800-040-1843 (Toll Free in India)'
      },
      {
        heading: 'Corporate Address',
        content: 'My Donkey HQ, Plot C-42, Bandra Kurla Complex, Mumbai, Maharashtra 400051'
      }
    ]
  },
  'Activate Device': {
    id: 'activate',
    title: 'Activate Device',
    description: 'Connect your TV or streaming stick to your account.',
    sections: [
      {
        heading: 'Activation Steps',
        steps: [
          'Download the My Donkey app on your TV or Streaming Device.',
          'Open the app and select "Sign In".',
          'You will see an 8-digit code on your TV screen.',
          'Enter the code below to link your device.'
        ]
      },
      {
        heading: 'Enter Code',
        content: '[ INPUT FIELD: _ _ _ _ - _ _ _ _ ] (This is a placeholder)'
      }
    ]
  },
  'Terms of Use': {
    id: 'terms',
    title: 'Terms of Use',
    description: 'Please read these terms carefully before using our service.',
    sections: [
      {
        heading: '1. Membership',
        content: 'Your My Donkey membership will continue until terminated. To use the My Donkey service you must have Internet access and a ready device...'
      }
    ]
  }
};