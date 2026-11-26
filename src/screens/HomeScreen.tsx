import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerSlot } from '../ads';
import { CoinChip } from '../components/CoinChip';
import { DailyRewardDialog } from '../components/DailyRewardDialog';
import { FreeCoinsDialog } from '../components/FreeCoinsDialog';
import { LockedBanner } from '../components/LockedBanner';
import { RemoveAdsDialog } from '../components/RemoveAdsDialog';
import { GradientBackground } from '../components/GradientBackground';
import { StreakChip } from '../components/StreakChip';
import { PASS, claimableCount } from '../pass/pass';
import { formatRemaining } from '../pass/season';
import { usePassClock } from '../pass/usePassClock';
import { canClaimDaily, dailyChallengeDone } from '../daily/rewards';
import { useToday } from '../daily/useToday';
import { REWARDS, useEconomy } from '../economy';
import { glass, ink } from '../glass';
import * as feedback from '../haptics';
import { paletteById } from '../search/themes';
import type { Settings } from '../settings';

interface Props {
  settings: Settings;
  onSearch: () => void;
  onDaily: () => void;
  onPass: () => void;
  /** The highest level the player has reached (the Season Pass opens at PASS.unlockLevel). */
  unlockedLevel: number;
}

// The daily-reward popup opens by itself at most once per app session (and only if unclaimed).
let dailyPopupShown = false;

