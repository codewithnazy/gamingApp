import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ink } from '../glass';

export interface RewardLine {
  label: string;
  amount: number;
}

/** The "reward summary" shown on the level-complete dialog: each coin reward pops in, then the total. */
export function RewardSummary({ lines }: { lines: RewardLine[] }) {
  const anims = useRef(lines.map(() => new Animated.Value(0))).current;
  const total = lines.reduce((n, l) => n + l.amount, 0);

  useEffect(() => {
    Animated.stagger(
      170,
      anims.map((a) => Animated.spring(a, { toValue: 1, friction: 6, tension: 130, useNativeDriver: true })),
    ).start();
  }, [anims]);

  if (lines.length === 0) return null;
  return (
    <View style={styles.box} accessibilityLabel={`Rewards: ${total} coins`}>
      {lines.map((l, i) => (
        <Animated.View
          key={l.label}
          style={[
            styles.row,
            { opacity: anims[i], transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
          ]}
        >
          <Text style={styles.label}>{l.label}</Text>
          <Text style={styles.amount}>+{l.amount} 🪙</Text>
        </Animated.View>
      ))}
      {lines.length > 1 ? (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>+{total} 🪙</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', backgroundColor: '#fff4d6', borderRadius: 16, borderWidth: 1.5, borderColor: '#ffb020', paddingHorizontal: 16, paddingVertical: 10, marginVertical: 4, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#5b5575', fontWeight: '700', fontSize: 14 },
  amount: { color: ink, fontWeight: '900', fontSize: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0b45a', paddingTop: 6, marginTop: 2 },
  totalLabel: { color: ink, fontWeight: '900', fontSize: 15 },
  totalAmount: { color: ink, fontWeight: '900', fontSize: 18 },
});
