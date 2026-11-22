import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { glass, ink } from '../glass';
import * as feedback from '../haptics';
import { DIFFICULTIES, formatTime, type Difficulty } from '../search/engine';
import { PALETTES, THEMES, paletteById } from '../search/themes';
import type { Settings } from '../settings';
import type { BestTimes } from '../storage';
import { GradientBackground } from '../components/GradientBackground';

interface Props {
  settings: Settings;
  best: BestTimes;
  onChange: (patch: Partial<Settings>) => void;
  onStart: () => void;
  onBack: () => void;
}

export function SearchSetupScreen({ settings, best, onChange, onStart, onBack }: Props) {
  const palette = paletteById(settings.palette);
  const bestKey = `${settings.theme}:${settings.difficulty}`;

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

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[glass.text, styles.section]}>Theme</Text>
          <View style={styles.chips}>
            {THEMES.map((t) => {
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
          </View>

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
              onStart();
            }}
            style={({ pressed }) => [styles.start, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.startText}>▶  Start puzzle</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </GradientBackground>
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
  scroll: { paddingHorizontal: 16, paddingBottom: 16 },
  section: { fontSize: 14, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 18, marginBottom: 10, opacity: 0.95 },
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
