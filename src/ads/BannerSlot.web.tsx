import { StyleSheet, Text, View } from 'react-native';
import { useAdsState } from './store';

/** Web preview: a placeholder where the banner would appear. */
export function BannerSlot() {
  const { enabled } = useAdsState();
  if (!enabled) return null;
  return (
    <View style={styles.wrap} accessibilityLabel="Banner ad placeholder">
      <Text style={styles.text}>Banner ad · web preview</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 56, margin: 8, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  text: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
});
