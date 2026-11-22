import { useEffect, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import {
  MAX_GUESSES,
  computeScore,
  shareText,
  type GameState,
  type Stats,
} from '../game.ts';
import { colors } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  game: GameState;
  answer: string;
  rival: string;
  stats: Stats;
}

function useCountdown(active: boolean) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
      const p = (n: number) => String(n).padStart(2, '0');
      setLeft(`${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);
  return left;
}

export function ResultModal({ visible, onClose, game, answer, rival, stats }: Props) {
  const finished = game.status !== 'playing';
  const countdown = useCountdown(visible && finished);
  const score = computeScore(game.status, game.guesses.length, game.steals.length);
  const maxBar = Math.max(1, ...stats.distribution);
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  const share = () => {
    Share.share({ message: shareText(game, answer) }).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {finished && (
            <>
              <Text style={styles.title}>
                {game.status === 'won' ? '💰 Heist complete!' : '🚨 Busted!'}
              </Text>
              <Text style={styles.sub}>
                {game.status === 'won'
                  ? `Cracked it in ${game.guesses.length}/${MAX_GUESSES} · ${score} pts`
                  : `${rival} got away with it. The word was ${answer}.`}
              </Text>
            </>
          )}
          {!finished && <Text style={styles.title}>Your stats</Text>}

          <View style={styles.statsRow}>
            <Stat value={stats.played} label="Played" />
            <Stat value={`${winPct}%`} label="Win" />
            <Stat value={stats.currentStreak} label="Streak" />
            <Stat value={stats.maxStreak} label="Max" />
            <Stat value={stats.bestScore} label="Best" />
          </View>

          <Text style={styles.section}>Guess distribution</Text>
          {stats.distribution.map((n, i) => (
            <View key={i} style={styles.barRow}>
              <Text style={styles.barLabel}>{i + 1}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${Math.max(8, (n / maxBar) * 100)}%`,
                    backgroundColor:
                      finished && game.status === 'won' && game.guesses.length === i + 1
                        ? colors.correct
                        : colors.absent,
                  },
                ]}
              >
                <Text style={styles.barText}>{n}</Text>
              </View>
            </View>
          ))}

          {finished && (
            <>
              <Text style={styles.sub}>Next heist in {countdown}</Text>
              <Pressable accessibilityRole="button" style={styles.primary} onPress={share}>
                <Text style={styles.primaryText}>Share result</Text>
              </Pressable>
            </>
          )}
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={onClose}>
            <Text style={styles.secondaryText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  card: { backgroundColor: colors.panel, borderRadius: 16, padding: 20, gap: 8 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 15, textAlign: 'center', marginVertical: 4 },
  section: { color: colors.text, fontWeight: '700', marginTop: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { color: colors.text, width: 12, fontWeight: '700' },
  bar: { borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'flex-end' },
  barText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  primary: {
    backgroundColor: colors.correct,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: colors.muted, fontWeight: '700' },
});
