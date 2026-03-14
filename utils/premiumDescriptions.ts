import { Content } from '../types';

const GENRE_DESCRIPTIONS: Record<string, string[]> = {
    Action: [
        "A thrilling journey full of unexpected twists.",
        "An adventure that will keep you hooked.",
        "A battle between hope and darkness.",
        "When survival becomes the only mission.",
        "A hero rises in the darkest time.",
        "Danger follows every step.",
        "A race against time begins.",
        "A daring mission no one expected.",
        "Courage meets impossible challenges.",
        "A thrilling fight for survival.",
        "A fearless hero challenges fate.",
        "The chase begins with no escape.",
        "A thrilling ride from start to finish.",
        "A dangerous game of strategy.",
        "A battle to protect what matters most.",
        "A thrilling escape from danger.",
        "A fearless journey into chaos.",
        "A dramatic fight for survival.",
        "A powerful fight for freedom.",
        "A world filled with danger and secrets.",
        "A hero faces the impossible.",
        "A battle that will change everything.",
        "A powerful fight for justice.",
        "A thrilling story of bravery.",
        "A dangerous plan begins."
    ],
    Drama: [
        "Secrets unfold in this gripping drama.",
        "Love, betrayal, and destiny collide.",
        "A powerful tale of ambition and dreams.",
        "One decision changes everything.",
        "An emotional story about family and sacrifice.",
        "A dramatic fight for justice.",
        "Dreams clash with harsh reality.",
        "A story that explores human emotions.",
        "A story about redemption and hope.",
        "A powerful journey of self-discovery.",
        "A dramatic clash of destinies.",
        "Every choice has consequences.",
        "A story about love and sacrifice.",
        "A struggle between duty and desire.",
        "An emotional tale of friendship.",
        "A powerful drama unfolds slowly.",
        "A dramatic twist at every step.",
        "An emotional story of courage.",
        "A powerful journey through fear and hope.",
        "A story that challenges destiny.",
        "A dramatic story of survival.",
        "An unforgettable story of courage.",
        "A journey that tests loyalty.",
        "A powerful clash of dreams.",
        "A dramatic struggle for power.",
        "A story about hope in darkness.",
        "A powerful story that stays with you."
    ],
    Mystery: [
        "A mystery waiting to be solved.",
        "The past returns with dangerous secrets.",
        "A chilling thriller that keeps you guessing.",
        "A world where nothing is what it seems.",
        "A suspenseful journey into the unknown.",
        "The truth hides behind every shadow.",
        "A dark mystery unfolds slowly.",
        "Secrets buried deep finally emerge.",
        "Every episode reveals a new secret.",
        "A gripping crime story begins.",
        "One mystery leads to another.",
        "The fight for truth begins.",
        "Darkness hides behind friendly faces.",
        "A dangerous secret threatens everything.",
        "The truth slowly reveals itself.",
        "A mystery that refuses to stay hidden.",
        "The past refuses to stay buried.",
        "A suspenseful adventure begins.",
        "A chilling story full of surprises.",
        "A race to uncover the truth.",
        "One secret could destroy everything.",
        "A mysterious stranger changes everything.",
        "The past returns to haunt the present.",
        "A dark secret hides in plain sight.",
        "A suspenseful tale of revenge.",
        "The truth hides behind lies.",
        "A thrilling mystery unfolds slowly.",
        "A mystery deeper than it seems.",
        "A dark truth finally emerges."
    ],
    Comedy: [
        "A small mistake leads to chaos.",
        "When enemies become allies.",
        "An unforgettable adventure awaits.",
        "A hilarious journey full of unexpected twists.",
        "Laughter, love, and a bit of insanity.",
        "Not your average everyday hero.",
        "Everything that can go wrong, will go wrong.",
        "A wild night you'll never forget.",
        "A journey that changes everything.",
        "A hilarious clash of destinies."
    ],
    SciFi: [
        "A world controlled by hidden powers.",
        "A suspenseful journey into the unknown.",
        "An unforgettable adventure awaits.",
        "A daring mission no one expected.",
        "A race against time begins.",
        "A heroic sacrifice to save humanity.",
        "A chilling story full of surprises.",
        "Destiny takes an unexpected turn.",
        "A thrilling journey across unknown lands.",
        "A battle that will change everything.",
        "A suspenseful chase begins.",
        "A thrilling adventure across time."
    ],
    Romance: [
        "Love, betrayal, and destiny collide.",
        "A love story beyond all limits.",
        "An emotional story about family and sacrifice.",
        "A story about love and sacrifice.",
        "A struggle between duty and desire.",
        "A journey that tests loyalty.",
        "An emotional tale of friendship.",
        "A dramatic twist at every step.",
        "Destiny takes an unexpected turn.",
        "When survival becomes the only mission.",
        "A powerful story that stays with you."
    ]
};

const GENERIC_DESCRIPTIONS = [
    "A journey that changes everything.",
    "A story about redemption and hope.",
    "A powerful journey of self-discovery.",
    "An unforgettable adventure awaits.",
    "Every choice has consequences.",
    "The line between hero and villain fades.",
    "A world filled with danger and secrets.",
    "A breathtaking cinematic experience.",
    "Prepare to be on the edge of your seat.",
    "The ultimate test of loyalty."
];

// Map API genres to our internal categories
const GENRE_MAPPING: Record<string, string> = {
    'action': 'Action',
    'adventure': 'Action',
    'animation': 'Action',
    'anime': 'Action',
    'drama': 'Drama',
    'thriller': 'Mystery',
    'mystery': 'Mystery',
    'horror': 'Mystery',
    'crime': 'Mystery',
    'comedy': 'Comedy',
    'family': 'Comedy',
    'science fiction': 'SciFi',
    'sci-fi': 'SciFi',
    'fantasy': 'SciFi',
    'romance': 'Romance'
};

/**
 * Gets a premium, ultra-high quality short description tailored to the content's genre.
 */
export function getPremiumDescription(item: Content): string {
    if (!item || !item.genres || item.genres.length === 0) {
        return GENERIC_DESCRIPTIONS[Math.floor(Math.random() * GENERIC_DESCRIPTIONS.length)];
    }

    // Try to find a matching category
    let selectedCategory = '';

    // Sort genres randomly so it doesn't always pick 'Action' if a movie is 'Action, Comedy'
    const shuffledGenres = [...item.genres].sort(() => 0.5 - Math.random());

    for (const genre of shuffledGenres) {
        const mapped = GENRE_MAPPING[genre.toLowerCase()];
        if (mapped) {
            selectedCategory = mapped;
            break;
        }
    }

    const phraseList = selectedCategory ? GENRE_DESCRIPTIONS[selectedCategory] : GENERIC_DESCRIPTIONS;

    // If somehow the list is empty, fallback to generic
    if (!phraseList || phraseList.length === 0) {
        return GENERIC_DESCRIPTIONS[Math.floor(Math.random() * GENERIC_DESCRIPTIONS.length)];
    }

    // Hash the ID to consistently return the SAME description for the SAME content to a user
    let hash = 0;
    const strToHash = item.id + item.title;
    for (let i = 0; i < strToHash.length; i++) {
        hash = ((hash << 5) - hash) + strToHash.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % phraseList.length;

    return phraseList[index];
}
