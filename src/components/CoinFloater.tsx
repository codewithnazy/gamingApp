import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { economy } from '../economy';

interface Floater {
  key: number;
  text: string;
  spend: boolean;
}

/**
 * Mounted once at the app root: shows a subtle "+10 🪙" that floats up and fades whenever coins are
 * earned (and a quiet "-50 🪙" when spent). It never intercepts touches.
 */
export function CoinFloater() {
  const [items, setItems] = useState<Floater[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    const add = (text: string, spend: boolean) => {
      const key = ++counter.current;
      setItems((cur) => [...cur.slice(-3), { key, text, spend }]);
    };
    const offGain = economy.onGain((e) => add(`+${e.amount} 🪙`, false));
    const offSpend = economy.onSpend((e) => add(`−${e.amount} 🪙`, true));
    return () => {
      offGain();
      offSpend();
    };
  }, []);

  return (
    <View pointerEvents="none" style={styles.layer}>
      {items.map((f) => (
        <Rising key={f.key} item={f} onDone={() => setItems((cur) => cur.filter((x) => x.key !== f.key))} />
      ))}
    </View>
  );
}

function Rising({ item, onDone }: { item: Floater; onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(onDone);
  }, [t, onDone]);
  return (
    <Animated.View
      style={[
        styles.bubble,
        item.spend && styles.spend,
        {
          opacity: t.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, -70] }) },
            { scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.8, 1.15, 1] }) },
          ],
        },
      ]}
    >
      <Text style={styles.text}>{item.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 120, zIndex: 900 },
  bubble: { position: 'absolute', top: 120, backgroundColor: '#ffd166', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  spend: { backgroundColor: 'rgba(255,255,255,0.92)' },
  text: { color: '#1b1633', fontSize: 18, fontWeight: '900' },
});
