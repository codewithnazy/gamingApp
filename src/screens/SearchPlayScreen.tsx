import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { glass, ink } from '../glass';
import * as feedback from '../haptics';
import {
  DIFFICULTIES,
  formatTime,
  generatePuzzle,
  matchWord,
  snapLine,
  starsFor,
  type Cell,
} from '../search/engine';
import {
  MAX_LEVELS,
  generateLevelPuzzle,
  levelConfig,
  maskWord,
  recordLevelResult,
  type LevelProgress,
} from '../search/levels';
import { FOUND_COLORS, paletteById, themeById } from '../search/themes';
import type { Settings } from '../settings';
import type { BestTimes } from '../storage';

const GAP = 3;
const PANEL_PAD = 8;

interface Props {
  settings: Settings;
  best: BestTimes;
  onNewBest: (key: string, seconds: number) => void;
  onBack: () => void;
  /** Set when playing a campaign level; null/undefined for quick play. */
  level?: number | null;
  progress: LevelProgress;
  onProgress: (next: LevelProgress) => void;
  onNextLevel: (level: number) => void;
}

type FoundMap = Record<string, { color: string; cells: Cell[] }>;
type View_ = 'idle' | 'selected' | 'found' | 'hint';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const keyOf = (c: Cell) => `${c.row},${c.col}`;

const GridCell = memo(function GridCell(props: { letter: string; size: number; view: View_; color?: string }) {
  const { letter, size, view, color } = props;
  const bg =
    view === 'selected' ? '#ffffff' : view === 'found' ? color : view === 'hint' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.24)';
  const dark = view === 'selected' || view === 'found';
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: bg },
        styles.cell,
        view === 'hint' && { borderWidth: 2, borderColor: '#fff' },
      ]}
    >
      <Text
        selectable={false}
        style={{ fontSize: size * 0.52, fontWeight: '800', color: dark ? ink : '#fff', userSelect: 'none' }}
      >
        {letter}
      </Text>
    </View>
  );
});

