import { StyleSheet, Text, View } from 'react-native';

/** A dark strip with a padlock: "this feature isn't open yet" (e.g. "Season Pass unlocks at Level 3!"). */
export function LockedBanner({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.banner} accessibilityRole="text" accessibilityLabel={`Locked. ${text}`}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.text} numberOfLines={2}>
        {text}
      </Text>
      <Text style={styles.lock}>🔒</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 8, borderRadius: 14, backgroundColor: 'rgba(20,12,45,0.72)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18 },
  text: { flex: 1, color: '#fff', fontWeight: '900', fontSize: 14, textAlign: 'center' },
  lock: { fontSize: 20, opacity: 0.9 },
});
