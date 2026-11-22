import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { onStreakMilestone } from '../daily/actions';
import * as feedback from '../haptics';
import { ink } from '../glass';

/** A small, brief celebration banner when the streak hits a milestone (3, 7, 14, 30, ... days). */
export function StreakCelebration() {
  const [days, setDays] = useState<number | null>(null);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(
    () =>
      onStreakMilestone((n) => {
        setDays(n);
        feedback.success();
        t.setValue(0);
        Animated.sequence([
          Animated.timing(t, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
          Animated.delay(2400),
          Animated.timing(t, { toValue: 2, duration: 400, useNativeDriver: true }),
        ]).start(() => setDays(null));
      }),
    [t],
  );

  if (days === null) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.banner,
          {
            opacity: t.interpolate({ inputRange: [0, 0.4, 1, 2], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: t.interpolate({ inputRange: [0, 1, 2], outputRange: [-40, 0, -20] }) },
              { scale: t.interpolate({ inputRange: [0, 1, 2], outputRange: [0.7, 1, 0.95] }) },
            ],
          },
        ]}
      >
        <Text style={styles.confetti}>🎉 ✨ 🎊</Text>
        <Text style={styles.title}>🔥 {days}-day streak!</Text>
        <Text style={styles.sub}>You're on fire - keep it going!</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center', paddingTop: 70, zIndex: 950 },
  banner: { backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 26, paddingVertical: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 10, borderWidth: 2, borderColor: '#ffb020' },
  confetti: { fontSize: 18, marginBottom: 2 },
  title: { color: ink, fontSize: 24, fontWeight: '900' },
  sub: { color: '#5b5575', fontSize: 13, fontWeight: '700', marginTop: 2 },
});
