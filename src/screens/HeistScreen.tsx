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
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Board, TILE_GAP } from '../components/Board';
import { HelpModal } from '../components/HelpModal';
import { Keyboard } from '../components/Keyboard';
import { ResultModal } from '../components/ResultModal';
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
} from '../game.ts';
import * as feedback from '../haptics';
import { loadGame, loadStats, saveGame, saveStats } from '../storage';
import { colors } from '../theme';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function HeistScreen({ onBack }: { onBack: () => void }) {
  const { height: windowHeight } = useWindowDimensions();
  const [today, setToday] = useState(() => dateKey());
  const [game, setGame] = useState<GameState | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [animateRow, setAnimateRow] = useState(-1);
  const [shakeKey, setShakeKey] = useState(0);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const answer = useMemo(() => dailyAnswer(today), [today]);
  const rival = useMemo(() => dailyRival(today), [today]);

  // Fit the board to the space actually available, so it never gets cramped or clipped.
  const tileSize = area.w
    ? clamp(
        Math.floor(
          Math.min(
            (area.w - 32 - (WORD_LENGTH - 1) * TILE_GAP) / WORD_LENGTH,
            (area.h - 5 * TILE_GAP - 8) / 6,
          ),
        ),
        30,
        68,
      )
    : 0;
  const keyHeight = clamp(Math.round(windowHeight * 0.065), 42, 58);

  const onAreaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: Math.round(width), h: Math.round(height) });
  };

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
      setAnimateRow(-1);
      setResultOpen(saved !== null && saved.status !== 'playing');
      // First-ever launch: show the rules.
      if (saved === null && savedStats.played === 0) setHelpOpen(true);
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
        // Wait for the reveal animation to finish before celebrating.
        setTimeout(() => {
          if (next.status === 'won') feedback.success();
          else feedback.error();
          setResultOpen(true);
        }, 1700);
      }
    },
    [stats],
  );

  const playing = game?.status === 'playing';

  const onLetter = (l: string) => {
    if (playing && current.length < WORD_LENGTH) setCurrent((c) => c + l);
  };
  const onBackspace = () => setCurrent((c) => c.slice(0, -1));

  const reject = (text: string) => {
    feedback.warning();
    setShakeKey((k) => k + 1);
    flash(text);
  };

  const onEnter = () => {
    if (!game || !playing) return;
    if (current.length < WORD_LENGTH) return reject('Not enough letters');
    if (!isValidGuess(current)) return reject('Not in word list');
    const next = applyGuess(game, current, answer);
    setAnimateRow(next.guesses.length - 1);
    commit(next);
    setCurrent('');
  };

  const onSteal = () => {
    if (!game || !canSteal(game, answer)) return;
    const next = applySteal(game, answer);
    const pos = next.steals[next.steals.length - 1];
    feedback.success();
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

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.headerSide}>
          <IconButton label="‹" a11y="Back to menu" onPress={onBack} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>WORD HEIST</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <View style={[styles.headerSide, styles.headerRight]}>
          <IconButton label="?" a11y="How to play" onPress={() => setHelpOpen(true)} />
          <IconButton label="📊" a11y="Stats" onPress={() => setResultOpen(true)} />
        </View>
      </View>

      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerLabel}>TODAY&apos;S MARK</Text>
          <Text style={styles.bannerName} numberOfLines={2}>
            🕶️ {rival}
          </Text>
        </View>
        <View style={styles.slots}>
          {Array.from({ length: WORD_LENGTH }, (_, i) => (
            <View key={i} style={[styles.slot, game.steals.includes(i) && styles.slotFilled]}>
              <Text style={styles.slotText}>{game.steals.includes(i) ? answer[i] : ''}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.boardArea} onLayout={onAreaLayout}>
        {tileSize > 0 && (
          <Board
            guesses={game.guesses}
            current={current}
            answer={answer}
            tileSize={tileSize}
            animateRow={animateRow}
            shakeKey={shakeKey}
          />
        )}
        {message && (
          <View pointerEvents="none" style={styles.toast}>
            <Text style={styles.toastText}>{message}</Text>
          </View>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !stealable }}
        disabled={!stealable}
        onPress={onSteal}
        style={({ pressed }) => [
          styles.steal,
          !stealable && styles.stealOff,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.stealText, !stealable && { color: colors.muted }]}>
          {game.steals.length > 0
            ? '🕶️ Heist used'
            : `🕶️ Steal a letter  ·  −${STEAL_PENALTY} pts`}
        </Text>
      </Pressable>

      <View style={styles.footer}>
        <Keyboard
          states={keyStates}
          onLetter={onLetter}
          onEnter={onEnter}
          onBackspace={onBackspace}
          disabled={!playing}
          keyHeight={keyHeight}
        />
      </View>

      <ResultModal
        visible={resultOpen}
        onClose={() => setResultOpen(false)}
        game={game}
        answer={answer}
        rival={rival}
        stats={stats}
      />
      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </SafeAreaView>
  );
}

function IconButton(props: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.a11y}
      onPress={props.onPress}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.icon}>{props.label}</Text>
    </Pressable>
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
    paddingVertical: 6,
  },
  headerSide: { width: 96, flexDirection: 'row' },
  headerRight: { justifyContent: 'flex-end', gap: 6 },
  titleWrap: { alignItems: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  date: { color: colors.muted, fontSize: 11, letterSpacing: 1 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20, color: colors.text, fontWeight: '800' },

  banner: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: colors.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bannerLeft: { flexShrink: 1 },
  bannerLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  bannerName: { color: colors.accent, fontSize: 15, fontWeight: '800', marginTop: 2 },
  slots: { flexDirection: 'row', gap: 4 },
  slot: {
    width: 26,
    height: 32,
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: { backgroundColor: colors.correct, borderColor: colors.correct, borderStyle: 'solid' },
  slotText: { color: colors.text, fontWeight: '800', fontSize: 17 },

  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toast: {
    position: 'absolute',
    top: 6,
    backgroundColor: colors.text,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    maxWidth: '92%',
    zIndex: 10,
  },
  toastText: { color: colors.bg, fontWeight: '800', textAlign: 'center' },

  steal: {
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginBottom: 12,
  },
  stealOff: { backgroundColor: colors.panelAlt },
  stealText: { color: colors.accentText, fontWeight: '800', fontSize: 15 },

  footer: { paddingBottom: 8 },
});
