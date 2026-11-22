import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerSlot } from '../ads';
import { GradientBackground } from '../components/GradientBackground';
import { glass, ink } from '../glass';
import * as feedback from '../haptics';
import { DIFFICULTIES, formatTime, type Difficulty } from '../search/engine';
import {
  MAX_LEVELS,
  WORLD_COUNT,
  WORLD_SIZE,
  getWorld,
  levelConfig,
  totalStars,
  worldOf,
  type LevelProgress,
} from '../search/levels';
import { PALETTES, THEME_CHOICES, paletteById } from '../search/themes';
import type { SearchMode, Settings } from '../settings';
import type { BestTimes } from '../storage';

interface Props {
  settings: Settings;
  best: BestTimes;
  progress: LevelProgress;
  onChange: (patch: Partial<Settings>) => void;
  onStartQuick: () => void;
  onStartLevel: (level: number) => void;
  onBack: () => void;
}

const COLUMNS = 5;
const TILE_GAP = 10;

export function SearchSetupScreen({ settings, best, progress, onChange, onStartQuick, onStartLevel, onBack }: Props) {
  const { width } = useWindowDimensions();
  const palette = paletteById(settings.palette);
  const bestKey = `${settings.theme}:${settings.difficulty}`;
  const isLevels = settings.mode === 'levels';
  const tile = Math.floor((width - 32 - (COLUMNS - 1) * TILE_GAP) / COLUMNS);
  const current = progress.unlocked;
  const cur = levelConfig(current);
  const [worldNo, setWorldNo] = useState(() => worldOf(progress.unlocked));
  const world = getWorld(worldNo);
  const worldLevels = Array.from({ length: WORLD_SIZE }, (_, i) => world.firstLevel + i);
  const worldDone = worldLevels.filter((lv) => progress.stars[String(lv)] !== undefined).length;
  const worldStars = worldLevels.reduce((n, lv) => n + (progress.stars[String(lv)] ?? 0), 0);
  const first = levelConfig(world.firstLevel);
  const last = levelConfig(world.lastLevel);
  const range = (a: number, b: number, fmt: (n: number) => string) => (a === b ? fmt(a) : `${fmt(a)}–${fmt(b)}`);
  const goWorld = (n: number) => {
    feedback.tap();
    setWorldNo(Math.min(WORLD_COUNT, Math.max(1, n)));
  };
  const allDone = progress.stars[String(MAX_LEVELS)] !== undefined;

  const choose = (patch: Partial<Settings>) => {
    feedback.tap();
    onChange(patch);
  };

  return (
    <GradientBackground palette={palette}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={[glass.text, styles.title]}>Word Search</Text>
          <View style={styles.backSpacer} />
        </View>

        <View style={styles.modeRow}>
          <ModeTab label="🏆  Levels" on={isLevels} onPress={() => choose({ mode: 'levels' as SearchMode })} />
          <ModeTab label="🎲  Quick play" on={!isLevels} onPress={() => choose({ mode: 'quick' as SearchMode })} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {isLevels ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Jump to your current level"
                onPress={() => goWorld(worldOf(current))}
                style={[glass.panel, styles.summary]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[glass.text, styles.summaryTitle]}>
                    {allDone ? '🏆 All levels complete!' : `Level ${current} unlocked`}
                  </Text>
                  <Text style={styles.summarySub}>
                    {cur.icon} {cur.tier} · {cur.size}×{cur.size} · {cur.wordCount} words
                    {cur.mystery ? ' · ❓ Mystery' : ''}
                  </Text>
                </View>
                <Text style={[glass.text, styles.summaryStars]}>
                  ⭐ {totalStars(progress)}
                  <Text style={styles.summaryStarsMax}>/{MAX_LEVELS * 3}</Text>
                </Text>
              </Pressable>

              <View style={styles.worldBar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous world"
                  disabled={worldNo <= 1}
                  onPress={() => goWorld(worldNo - 1)}
                  style={[styles.arrow, worldNo <= 1 && { opacity: 0.35 }]}
                >
                  <Text style={styles.arrowText}>‹</Text>
                </Pressable>
                <View style={styles.worldTitleWrap}>
                  <Text style={[glass.text, styles.worldTitle]} numberOfLines={1}>
                    {world.emoji} {world.name}
                  </Text>
                  <Text style={styles.worldSub}>
                    World {world.number} of {WORLD_COUNT} · Levels {world.firstLevel}–{world.lastLevel}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next world"
                  disabled={worldNo >= WORLD_COUNT}
                  onPress={() => goWorld(worldNo + 1)}
                  style={[styles.arrow, worldNo >= WORLD_COUNT && { opacity: 0.35 }]}
                >
                  <Text style={styles.arrowText}>›</Text>
                </Pressable>
              </View>

              <View style={styles.worldProgress}>
                <View style={styles.worldTrack}>
                  <View style={[styles.worldFill, { width: `${(worldDone / WORLD_SIZE) * 100}%` }]} />
                </View>
                <Text style={[glass.text, styles.worldCount]}>
                  {worldDone}/{WORLD_SIZE} · ⭐ {worldStars}/{WORLD_SIZE * 3}
                </Text>
              </View>
              <Text style={styles.worldInfo}>
                {first.tier === last.tier ? first.tier : `${first.tier} → ${last.tier}`} ·{' '}
                {range(first.size, last.size, (n) => `${n}×${n}`)} grids ·{' '}
                {range(first.wordCount, last.wordCount, (n) => `${n}`)} words
                {worldLevels.some((lv) => levelConfig(lv).mystery) ? ' · ❓ Mystery levels' : ''}
              </Text>

              <View style={styles.tiles}>
                {worldLevels.map((lv) => (
                  <LevelTile
                    key={lv}
                    level={lv}
                    size={tile}
                    locked={lv > progress.unlocked}
                    isCurrent={lv === progress.unlocked}
                    stars={progress.stars[String(lv)] ?? 0}
                    emoji={levelConfig(lv).mystery ? '❓' : levelConfig(lv).icon}
                    onPress={() => {
                      feedback.success();
                      onStartLevel(lv);
                    }}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={[glass.text, styles.section]}>Words</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
                style={styles.chipsScroll}
              >
                {THEME_CHOICES.map((t) => {
                  const on = t.id === settings.theme;
                  return (
                    <Pressable
                      key={t.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => choose({ theme: t.id })}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={styles.chipEmoji}>{t.emoji}</Text>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={[glass.text, styles.hint]}>
                {settings.theme === 'mixed' ? 'Words from every theme, jumbled together' : 'Only words from this theme'}
              </Text>

              <Text style={[glass.text, styles.section]}>Difficulty</Text>
              <View style={styles.diffRow}>
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
                  const cfg = DIFFICULTIES[d];
                  const on = d === settings.difficulty;
                  return (
                    <Pressable
                      key={d}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => choose({ difficulty: d })}
                      style={[styles.diff, on && styles.chipOn]}
                    >
                      <Text style={[styles.diffTitle, on && styles.chipTextOn]}>{cfg.label}</Text>
                      <Text style={[styles.diffSub, on && styles.diffSubOn]}>
                        {cfg.size}×{cfg.size}
                      </Text>
                      <Text style={[styles.diffSub, on && styles.diffSubOn]}>{cfg.wordCount} words</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[glass.text, styles.hint]}>
                {DIFFICULTIES[settings.difficulty].blurb}
                {settings.timer && best[bestKey] !== undefined ? `  ·  🏆 Best ${formatTime(best[bestKey])}` : ''}
              </Text>
            </>
          )}

          <Text style={[glass.text, styles.section]}>Options</Text>
          <View style={[glass.panel, styles.options]}>
            <OptionRow
              label="⏱  Timer"
              sub="Race the clock and record best times"
              value={settings.timer}
              onChange={(v) => onChange({ timer: v })}
            />
            <View style={styles.divider} />
            <OptionRow
              label="📳  Haptics"
              sub="Vibrate when you select and find words"
              value={settings.haptics}
              onChange={(v) => onChange({ haptics: v })}
            />
          </View>

          <Text style={[glass.text, styles.section]}>Background</Text>
          <View style={styles.swatches}>
            {PALETTES.map((p) => {
              const on = p.id === settings.palette;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.label} background`}
                  accessibilityState={{ selected: on }}
                  onPress={() => choose({ palette: p.id })}
                  style={styles.swatchWrap}
                >
                  <View style={[styles.swatchRing, on && styles.swatchRingOn]}>
                    <LinearGradient
                      colors={p.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.swatch}
                    />
                  </View>
                  <Text style={[glass.text, styles.swatchLabel, on && { fontWeight: '800' }]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              feedback.success();
              if (isLevels) onStartLevel(current);
              else onStartQuick();
            }}
            style={({ pressed }) => [styles.start, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.startText}>
              {isLevels
                ? `▶  ${allDone ? 'Replay' : current === 1 && !progress.stars['1'] ? 'Start' : 'Continue'} · Level ${current}`
                : '▶  Start puzzle'}
            </Text>
          </Pressable>
        </View>
        <BannerSlot />
      </SafeAreaView>
    </GradientBackground>
  );
}

function ModeTab(props: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: props.on }}
      onPress={props.onPress}
      style={[styles.modeTab, props.on && styles.modeTabOn]}
    >
      <Text style={[styles.modeText, props.on && { color: ink }]}>{props.label}</Text>
    </Pressable>
  );
}

function LevelTile(props: {
  level: number;
  size: number;
  locked: boolean;
  isCurrent: boolean;
  stars: number;
  emoji: string;
  onPress: () => void;
}) {
  const { level, size, locked, isCurrent, stars } = props;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={locked ? `Level ${level}, locked` : `Level ${level}, ${stars} of 3 stars`}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.tile,
        { width: size, height: size + 8 },
        locked && styles.tileLocked,
        !locked && stars > 0 && styles.tileDone,
        isCurrent && styles.tileCurrent,
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      {locked ? (
        <Text style={styles.lock}>🔒</Text>
      ) : (
        <>
          <Text style={styles.tileEmoji}>{props.emoji}</Text>
          <Text style={[styles.tileNum, isCurrent && { color: ink }]}>{level}</Text>
          <Text style={styles.tileStars}>{stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : isCurrent ? 'PLAY' : '☆☆☆'}</Text>
        </>
      )}
    </Pressable>
  );
}

function OptionRow(props: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.optionRow}>
      <View style={{ flex: 1 }}>
        <Text style={[glass.text, styles.optionLabel]}>{props.label}</Text>
        <Text style={styles.optionSub}>{props.sub}</Text>
      </View>
      <Switch
        accessibilityLabel={props.label}
        value={props.value}
        onValueChange={props.onChange}
        trackColor={{ false: 'rgba(0,0,0,0.3)', true: '#ffd166' }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.22)' },
  backSpacer: { width: 44, height: 44 },
  backText: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  modeRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 2, padding: 4, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.25)' },
  modeTab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 20 },
  modeTabOn: { backgroundColor: '#fff' },
  modeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  section: { fontSize: 14, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 18, marginBottom: 10, opacity: 0.95 },
  sectionSub: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'none' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginTop: 14 },
  summaryTitle: { fontSize: 18, fontWeight: '900' },
  summarySub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 3 },
  summaryStars: { fontSize: 22, fontWeight: '900' },
  summaryStarsMax: { fontSize: 13, fontWeight: '700', opacity: 0.8 },
  worldBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)' },
  arrowText: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '700' },
  worldTitleWrap: { flex: 1, alignItems: 'center' },
  worldTitle: { fontSize: 20, fontWeight: '900' },
  worldSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  worldProgress: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  worldTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)', overflow: 'hidden' },
  worldFill: { height: 8, borderRadius: 4, backgroundColor: '#ffd166' },
  worldCount: { fontSize: 12, fontWeight: '800' },
  worldInfo: { color: 'rgba(255,255,255,0.88)', fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: { borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  tileLocked: { backgroundColor: 'rgba(0,0,0,0.16)', borderColor: 'rgba(255,255,255,0.12)', opacity: 0.7 },
  tileDone: { backgroundColor: 'rgba(255,209,102,0.28)', borderColor: 'rgba(255,209,102,0.7)' },
  tileCurrent: { backgroundColor: '#fff', borderColor: '#fff' },
  tileEmoji: { fontSize: 14 },
  tileNum: { color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 26 },
  tileStars: { color: '#ffd166', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  lock: { fontSize: 20 },
  chipsScroll: { marginHorizontal: -16 },
  chipsRow: { paddingHorizontal: 16, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.24)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  chipOn: { backgroundColor: '#fff', borderColor: '#fff' },
  chipEmoji: { fontSize: 18 },
  chipText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  chipTextOn: { color: ink },
  diffRow: { flexDirection: 'row', gap: 10 },
  diff: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.24)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  diffTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  diffSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  diffSubOn: { color: '#5b5575' },
  hint: { marginTop: 10, fontSize: 13, opacity: 0.95 },
  options: { paddingHorizontal: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  optionLabel: { fontSize: 16, fontWeight: '700' },
  optionSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.35)' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  swatchWrap: { alignItems: 'center', width: 54 },
  swatchRing: { padding: 2, borderRadius: 28, borderWidth: 3, borderColor: 'transparent' },
  swatchRingOn: { borderColor: '#fff' },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  swatchLabel: { fontSize: 12, marginTop: 4 },
  footer: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 6 },
  start: { backgroundColor: '#ffd166', borderRadius: 28, paddingVertical: 17, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  startText: { color: ink, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
});