export function SearchPlayScreen({ settings, best, onNewBest, onBack, level, progress, onProgress, onNextLevel }: Props) {
  const lc = level ? levelConfig(level) : null;
  // Levels jumble every theme together; quick play uses the chosen theme (or Mixed).
  const theme = themeById(settings.theme);
  const palette = paletteById(settings.palette);
  const cfg = DIFFICULTIES[settings.difficulty];
  const n = lc ? lc.size : cfg.size;
  const { height: windowHeight } = useWindowDimensions();

  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2147483647));
  // A level is always the same puzzle; quick play makes a fresh one each time.
  const puzzle = useMemo(
    () =>
      level
        ? generateLevelPuzzle(level)
        : generatePuzzle({ pool: theme.words, difficulty: settings.difficulty, seed }),
    [level, theme, settings.difficulty, seed],
  );
  const words = useMemo(() => puzzle.placements.map((p) => p.word).sort(), [puzzle]);

  const [found, setFound] = useState<FoundMap>({});
  const [selection, setSelection] = useState<Cell[]>([]);
  const [hintCell, setHintCell] = useState<Cell | null>(null);
  const [hints, setHints] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState<{
    time: number;
    stars: 1 | 2 | 3;
    record: boolean;
    unlocked?: number; // level that this win newly unlocked
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cell = area.w
    ? clamp(
        Math.floor(
          Math.min(
            (area.w - 2 * PANEL_PAD - 24 - (n - 1) * GAP) / n,
            (area.h - 2 * PANEL_PAD - 8 - (n - 1) * GAP) / n,
          ),
        ),
        12,
        58,
      )
    : 0;
  // Many words on a short screen: use compact chips so the grid keeps its room.
  const compact = windowHeight < 700 && words.length > 10;

  // The pan responder is created once, so it reads the latest state through a ref.
  const live = useRef({ puzzle, words, found, cell, n, selection: [] as Cell[], won: false });
  live.current = { ...live.current, puzzle, words, found, cell, n, won: won !== null };
  const startPx = useRef({ x: 0, y: 0 });
  const startCell = useRef<Cell | null>(null);

  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  const flash = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const pan = useMemo(() => {
    const toCell = (x: number, y: number, clampToGrid: boolean): Cell => {
      const step = live.current.cell + GAP;
      const raw = { row: Math.floor((y - PANEL_PAD) / step), col: Math.floor((x - PANEL_PAD) / step) };
      return clampToGrid
        ? { row: clamp(raw.row, 0, live.current.n - 1), col: clamp(raw.col, 0, live.current.n - 1) }
        : raw;
    };
    const setSel = (cells: Cell[]) => {
      const prev = live.current.selection;
      if (cells.length !== prev.length) feedback.tap();
      live.current.selection = cells;
      setSelection(cells);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !live.current.won,
      onStartShouldSetPanResponderCapture: () => !live.current.won,
      onMoveShouldSetPanResponder: () => !live.current.won,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        startPx.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        startCell.current = toCell(startPx.current.x, startPx.current.y, true);
        setSel([startCell.current]);
      },
      onPanResponderMove: (_e, g) => {
        const start = startCell.current;
        if (!start) return;
        const cur = toCell(startPx.current.x + g.dx, startPx.current.y + g.dy, false);
        const line = snapLine(start, cur, live.current.n);
        const prev = live.current.selection;
        const same =
          line.length === prev.length && line.every((c, i) => c.row === prev[i].row && c.col === prev[i].col);
        if (!same) setSel(line);
      },
      onPanResponderRelease: (_e, g) => {
        const L = live.current;
        const remaining = L.words.filter((w) => !L.found[w]);
        // The last move event can be dropped or coalesced, so also re-derive the
        // selection from the final gesture position and accept either match.
        let cells = L.selection;
        let hit = matchWord(L.puzzle.grid, cells, remaining);
        const start = startCell.current;
        if (!hit && start) {
          const end = toCell(startPx.current.x + g.dx, startPx.current.y + g.dy, false);
          const finalLine = snapLine(start, end, L.n);
          const finalHit = matchWord(L.puzzle.grid, finalLine, remaining);
          if (finalHit) {
            hit = finalHit;
            cells = finalLine;
          }
        }
        if (hit) {
          const word = hit;
          const foundCells = cells;
          setFound((f) => ({
            ...f,
            [word]: { color: FOUND_COLORS[Object.keys(f).length % FOUND_COLORS.length], cells: foundCells },
          }));
          feedback.success();
        }
        startCell.current = null;
        L.selection = [];
        setSelection([]);
      },
      onPanResponderTerminate: () => {
        startCell.current = null;
        live.current.selection = [];
        setSelection([]);
      },
    });
  }, []);

  // Timer
  useEffect(() => {
    if (!settings.timer || won) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [settings.timer, won, seed]);

  // Win detection
  const foundCount = Object.keys(found).length;
  useEffect(() => {
    if (won || words.length === 0 || foundCount !== words.length) return;
    const time = elapsedRef.current;
    const stars = starsFor(hints);
    let record: boolean;
    let unlocked: number | undefined;
    if (level) {
      const res = recordLevelResult(progress, level, stars, settings.timer ? time : null);
      onProgress(res.progress);
      record = res.newBest;
      unlocked = res.newlyUnlocked ? res.progress.unlocked : undefined;
    } else {
      const key = `${settings.theme}:${settings.difficulty}`;
      const prev = best[key];
      record = settings.timer && (prev === undefined || time < prev);
      if (record) onNewBest(key, time);
    }
    const t = setTimeout(() => feedback.success(), 250);
    setWon({ time, stars, record, unlocked });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundCount, words.length]);

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const restart = () => {
    if (!level) setSeed(Math.floor(Math.random() * 2147483647));
    setFound({});
    setSelection([]);
    live.current.selection = [];
    setHintCell(null);
    setHints(0);
    setElapsed(0);
    setWon(null);
    setToast(null);
  };

  const useHint = () => {
    const left = puzzle.placements.filter((p) => !found[p.word]);
    if (left.length === 0 || won) return;
    const p = left[Math.floor(Math.random() * left.length)];
    setHints((h) => h + 1);
    setHintCell({ row: p.row, col: p.col });
    flash(
      lc?.mystery
        ? `💡 A ${p.word.length}-letter word starts at the ring`
        : `💡 Look for “${p.word}” — it starts at the ring`,
    );
    feedback.tap();
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintCell(null), 3500);
  };

  // Per-cell view state, computed once per change.
  const cellViews = useMemo(() => {
    const map = new Map<string, { view: View_; color?: string }>();
    if (hintCell) map.set(keyOf(hintCell), { view: 'hint' });
    for (const f of Object.values(found)) for (const c of f.cells) map.set(keyOf(c), { view: 'found', color: f.color });
    for (const c of selection) map.set(keyOf(c), { view: 'selected' });
    return map;
  }, [found, selection, hintCell]);

  const bestTime = level ? progress.best[String(level)] : best[`${settings.theme}:${settings.difficulty}`];
  const gridPx = cell * n + (n - 1) * GAP;
  const onAreaLayout = (e: LayoutChangeEvent) =>
    setArea({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) });

  return (
    <GradientBackground palette={palette}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to options" onPress={onBack} style={styles.round}>
            <Text style={styles.roundText}>‹</Text>
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={[glass.text, styles.title]}>
              {lc ? `Level ${lc.level}` : `${theme.emoji} ${theme.label}`}
            </Text>
            <Text style={[glass.text, styles.sub]}>
              {lc
                ? lc.mystery
                  ? `❓ Mystery · ${n}×${n}`
                  : `${lc.icon} ${lc.tier} · ${n}×${n}`
                : `${cfg.label} · ${n}×${n}`}
            </Text>
          </View>
          <View style={[styles.round, styles.timerBox]}>
            <Text style={styles.timerText}>{settings.timer ? formatTime(elapsed) : '∞'}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <Text style={[glass.text, styles.progress]}>
            {foundCount}/{words.length} found
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(foundCount / Math.max(1, words.length)) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.words}>
          {words.map((w) => {
            const f = found[w];
            return (
              <View key={w} style={[styles.word, compact && styles.wordCompact, f && { backgroundColor: f.color }]}>
                <Text
                  style={[
                    styles.wordText,
                    compact && styles.wordTextCompact,
                    f && { color: ink, textDecorationLine: 'line-through' },
                  ]}
                >
                  {lc?.mystery && !f ? maskWord(w) : w}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.gridArea} onLayout={onAreaLayout}>
          {cell > 0 && (
            <View
              accessibilityLabel="Word search grid"
              style={[glass.panel, { padding: PANEL_PAD, width: gridPx + 2 * PANEL_PAD }]}
              {...pan.panHandlers}
            >
              {/* pointerEvents none: the panel itself receives every touch, so coordinates are panel-relative */}
              <View pointerEvents="none" style={{ gap: GAP }}>
                {puzzle.grid.map((row, r) => (
                  <View key={r} style={{ flexDirection: 'row', gap: GAP }}>
                    {row.map((letter, c) => {
                      const v = cellViews.get(`${r},${c}`);
                      return <GridCell key={c} letter={letter} size={cell} view={v?.view ?? 'idle'} color={v?.color} />;
                    })}
                  </View>
                ))}
              </View>
            </View>
          )}
          {toast && (
            <View pointerEvents="none" style={styles.toast}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={useHint}
            disabled={!!won}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.actionText}>💡 Hint{hints > 0 ? ` (${hints})` : ''}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={restart}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.actionText}>{level ? '↻ Restart' : '🔄 New puzzle'}</Text>
          </Pressable>
        </View>

        <Modal visible={!!won} transparent animationType="fade" onRequestClose={() => setWon(null)}>
          <View style={styles.backdrop}>
            <View style={styles.card}>
              <Text style={styles.cardEmoji}>{level && level >= MAX_LEVELS ? '🏆' : '🎉'}</Text>
              <Text style={styles.cardTitle}>{level ? `Level ${level} complete!` : 'All words found!'}</Text>
              <Text style={styles.stars}>
                {'⭐'.repeat(won?.stars ?? 0)}
                {'☆'.repeat(3 - (won?.stars ?? 0))}
              </Text>
              {settings.timer && won && (
                <Text style={styles.cardSub}>
                  Time {formatTime(won.time)}
                  {won.record ? '  ·  🏆 New best!' : bestTime !== undefined ? `  ·  Best ${formatTime(bestTime)}` : ''}
                </Text>
              )}
              <Text style={styles.cardSub}>
                {hints === 0 ? 'No hints used — perfect!' : `${hints} hint${hints > 1 ? 's' : ''} used`}
              </Text>
              {won?.unlocked && <Text style={styles.unlock}>🔓 Level {won.unlocked} unlocked!</Text>}
              {level && level >= MAX_LEVELS && (
                <Text style={styles.unlock}>You&apos;ve finished every level — amazing!</Text>
              )}

              {level && level < MAX_LEVELS ? (
                <Pressable accessibilityRole="button" onPress={() => onNextLevel(level + 1)} style={styles.primary}>
                  <Text style={styles.primaryText}>Next level ▶</Text>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" onPress={restart} style={styles.primary}>
                  <Text style={styles.primaryText}>{level ? 'Replay level' : 'Play again'}</Text>
                </Pressable>
              )}
              {level && level < MAX_LEVELS && (
                <Pressable accessibilityRole="button" onPress={restart} style={styles.secondary}>
                  <Text style={styles.secondaryText}>Replay level</Text>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" onPress={onBack} style={styles.secondary}>
                <Text style={styles.secondaryText}>{level ? 'Level select' : 'Change options'}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cell: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.22)' },
  roundText: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '700' },
  timerBox: { width: 68, borderRadius: 22 },
  timerText: { color: '#fff', fontWeight: '800', fontSize: 16, fontVariant: ['tabular-nums'] },
  titleWrap: { alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  sub: { fontSize: 12, opacity: 0.9 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginTop: 4 },
  progress: { fontSize: 14, fontWeight: '800', minWidth: 80 },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: '#ffd166' },
  words: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingHorizontal: 12, marginTop: 10 },
  word: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.24)' },
  wordCompact: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 11 },
  wordTextCompact: { fontSize: 11, letterSpacing: 0.2 },
  wordText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  gridArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', top: 4, maxWidth: '92%', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  toastText: { color: ink, fontWeight: '800', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
  action: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,6,30,0.7)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', gap: 6 },
  cardEmoji: { fontSize: 48 },
  cardTitle: { color: ink, fontSize: 26, fontWeight: '900' },
  stars: { fontSize: 32, marginVertical: 4 },
  cardSub: { color: '#5b5575', fontSize: 15, fontWeight: '600' },
  unlock: { color: '#1c8a4e', fontSize: 15, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  primary: { alignSelf: 'stretch', backgroundColor: '#ffb020', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  primaryText: { color: ink, fontSize: 17, fontWeight: '900' },
  secondary: { paddingVertical: 12 },
  secondaryText: { color: '#6a5fa8', fontWeight: '800' },
});
