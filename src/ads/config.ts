// ---------------------------------------------------------------------------------------------
// Ads configuration. This is the ONE file you edit to go from test ads to real, paying ads.
//
// While an ad unit is `null` (or when running a development build), the app shows Google's
// official TEST ads. Test ads are safe: they never earn money and can never get your AdMob
// account flagged. NEVER click real ads on your own devices - use test ads while developing.
//
// To go live: create the ad units in your AdMob dashboard (see docs/MONETIZATION.md), paste their
// IDs below (format: ca-app-pub-1234567890123456/1234567890), and put your AdMob *app* IDs in
// app.json (plugins -> react-native-google-mobile-ads -> androidAppId / iosAppId).
// ---------------------------------------------------------------------------------------------

export interface UnitIds {
  android: string | null;
  ios: string | null;
}

export const ADS_CONFIG = {
  /** Master switch. Set to false to ship the game with no ads at all. */
  enabled: true,

  units: {
    /** Banner on the menu screens (never next to the puzzle grid). */
    banner: { android: null, ios: null } as UnitIds,
    /** Occasional full-screen ad between levels. */
    interstitial: { android: null, ios: null } as UnitIds,
    /** Optional "watch a video for a free hint" ad. The player chooses to watch it. */
    rewarded: { android: null, ios: null } as UnitIds,
  },

  /**
   * Your own phone(s), as AdMob test devices. On a real-ads build, a registered device gets TEST
   * ads, so you can tap them freely. Find the ID in the log (adb logcat) the first time real ads
   * load, or in AdMob -> Settings -> Test devices. Clicking real ads on your own device can get
   * your AdMob account disabled - register every phone you test on.
   */
  testDeviceIds: [] as string[],

  /** Highest content rating of ads to show. 'PG' is a sensible default for a word game. */
  maxAdContentRating: 'PG' as 'G' | 'PG' | 'T' | 'MA',

  /**
   * Legal declaration: is this app directed to children under 13? If you answer yes, Google's
   * Families policies apply and many ad features are restricted. A general-audience word game
   * is normally 'false'. Answer truthfully - it is YOUR declaration to Google.
   */
  tagForChildDirectedTreatment: false,

  /**
   * How often the between-levels full-screen ad may appear. Tune it here - nowhere else.
   * An ad is only ever considered AFTER a puzzle is finished and the player taps Continue; never
   * during play, on Restart/Replay, or at app start.
   */
  interstitial: {
    /**
     * Eligible after this many finished puzzles since the last ad. A number between minLevels and
     * maxLevels is picked at random each cycle, so it is "about every 3-4 levels", not a metronome.
     */
    minLevels: 3,
    maxLevels: 4,
    /** Never more often than this many milliseconds apart. */
    minGapMs: 120_000,
    /** Never before the player has reached this level (new players get a clean start). */
    firstEligibleLevel: 5,
    /** Never in the first N milliseconds after the app starts. */
    appStartGraceMs: 60_000,
    /** Give up if a loaded interstitial has not opened within this long (milliseconds). */
    showTimeoutMs: 8_000,
  },

  /** Rewarded-ad timing. The player is never left waiting indefinitely. */
  rewarded: {
    /** If no rewarded ad is ready, wait at most this long for one to load (milliseconds). */
    loadTimeoutMs: 8_000,
    /** Give up if a loaded rewarded ad has not opened within this long (milliseconds). */
    showTimeoutMs: 10_000,
  },
};

export type AdKind = keyof typeof ADS_CONFIG.units;
export type InterstitialRules = typeof ADS_CONFIG.interstitial;
