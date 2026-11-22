import { EXTRA_THEMES, EXTRA_WORDS } from './moreWords.ts';

export type ThemeId =
  | 'animals'
  | 'food'
  | 'space'
  | 'ocean'
  | 'sports'
  | 'countries'
  | 'gaming'
  | 'weather'
  | 'music'
  | 'jobs'
  | 'nature'
  | 'transport'
  | 'science'
  | 'school'
  | 'home'
  | 'cities'
  | 'fantasy'
  | 'insects'
  | 'clothes'
  | 'kitchen'
  | 'colors'
  | 'birds'
  | 'fruits'
  | 'vegetables'
  | 'body'
  | 'emotions'
  | 'tools'
  | 'flowers'
  | 'toys'
  | 'dinosaurs'
  | 'festivals'
  /** Virtual theme: every word from every theme, jumbled together. */
  | 'mixed';

export interface WordTheme {
  id: ThemeId;
  label: string;
  emoji: string;
  words: string[];
}

const list = (s: string) => s.trim().split(/\s+/);

const BASE_THEMES: WordTheme[] = [
  {
    id: 'animals',
    label: 'Animals',
    emoji: '🦁',
    words: list(`
      LION TIGER ZEBRA HORSE PANDA KOALA OTTER EAGLE SHARK WHALE SNAKE MOUSE RABBIT
      MONKEY GIRAFFE PENGUIN DOLPHIN CAMEL WOLF FROG DEER BEAR TURTLE FALCON PARROT
      LIZARD BEAVER HAMSTER OCTOPUS GORILLA CHEETAH LEOPARD KANGAROO
    `),
  },
  {
    id: 'food',
    label: 'Food',
    emoji: '🍕',
    words: list(`
      PIZZA BURGER PASTA SALAD TACO SUSHI NOODLE BREAD CHEESE BUTTER COOKIE DONUT MANGO
      APPLE BANANA GRAPES LEMON ORANGE PEACH CARROT POTATO TOMATO ONION GARLIC PEPPER
      CURRY WAFFLE PANCAKE COCONUT
    `),
  },
  {
    id: 'space',
    label: 'Space',
    emoji: '🚀',
    words: list(`
      PLANET STAR MOON COMET GALAXY ORBIT ROCKET SATURN JUPITER MARS VENUS EARTH PLUTO
      NEPTUNE URANUS SOLAR LUNAR ALIEN COSMOS METEOR NEBULA PULSAR ECLIPSE ASTEROID
      GRAVITY SHUTTLE CAPSULE
    `),
  },
  {
    id: 'ocean',
    label: 'Ocean',
    emoji: '🌊',
    words: list(`
      OCEAN WAVE CORAL REEF SQUID CRAB SHELL TIDE BEACH SAND SEAL LOBSTER SHRIMP ANCHOR
      ISLAND HARBOR SAILOR PEARL KRAKEN NAUTILUS TURTLE ORCA SEAWEED SEAHORSE STARFISH
      LAGOON CURRENT DOLPHIN WHALE
    `),
  },
  {
    id: 'sports',
    label: 'Sports',
    emoji: '⚽',
    words: list(`
      SOCCER TENNIS CRICKET HOCKEY RUGBY GOLF BOXING SWIM RACE SKATE JUDO KARATE ARCHERY
      BASEBALL BOWLING DIVING SURFING ROWING CYCLING YOGA SQUASH FENCING NETBALL
      MARATHON POLO DARTS SNOOKER
    `),
  },
  {
    id: 'countries',
    label: 'Countries',
    emoji: '🌍',
    words: list(`
      INDIA JAPAN BRAZIL EGYPT CANADA FRANCE ITALY SPAIN KENYA PERU CHINA NEPAL GREECE
      MEXICO NORWAY TURKEY CHILE SWEDEN POLAND RUSSIA GERMANY IRELAND VIETNAM THAILAND
      MOROCCO CUBA ISRAEL
    `),
  },
  {
    id: 'gaming',
    label: 'Gaming',
    emoji: '🎮',
    words: list(`
      LEVEL BOSS QUEST SCORE PIXEL ARCADE JOYSTICK CONSOLE AVATAR COMBO LOOT GUILD
      RESPAWN SPRITE ROBOT MAGIC SWORD SHIELD DRAGON WIZARD CASTLE TROPHY PLAYER SQUAD
      BONUS TURBO RACING PUZZLE HEALTH STEALTH ENEMY CRAFT POWERUP
    `),
  },
  {
    id: 'weather',
    label: 'Weather',
    emoji: '⛈️',
    words: list(`
      STORM CLOUD RAINY SNOWY WINDY THUNDER LIGHTNING SUNNY FOGGY CLOUDY RAINBOW BREEZE
      HAIL FROST SLEET DRIZZLE TORNADO HURRICANE MONSOON BLIZZARD HUMID GUST SHOWER MIST
      CHILLY STORMY FREEZE THAW DROUGHT FLOOD ICICLE SUNSHINE WEATHER CLIMATE TEMPEST TYPHOON
    `),
  },
  {
    id: 'music',
    label: 'Music',
    emoji: '🎵',
    words: list(`
      PIANO GUITAR VIOLIN DRUMS FLUTE TRUMPET HARP CELLO BANJO SAXOPHONE ORGAN TUNE MELODY
      RHYTHM CHORUS LYRICS SONG BEAT BASS TEMPO NOTE SCALE CHORD OPERA JAZZ ROCK BLUES FOLK
      CHOIR BAND CONCERT ALBUM TREBLE HARMONY MICROPHONE TAMBOURINE ACCORDION XYLOPHONE
      CLARINET TROMBONE UKULELE
    `),
  },
  {
    id: 'jobs',
    label: 'Jobs',
    emoji: '💼',
    words: list(`
      DOCTOR NURSE TEACHER PILOT FARMER BAKER ARTIST WRITER DRIVER ENGINEER LAWYER JUDGE
      POLICE ACTOR SINGER DENTIST PAINTER SAILOR TAILOR BUILDER MINER DIVER GUARD CLERK
      BANKER PLUMBER BARBER COACH MAYOR SCIENTIST DESIGNER DANCER CARPENTER ASTRONAUT
    `),
  },
  {
    id: 'nature',
    label: 'Nature',
    emoji: '🌳',
    words: list(`
      FOREST RIVER MOUNTAIN VALLEY MEADOW DESERT JUNGLE CANYON GLACIER VOLCANO WATERFALL
      LAKE OCEAN ISLAND CAVE HILL PLAIN SWAMP TUNDRA PRAIRIE CLIFF BEACH CREEK BROOK POND
      OASIS REEF SPRING GROVE THICKET MARSH BAYOU FJORD LAGOON DELTA
    `),
  },
  {
    id: 'transport',
    label: 'Transport',
    emoji: '🚗',
    words: list(`
      TRAIN PLANE BOAT SHIP TRUCK BICYCLE SCOOTER TAXI METRO TRAM FERRY HELICOPTER
      SUBMARINE CANOE KAYAK SAILBOAT TRACTOR JEEP LORRY CARAVAN SEDAN WAGON CARRIAGE
      GLIDER BALLOON CRUISER LIMO TROLLEY SLEIGH CHOPPER MINIBUS AIRPLANE
    `),
  },
  {
    id: 'science',
    label: 'Science',
    emoji: '🔬',
    words: list(`
      ATOM CELL ENERGY FORCE GRAVITY MAGNET ELEMENT MOLECULE PROTON NEUTRON ELECTRON
      LASER ORBIT VIRUS GENE BACTERIA FOSSIL ENZYME ACID BASE LIQUID SOLID PLASMA VACUUM
      MICROSCOPE EXPERIMENT BEAKER THEORY RESEARCH HYPOTHESIS CARBON OXYGEN HELIUM NEON
      IRON SODIUM LABORATORY
    `),
  },
  {
    id: 'school',
    label: 'School',
    emoji: '🎒',
    words: list(`
      PENCIL ERASER NOTEBOOK TEACHER CLASS DESK BOOK LESSON HOMEWORK EXAM GRADE MATHS
      SCIENCE HISTORY PLAYGROUND LIBRARY SCHOOL BACKPACK RULER MARKER CHALK BOARD UNIFORM
      STUDENT PUPIL RECESS PRINCIPAL TEXTBOOK CAMPUS DIPLOMA
    `),
  },
  {
    id: 'home',
    label: 'Home',
    emoji: '🏠',
    words: list(`
      KITCHEN BEDROOM SOFA TABLE CHAIR WINDOW DOOR GARDEN ROOF FLOOR WALL STAIRS CARPET
      CURTAIN PILLOW BLANKET LAMP SHELF CLOSET MIRROR BATHROOM ATTIC BASEMENT GARAGE FENCE
      CHIMNEY BALCONY DRAWER COUCH CUSHION PORCH LOUNGE
    `),
  },
  {
    id: 'cities',
    label: 'Cities',
    emoji: '🏙️',
    words: list(`
      PARIS LONDON TOKYO DELHI CAIRO ROME MADRID BERLIN SYDNEY MUMBAI DUBAI LISBON OSLO
      ATHENS VIENNA PRAGUE MOSCOW SEOUL LIMA BOGOTA HAVANA NAIROBI TORONTO CHICAGO BOSTON
      MIAMI DENVER SEATTLE KYOTO BEIJING JAKARTA MANILA HANOI SINGAPORE AMSTERDAM BANGKOK
    `),
  },
  {
    id: 'fantasy',
    label: 'Fantasy',
    emoji: '🐉',
    words: list(`
      DRAGON WIZARD KNIGHT CASTLE QUEST SWORD SHIELD FAIRY GOBLIN TROLL ELVES DWARF GIANT
      MAGIC SPELL POTION WITCH UNICORN PHOENIX GRIFFIN TREASURE KINGDOM PRINCESS CROWN
      THRONE DUNGEON CURSE LEGEND MYTH MERMAID OGRE CENTAUR SORCERER WAND
    `),
  },
  {
    id: 'insects',
    label: 'Insects',
    emoji: '🐞',
    words: list(`
      BEETLE BUTTERFLY SPIDER WASP MOTH CRICKET LADYBUG DRAGONFLY MOSQUITO CICADA HORNET
      TERMITE LOCUST MANTIS FIREFLY COCKROACH SCORPION TICK FLEA CENTIPEDE MILLIPEDE GNAT
      SILKWORM WEEVIL APHID TARANTULA BUMBLEBEE EARWIG MIDGE MAYFLY GADFLY SAWFLY HOVERFLY
      ANTLION CHAFER
    `),
  },
  {
    id: 'clothes',
    label: 'Clothes',
    emoji: '👕',
    words: list(`
      SHIRT PANTS JACKET DRESS SKIRT SOCKS SHOES BOOTS SCARF GLOVES JEANS SWEATER COAT
      BELT SANDALS SLIPPERS PAJAMAS HOODIE APRON TROUSERS SHORTS BLOUSE SUIT CAPE VEST
      CARDIGAN UNIFORM COSTUME MITTENS BEANIE SNEAKERS TUXEDO POCKET BUTTON ZIPPER COLLAR
      SLEEVE
    `),
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    emoji: '🍳',
    words: list(`
      SPOON FORK KNIFE PLATE BOWL KETTLE TOASTER OVEN STOVE BLENDER WHISK LADLE TONGS
      GRATER SPATULA SKILLET SAUCEPAN FRIDGE FREEZER MICROWAVE PANTRY TRAY TEAPOT COLANDER
      SIEVE TIMER COUNTER SINK DISH PLATTER CLEAVER PEELER MIXER GLASS
    `),
  },
  {
    id: 'colors',
    label: 'Colors',
    emoji: '🎨',
    words: list(`
      PURPLE ORANGE YELLOW GREEN BLUE BLACK WHITE PINK BROWN GREY SILVER GOLDEN INDIGO
      VIOLET SCARLET CRIMSON TURQUOISE MAGENTA AMBER IVORY BEIGE MAROON TEAL CORAL CYAN
      LAVENDER LILAC OLIVE PAINT BRUSH CANVAS PALETTE SKETCH
    `),
  },
];

