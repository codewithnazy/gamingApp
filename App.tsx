import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Board } from './src/components/Board';
import { Keyboard } from './src/components/Keyboard';
import { ResultModal } from './src/components/ResultModal';
import {
  EMPTY_STATS,
  STEAL_PENALTY,
  WORD_LENGTH,
  applyGuess,
  applySteal,
  canSteal,
  dailyAnswer,
  dailyRival,
  dateKey,
  isValidGuess,
  letterStates,
  newGame,
  recordResult,
  type GameState,
  type Stats,
} from './src/game.ts';
import { loadGame, loadStats, saveGame, saveStats } from './src/storage';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

function Game() {
  const { width } = useWindowDimensions();
  const [today, setToday] = useState(() => dateKey());
  const [game, setGame] = useState<GameState | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const answer = useMemo(() => dailyAnswer(today), [today]);
  const rival = useMemo(() => dailyRival(today), [today]);
  const tileSize = Math.min(62, Math.floor((width - 32 - 4 * 6) / WORD_LENGTH));

  const flash = useCallback((text: string) => {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(null), 1800);
  }, []);

  // Load saved progress for `today`; a new day naturally starts a fresh game.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [saved, savedStats] = await Promise.all([loadGame(today), loadStats()]);
      if (cancelled) return;
      setStats(savedStats);
      setGame(saved ?? newGame(today));
      setCurrent('');
      setModalOpen(saved !== null && saved.status !== 'playing');
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);

  // If the app stays open past midnight, roll over to the new day on return.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setToday(dateKey());
    });
    return () => sub.remove();
  }, []);

  useEffect(
    () => () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    },
    [],
  );

  const commit = useCallback(
    (next: GameState) => {
      setGame(next);
      saveGame(next);
      if (next.status !== 'playing') {
        const nextStats = recordResult(stats, next);
        setStats(nextStats);
        saveStats(nextStats);
        setTimeout(() => setModalOpen(true), 900);
      }
    },
    [stats],
  );

  const playing = game?.status === 'playing';

  const onLetter = (l: string) => {
    if (playing && current.length < WORD_LENGTH) setCurrent((c) => c + l);
  };
  const onBackspace = () => setCurrent((c) => c.slice(0, -1));

  const onEnter = () => {
    if (!game || !playing) return;
    if (current.length < WORD_LENGTH) return flash('Not enough letters');
    if (!isValidGuess(current)) return flash('Not in word list');
    commit(applyGuess(game, current, answer));
    setCurrent('');
  };

  const onSteal = () => {
    if (!game || !canSteal(game, answer)) return;
    const next = applySteal(game, answer);
    const pos = next.steals[next.steals.length - 1];
    flash(`🕶️ Stole "${answer[pos]}" — letter #${pos + 1}`);
    commit(next);
  };

  if (!game) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const keyStates = letterStates(game.guesses, answer, game.steals);
  const stealable = canSteal(game, answer);
  const hint = Array.from({ length: WORD_LENGTH }, (_, i) =>
    game.steals.includes(i) ? answer[i] : '_',
  ).join(' ');

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={{ width: 44 }} />
        <View style={styles.titleWrap}>
          <Text style={styles.title}>WORD HEIST</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stats"
          onPress={() => setModalOpen(true)}
          style={styles.iconBtn}
        >
          <Text style={styles.icon}>📊</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            🕶️ Today&apos;s mark: <Text style={styles.bold}>{rival}</Text>
          </Text>
          <Text style={styles.hint}>{hint}</Text>
        </View>

        <View style={styles.toastSlot}>
          {message && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{message}</Text>
            </View>
          )}
        </View>

        <Board guesses={game.guesses} current={current} answer={answer} tileSize={tileSize} />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !stealable }}
          disabled={!stealable}
          onPress={onSteal}
          style={[styles.steal, !stealable && styles.stealOff]}
        >
          <Text style={styles.stealText}>
            {game.steals.length > 0
              ? 'Heist used'
              : `🕶️ Steal a letter (−${STEAL_PENALTY} pts)`}
          </Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Keyboard
          states={keyStates}
          onLetter={onLetter}
          onEnter={onEnter}
          onBackspace={onBackspace}
          disabled={!playing}
        />
      </View>

      <ResultModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        game={game}
        answer={answer}
        rival={rival}
        stats={stats}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  titleWrap: { alignItems: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  date: { color: colors.muted, fontSize: 11 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22 },
  body: { flex: 1, alignItems: 'center', paddingTop: 12, gap: 10 },
  banner: { alignItems: 'center', gap: 2 },
  bannerText: { color: colors.muted, fontSize: 14 },
  bold: { color: colors.accent, fontWeight: '800' },
  hint: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  toastSlot: { height: 44, justifyContent: 'center' },
  toast: {
    backgroundColor: colors.text,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: '92%',
  },
  toastText: { color: colors.bg, fontWeight: '700', textAlign: 'center' },
  steal: {
    marginTop: 4,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  stealOff: { backgroundColor: colors.absent },
  stealText: { color: '#111', fontWeight: '800' },
  footer: { paddingHorizontal: 4, paddingBottom: 12 },
});
