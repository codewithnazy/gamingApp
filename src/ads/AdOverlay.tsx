import { StyleSheet, Text, View } from 'react-native';
import { useAdsState } from './store';

/**
 * Covers the screen while a SIMULATED ad plays (web preview only; real ads draw their own
 * full-screen UI, so on phones this never renders).
 */
export function AdOverlay() {
  const { simulating } = useAdsState();
  if (!simulating) return null;
  return (
    <View style={styles.overlay} accessibilityLabel="Simulated ad playing">
      <View style={styles.card}>
        <Text style={styles.emoji}>📺</Text>
        <Text style={styles.title}>Sample ad</Text>
        <Text style={styles.sub}>{simulating === 'rewarded' ? 'Rewarded video (preview)' : 'Between-levels ad (preview)'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,6,30,0.92)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  card: { alignItems: 'center', gap: 6 },
  emoji: { fontSize: 56 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
});
