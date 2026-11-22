export type ThemeId = 'animals' | 'food' | 'space' | 'ocean' | 'sports' | 'countries' | 'gaming';

export interface WordTheme {
  id: ThemeId;
  label: string;
  emoji: string;
  words: string[];
}

const list = (s: string) => s.trim().split(/\s+/);

export const THEMES: WordTheme[] = [
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
];

export const themeById = (id: ThemeId): WordTheme => THEMES.find((t) => t.id === id) ?? THEMES[0];

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
