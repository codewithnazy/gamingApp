import { StyleSheet } from 'react-native';

/** Shared "frosted glass" look used on top of the colourful gradient backgrounds. */
export const glass = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 18,
  },
  text: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export const ink = '#1b1633';
