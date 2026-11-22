import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useCoins } from '../economy';

/**
 * The coin balance pill: glass style like the other panels. When the balance goes UP the number
 * counts up and the pill gives a small pop; when it goes down it just updates.
 * Tapping it (when onPress is given) is a shortcut to Free Coins, hinted by a "+" badge.
 */
export function CoinChip({ onPress, compact }: { onPress?: () => void; compact?: boolean }) {
  const coins = useCoins();
  const [shown, setShown] = useState(coins);
  const pop = useRef(new Animated.Value(1)).current;
  const prev = useRef(coins);

  useEffect(() => {
    const from = prev.current;
    prev.current = coins;
    if (coins <= from) {
      setShown(coins);
      return;
    }
    // count up over ~600ms
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.18, duration: 140, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    const steps = 14;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(i >= steps ? coins : Math.round(from + ((coins - from) * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 42);
    return () => clearInterval(id);
  }, [coins, pop]);

  const body = (
    <Animated.View style={[styles.chip, compact && styles.compact, { transform: [{ scale: pop }] }]}>
      <Text style={styles.coin}>🪙</Text>
      <Text style={styles.amount} accessibilityLabel={`${coins} coins`}>
        {shown.toLocaleString()}
      </Text>
      {onPress ? (
        <Text style={styles.plus} accessible={false}>
          +
        </Text>
      ) : null}
    </Animated.View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${coins} coins. Get free coins`}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => pressed && { opacity: 0.8 }}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.26)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  compact: { height: 34, borderRadius: 17, paddingLeft: 10 },
  coin: { fontSize: 17 },
  amount: { color: '#fff', fontWeight: '900', fontSize: 16, fontVariant: ['tabular-nums'], minWidth: 22 },
  plus: {
    color: '#1b1633',
    backgroundColor: '#ffd166',
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '900',
    overflow: 'hidden',
  },
});