const dedupe = (words: string[]) => [...new Set(words)];

/** Every real theme: base words + extra words, plus the brand-new themes. */
export const THEMES: WordTheme[] = [
  ...BASE_THEMES.map((t) => ({ ...t, words: dedupe([...t.words, ...list(EXTRA_WORDS[t.id] ?? '')]) })),
  ...EXTRA_THEMES.map((t) => ({ id: t.id as ThemeId, label: t.label, emoji: t.emoji, words: dedupe(list(t.words)) })),
];

/** Every distinct word across all themes — the pool for jumbled levels. */
export const ALL_WORDS: string[] = dedupe(THEMES.flatMap((t) => t.words));

/** "Mixed": words from every theme jumbled together in the same puzzle. */
export const MIXED_THEME: WordTheme = { id: 'mixed', label: 'Mixed', emoji: '🎲', words: ALL_WORDS };

/** What the Quick play picker offers: Mixed first, then each single theme. */
export const THEME_CHOICES: WordTheme[] = [MIXED_THEME, ...THEMES];

export const themeById = (id: ThemeId): WordTheme =>
  id === 'mixed' ? MIXED_THEME : (THEMES.find((t) => t.id === id) ?? MIXED_THEME);

// ---- Background palettes -------------------------------------------------

export type PaletteId = 'sunset' | 'candy' | 'aurora' | 'ocean' | 'forest' | 'galaxy';