export function HomeScreen({ settings, onSearch, onDaily, onPass, unlockedLevel }: Props) {
  const today = useToday();
  const eco = useEconomy();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const tight = height < 680; // short phones: cards drop their description line
  const [freeOpen, setFreeOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [noAdsOpen, setNoAdsOpen] = useState(false);
  const { season, remainingMs } = usePassClock();
  const passUnlocked = unlockedLevel >= PASS.unlockLevel;
  const passReady = passUnlocked ? claimableCount(eco, season) : 0;
  const claimable = canClaimDaily(eco, today);
  const doneToday = dailyChallengeDone(eco, today);

  useEffect(() => {
    if (claimable && !dailyPopupShown) {
      dailyPopupShown = true;
      setRewardOpen(true);
    }
  }, [claimable]);

  const go = (fn: () => void) => () => {
    feedback.tap();
    fn();
  };

  return (
    <GradientBackground palette={paletteById(settings.palette)}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={claimable ? 'Daily reward: ready to claim' : 'Daily reward: claimed today'}
              onPress={() => setRewardOpen(true)}
              hitSlop={8}
              style={({ pressed }) => [styles.gift, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.giftEmoji}>{claimable ? '🎁' : '✅'}</Text>
              {claimable ? <View style={styles.dot} accessible={false} /> : null}
            </Pressable>
            <StreakChip today={today} />
          </View>
          <CoinChip onPress={() => setFreeOpen(true)} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}
        >
          <View style={[styles.hero, compact && styles.heroCompact]}>
            <Text style={[styles.logo, compact && { fontSize: 40 }]}>🎯</Text>
            <Text style={[glass.text, styles.title, compact && { fontSize: 28 }]}>WORD ARCADE</Text>
            {!compact && <Text style={[glass.text, styles.tagline]}>Pick a game and get hunting</Text>}
          </View>

          <View style={styles.badgeRow}>
            {passUnlocked ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Season Pass. ${formatRemaining(remainingMs)} left.${passReady > 0 ? ` ${passReady} rewards ready.` : ''}`}
                onPress={go(onPass)}
                style={({ pressed }) => [glass.panel, styles.passBadge, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              >
                <Text style={styles.passEmoji}>🔑</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[glass.text, styles.passTitle]}>Season Pass</Text>
                  <Text style={styles.passTime}>🕐 {formatRemaining(remainingMs)}</Text>
                </View>
                {passReady > 0 ? (
                  <View style={styles.passDot}>
                    <Text style={styles.passDotText}>{passReady}</Text>
                  </View>
                ) : null}
              </Pressable>
            ) : (
              <LockedBanner icon="🔑" text={`Season Pass unlocks at Level ${PASS.unlockLevel}!`} />
            )}
            {!eco.adsRemoved ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="No ads: remove ads"
                onPress={go(() => setNoAdsOpen(true))}
                style={({ pressed }) => [styles.noAds, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
              >
                <Text style={styles.noAdsEmoji}>🚫</Text>
                <Text style={styles.noAdsText}>NO ADS</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.cards, compact && { gap: 10 }]}>
            <GameCard
              emoji="🔎"
              title="Word Search"
              blurb="Drag across letters to find hidden words. 500 levels or quick play."
              cta="Play"
              primary
              compact={compact}
              tight={tight}
              onPress={go(onSearch)}
            />
            <GameCard
              emoji="📅"
              title="Daily Challenge"
              blurb="A fresh puzzle every day, the same for everyone."
              cta={doneToday ? '✅ Completed Today' : `Play · +${REWARDS.dailyChallenge} 🪙`}
              done={doneToday}
              compact={compact}
              tight={tight}
              onPress={go(onDaily)}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Free coins: watch an ad for ${REWARDS.rewardedAd} coins`}
            onPress={() => {
              feedback.tap();
              setFreeOpen(true);
            }}
            style={({ pressed }) => [styles.freeCoins, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.freeCoinsText}>📺  Free Coins  ·  +{REWARDS.rewardedAd} 🪙</Text>
          </Pressable>
        </ScrollView>

        <BannerSlot />

        <FreeCoinsDialog visible={freeOpen} onClose={() => setFreeOpen(false)} />
        <DailyRewardDialog visible={rewardOpen} today={today} onClose={() => setRewardOpen(false)} />
        <RemoveAdsDialog visible={noAdsOpen} onClose={() => setNoAdsOpen(false)} />
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
  done?: boolean;
  compact?: boolean;
  tight?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${props.title}. ${props.blurb} ${props.cta}`}
      onPress={props.onPress}
      style={({ pressed }) => [
        glass.panel,
        styles.card,
        props.compact && styles.cardCompact,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={[styles.cardEmoji, props.compact && { fontSize: 34 }]}>{props.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[glass.text, styles.cardTitle]}>{props.title}</Text>
        {props.tight ? null : (
          <Text style={styles.cardBlurb} numberOfLines={props.compact ? 2 : 3}>
            {props.blurb}
          </Text>
        )}
        <View style={[styles.cta, props.primary && styles.ctaPrimary, props.done && styles.ctaDone]}>
          <Text style={[styles.ctaText, props.primary && { color: ink }]}>
            {props.cta}
            {props.done ? '' : ' ›'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 18 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gift: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.26)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  giftEmoji: { fontSize: 19 },
  dot: { position: 'absolute', top: 2, right: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: '#ff4d6d', borderWidth: 1.5, borderColor: '#fff' },
  scroll: { paddingBottom: 12 },
  scrollCompact: { paddingBottom: 8 },
  hero: { alignItems: 'center', paddingTop: 6, paddingBottom: 14 },
  heroCompact: { paddingBottom: 8 },
  logo: { fontSize: 52 },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: 4, marginTop: 4 },
  tagline: { fontSize: 15, marginTop: 4, opacity: 0.95 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  passBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  passEmoji: { fontSize: 26 },
  passTitle: { fontSize: 15, fontWeight: '900' },
  passTime: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, fontWeight: '800', marginTop: 1 },
  passDot: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#ff4d6d', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  passDotText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  noAds: { width: 64, minHeight: 56, borderRadius: 16, backgroundColor: 'rgba(20,12,45,0.55)', borderWidth: 2, borderColor: '#ffd166', alignItems: 'center', justifyContent: 'center' },
  noAdsEmoji: { fontSize: 20 },
  noAdsText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.5, marginTop: 1 },
  cards: { gap: 14, marginTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  cardCompact: { padding: 12, gap: 10 },
  cardEmoji: { fontSize: 40 },
  cardTitle: { fontSize: 21, fontWeight: '900' },
  cardBlurb: { color: 'rgba(255,255,255,0.88)', fontSize: 13.5, lineHeight: 19, marginTop: 3 },
  cta: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', minHeight: 36, justifyContent: 'center' },
  ctaPrimary: { backgroundColor: '#ffd166' },
  ctaDone: { backgroundColor: 'rgba(67,179,106,0.85)' },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  freeCoins: { alignSelf: 'center', marginTop: 16, backgroundColor: '#ffd166', borderRadius: 26, paddingHorizontal: 22, paddingVertical: 14, minHeight: 48, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  freeCoinsText: { color: ink, fontWeight: '900', fontSize: 16 },
});
