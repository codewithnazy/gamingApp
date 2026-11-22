import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerSlot } from '../ads';
import { GradientBackground } from '../components/GradientBackground';
import { glass, ink } from '../glass';
import * as feedback from '../haptics';
import { paletteById } from '../search/themes';
import type { Settings } from '../settings';

interface Props {
  settings: Settings;
  onSearch: () => void;
  onHeist: () => void;
}

export function HomeScreen({ settings, onSearch, onHeist }: Props) {
  const go = (fn: () => void) => () => {
    feedback.tap();
    fn();
  };
  return (
    <GradientBackground palette={paletteById(settings.palette)}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.hero}>
          <Text style={styles.logo}>🎯</Text>
          <Text style={[glass.text, styles.title]}>WORD ARCADE</Text>
          <Text style={[glass.text, styles.tagline]}>Pick a game and get hunting</Text>
        </View>

        <View style={styles.cards}>
          <GameCard
            emoji="🔎"
            title="Word Search"
            blurb="Drag across letters to find hidden words. Choose your theme, difficulty and colours."
            cta="Play"
            primary
            onPress={go(onSearch)}
          />
          <GameCard
            emoji="🕶️"
            title="Word Heist"
            blurb="One daily 5-letter puzzle. Steal a letter from the rival if you get stuck."
            cta="Play today's"
            onPress={go(onHeist)}
          />
        </View>

        <View style={styles.bannerSpace}>
          <BannerSlot />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

function GameCard(props: {
  emoji: string;
  title: string;
  blurb: string;
  cta: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.title}. ${props.blurb}`}
      onPress={props.onPress}
      style={({ pressed }) => [glass.panel, styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
    >
      <Text style={styles.cardEmoji}>{props.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[glass.text, styles.cardTitle]}>{props.title}</Text>
        <Text style={styles.cardBlurb}>{props.blurb}</Text>
        <View style={[styles.cta, props.primary && styles.ctaPrimary]}>
          <Text style={[styles.ctaText, props.primary && { color: ink }]}>{props.cta} ›</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 18 },
  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 18 },
  logo: { fontSize: 56 },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: 4, marginTop: 6 },
  tagline: { fontSize: 15, marginTop: 4, opacity: 0.95 },
  cards: { gap: 16, marginTop: 8 },
  bannerSpace: { flex: 1, justifyContent: 'flex-end', paddingBottom: 6 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  cardEmoji: { fontSize: 44 },
  cardTitle: { fontSize: 22, fontWeight: '900' },
  cardBlurb: { color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 20, marginTop: 4 },
  cta: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)' },
  ctaPrimary: { backgroundColor: '#ffd166' },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