export interface Palette {
  id: PaletteId;
  label: string;
  /** Gradient stops, top-left to bottom-right. Dark enough for white text. */
  colors: [string, string, string];
  /** Color of the floating background bubbles. */
  bubble: string;
}

export const PALETTES: Palette[] = [
  { id: 'sunset', label: 'Sunset', colors: ['#f2557d', '#e8793a', '#7b3fe4'], bubble: '#ffd27d' },
  { id: 'candy', label: 'Candy', colors: ['#e34aa8', '#8a4bdf', '#2f8fe8'], bubble: '#ffb3e6' },
  { id: 'aurora', label: 'Aurora', colors: ['#0fa37f', '#2a6fdb', '#7a3fd1'], bubble: '#8dffd2' },
  { id: 'ocean', label: 'Ocean', colors: ['#0c7bb8', '#1456c9', '#0b2d78'], bubble: '#7fdcff' },
  { id: 'forest', label: 'Forest', colors: ['#2e9e4f', '#117a6a', '#0b4a56'], bubble: '#b6ff9a' },
  { id: 'galaxy', label: 'Galaxy', colors: ['#5b2bc4', '#2b1f84', '#12123d'], bubble: '#c7a6ff' },
];

export const paletteById = (id: PaletteId): Palette =>
  PALETTES.find((p) => p.id === id) ?? PALETTES[0];

/** Vivid colors for found words; dark text stays readable on all of them. */
export const FOUND_COLORS = [
  '#ffd166',
  '#06d6a0',
  '#ff7aa2',
  '#4cc9f0',
  '#ff9f68',
  '#c8a2ff',
  '#a3f07a',
  '#ffb3b3',
  '#8be9fd',
  '#f7f08a',
];
