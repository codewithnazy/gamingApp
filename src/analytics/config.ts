export const ANALYTICS_CONFIG = {
  /** Master switch. false = no analytics code runs at all. */
  enabled: true,
  /**
   * Send events to Firebase Analytics when the Firebase packages are installed and configured
   * (see docs/ANALYTICS.md). Until then events only stay in a small in-memory buffer.
   */
  firebase: true,
};
