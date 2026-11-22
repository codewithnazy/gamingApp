import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { displayStreak, streakAtRisk } from '../daily/streak';
import { useEconomy } from '../economy';
import { Dialog, DialogHeader, PrimaryButton } from './Dialog';

/** 🔥 current streak pill (tap for a one-line explanation). Dimmed at 0; marked when it is at risk. */
export function StreakChip({ today }: { today: string }) {
  const eco = useEconomy();
  const [open, setOpen] = useState(false);
  const days = displayStreak(eco.streak, today);
  const atRisk = streakAtRisk(eco.streak, today);
  const label = days === 0 ? 'No streak yet. Finish a puzzle to start one' : `${days}-day streak${atRisk ? '. Finish a puzzle today to keep it' : ''}`;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => [styles.chip, days === 0 && styles.dim, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.flame}>🔥</Text>
        <Text style={styles.days}>{days}</Text>
        {atRisk ? <View style={styles.dot} accessible={false} /> : null}
      </Pressable>

      <Dialog visible={open} onClose={() => setOpen(false)}>
        <DialogHeader
          emoji="🔥"
          title={days === 0 ? 'Start a streak' : `${days}-day streak`}
          subtitle={eco.streak.best > 0 ? `Best: ${eco.streak.best} days` : undefined}
        />
        <Text style={styles.body}>
          {atRisk
            ? "You haven't finished a puzzle today yet - finish one to keep your streak alive!"
            : days === 0
              ? 'Finish any puzzle today, then again tomorrow, to build a streak.'
              : "You're on a roll. Finish a puzzle every day to keep it going."}
        </Text>
        <PrimaryButton label="Got it" onPress={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.26)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  dim: { opacity: 0.7 },
  flame: { fontSize: 17 },
  days: { color: '#fff', fontWeight: '900', fontSize: 16, minWidth: 14, fontVariant: ['tabular-nums'] },
  dot: { position: 'absolute', top: 3, right: 4, width: 9, height: 9, borderRadius: 5, backgroundColor: '#ffd166' },
  body: { color: '#3d3560', fontSize: 14.5, fontWeight: '600', lineHeight: 21, textAlign: 'center', marginBottom: 6 },
});
