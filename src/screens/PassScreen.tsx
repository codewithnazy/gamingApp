import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoinChip } from '../components/CoinChip';
import { Dialog, DialogHeader, GhostButton, Notice, PrimaryButton } from '../components/Dialog';
import { FreeCoinsDialog } from '../components/FreeCoinsDialog';
import { GradientBackground } from '../components/GradientBackground';
import { useCoins, useEconomy } from '../economy';
import { glass, ink } from '../glass';
import * as feedback from '../haptics';
import { activatePassPremium, claimAllPassRewards, claimPassReward } from '../pass/actions';
import {
  PASS,
  claimStatus,
  claimableCount,
  effectivePass,
  hasPremium,
  isChest,
  rewardAmount,
  tierProgress,
  tierReached,
  type ClaimStatus,
  type Track,
} from '../pass/pass';
import { formatRemaining, seasonName } from '../pass/season';
import { usePassClock } from '../pass/usePassClock';
import { paletteById } from '../search/themes';
import type { Settings } from '../settings';

export function PassScreen({ settings, onBack }: { settings: Settings; onBack: () => void }) {
  const eco = useEconomy();
  const { season, remainingMs } = usePassClock();
  const pass = effectivePass(eco, season);
  const prog = tierProgress(pass.keys);
  const reached = tierReached(pass.keys);
  const premium = hasPremium(eco, season);
  const claimable = claimableCount(eco, season);
  const [activateOpen, setActivateOpen] = useState(false);
  const [freeOpen, setFreeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  // Claimable tiles breathe gently so they're easy to spot.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const flash = (text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const onTile = (tier: number, track: Track, status: ClaimStatus) => {
    if (status === 'claimable') {
      if (claimPassReward(tier, track).claimed) feedback.success();
    } else if (status === 'premium-locked') {
      setActivateOpen(true);
    } else if (status === 'locked') {
      const need = tier * PASS.keysPerTier - pass.keys;
      flash(`Earn ${need} more 🔑 to reach tier ${tier}`);
    } else {
      flash('Already claimed ✓');
    }
  };

  return (
    <GradientBackground palette={paletteById(settings.palette)}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBack} style={styles.round}>
            <Text style={styles.roundText}>‹</Text>
          </Pressable>
          <Text style={[glass.text, styles.title]}>Season Pass</Text>
          <CoinChip compact onPress={() => setFreeOpen(true)} />
        </View>

        <View style={[glass.panel, styles.hero]}>
          <Text style={styles.heroKey}>🔑</Text>
          <View style={{ flex: 1 }}>
            <Text style={[glass.text, styles.season]}>
              Season {season + 1} · {seasonName(season)}
            </Text>
            <Text style={styles.heroSub}>Finish new puzzles to earn keys. Unclaimed rewards expire when the season ends.</Text>
          </View>
          <View style={styles.timer} accessibilityLabel={`Season ends in ${formatRemaining(remainingMs)}`}>
            <Text style={styles.timerText}>🕐 {formatRemaining(remainingMs)}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${(prog.have / prog.need) * 100}%` }]} />
            <Text style={styles.barText} accessibilityLabel={`${pass.keys} keys, ${prog.have} of ${prog.need} toward the next tier`}>
              🔑 {prog.complete ? 'MAX' : `${prog.have}/${prog.need}`}
            </Text>
          </View>
          <View style={styles.tierCircle}>
            <Text style={styles.tierCircleText}>{prog.complete ? '✓' : prog.tier}</Text>
          </View>
          {premium ? (
            <View style={styles.premiumOn} accessibilityLabel="Premium active">
              <Text style={styles.premiumOnText}>👑 Premium ✓</Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Activate premium for ${PASS.premiumCost} coins`}
              onPress={() => setActivateOpen(true)}
              style={({ pressed }) => [styles.activate, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.activateText}>Activate</Text>
              <Text style={styles.activateCost}>🪙 {PASS.premiumCost}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.colHeader}>
          <Text style={[glass.text, styles.colTitle]}>FREE</Text>
          <Text style={[styles.colTitle, styles.colTitlePremium]}>👑 PREMIUM</Text>
        </View>

        <View style={styles.listWrap}>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {Array.from({ length: PASS.tiers }, (_, i) => i + 1).map((tier) => (
              <View key={tier} style={styles.tierRow}>
                <RewardTile tier={tier} track="free" status={claimStatus(eco, season, tier, 'free')} pulse={pulse} onPress={onTile} />
                <View style={[styles.tierBadge, tier <= reached ? styles.tierDone : styles.tierTodo]}>
                  <Text style={styles.tierBadgeText}>{tier}</Text>
                </View>
                <RewardTile tier={tier} track="premium" status={claimStatus(eco, season, tier, 'premium')} pulse={pulse} onPress={onTile} />
              </View>
            ))}
            <Text style={styles.footnote}>
              Each puzzle gives one 🔑 the first time you finish it this season. {PASS.keysPerTier} 🔑 unlock a tier.
            </Text>
          </ScrollView>
          {toast ? (
            <View pointerEvents="none" style={styles.toast}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          ) : null}
        </View>

        {claimable > 0 ? (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Claim all ${claimable} rewards`}
              onPress={() => {
                if (claimAllPassRewards().count > 0) feedback.success();
              }}
              style={({ pressed }) => [styles.claimAll, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            >
              <Text style={styles.claimAllText}>🎁  Claim all · {claimable}</Text>
            </Pressable>
          </View>
        ) : null}

        <ActivateDialog visible={activateOpen} onClose={() => setActivateOpen(false)} onNeedCoins={() => setFreeOpen(true)} />
        <FreeCoinsDialog visible={freeOpen} onClose={() => setFreeOpen(false)} />
      </SafeAreaView>
    </GradientBackground>
  );
}

function RewardTile(props: {
  tier: number;
  track: Track;
  status: ClaimStatus;
  pulse: Animated.Value;
  onPress: (tier: number, track: Track, status: ClaimStatus) => void;
}) {
  const { tier, track, status } = props;
  const amount = rewardAmount(tier, track);
  const premiumTile = track === 'premium';
  const claimableNow = status === 'claimable';
  const label =
    status === 'claimed' ? 'claimed' : status === 'claimable' ? 'ready to claim' : status === 'premium-locked' ? 'premium locked' : 'locked';

  return (
    <Animated.View
      style={[
        styles.tileWrap,
        claimableNow && { transform: [{ scale: props.pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tier ${tier} ${track} reward: ${amount} coins, ${label}`}
        onPress={() => props.onPress(tier, track, status)}
        style={({ pressed }) => [
          styles.tile,
          premiumTile ? styles.tilePremium : styles.tileFree,
          (status === 'locked' || status === 'claimed') && styles.tileDim,
          claimableNow && styles.tileReady,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.tileEmoji}>{isChest(tier, track) ? '🎁' : '🪙'}</Text>
        <Text style={[styles.tileAmount, premiumTile && { color: ink }]}>+{amount}</Text>
        {claimableNow ? <Text style={[styles.tileTag, premiumTile && { color: ink }]}>TAP TO CLAIM</Text> : null}
        {status === 'claimed' ? <Text style={styles.corner}>✅</Text> : null}
        {status === 'premium-locked' || status === 'locked' ? <Text style={styles.corner}>🔒</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

function ActivateDialog(props: { visible: boolean; onClose: () => void; onNeedCoins: () => void }) {
  const coins = useCoins();
  const [message, setMessage] = useState<string | null>(null);
  const cost = PASS.premiumCost;
  const canPay = coins >= cost;

  useEffect(() => {
    if (props.visible) setMessage(null);
  }, [props.visible]);

  const activate = () => {
    const status = activatePassPremium();
    if (status === 'activated') {
      feedback.success();
      props.onClose();
    } else if (status === 'insufficient') {
      setMessage(`You need ${cost - coins} more coins.`);
    } else {
      props.onClose(); // already active
    }
  };

  return (
    <Dialog visible={props.visible} onClose={props.onClose}>
      <DialogHeader emoji="👑" title="Activate Premium" subtitle="Unlock the premium reward track this season" />
      <View style={styles.perk}>
        <Text style={styles.perkText}>
          Premium rewards are bigger, and any premium tier you have already reached can be claimed right away.
        </Text>
      </View>
      <View style={styles.costBox}>
        <Text style={styles.costText}>🪙 {cost}</Text>
        <Text style={styles.costSub}>You have 🪙 {coins.toLocaleString()}</Text>
      </View>
      <PrimaryButton label={canPay ? `Activate · ${cost} 🪙` : `Need ${cost - coins} more coins`} disabled={!canPay} onPress={activate} />
      {!canPay ? (
        <GhostButton
          label="📺 Get free coins"
          onPress={() => {
            props.onClose();
            props.onNeedCoins();
          }}
        />
      ) : null}
      <Notice text={message} />
      <GhostButton label="Not now" onPress={props.onClose} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.22)' },
  roundText: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: 1 },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginTop: 4, padding: 12 },
  heroKey: { fontSize: 34 },
  season: { fontSize: 16, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, lineHeight: 15, marginTop: 2 },
  timer: { backgroundColor: 'rgba(20,12,45,0.6)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  timerText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginTop: 10 },
  bar: { flex: 1, height: 32, borderRadius: 16, backgroundColor: 'rgba(20,12,45,0.6)', borderWidth: 2, borderColor: '#ffd166', overflow: 'hidden', justifyContent: 'center' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#43b36a' },
  barText: { color: '#fff', fontWeight: '900', fontSize: 14, textAlign: 'center' },
  tierCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ff8a3d', borderWidth: 3, borderColor: '#ffd166', alignItems: 'center', justifyContent: 'center' },
  tierCircleText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  activate: { backgroundColor: '#ffd166', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, alignItems: 'center', minHeight: 40, justifyContent: 'center' },
  activateText: { color: ink, fontWeight: '900', fontSize: 14 },
  activateCost: { color: ink, fontWeight: '800', fontSize: 11 },
  premiumOn: { backgroundColor: '#43b36a', borderRadius: 14, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center' },
  premiumOnText: { color: '#fff', fontWeight: '900', fontSize: 13 },

  colHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, marginTop: 12 },
  colTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: '#fff' },
  colTitlePremium: { color: '#ffd166' },

  listWrap: { flex: 1 },
  list: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14, gap: 10 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileWrap: { flex: 1 },
  tile: { minHeight: 82, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, paddingVertical: 8 },
  tileFree: { backgroundColor: '#6c5ce0', borderColor: '#a79bf5' },
  tilePremium: { backgroundColor: '#ffd166', borderColor: '#ffb020' },
  tileDim: { opacity: 0.6 },
  tileReady: { borderColor: '#ffffff', shadowColor: '#fff', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  tileEmoji: { fontSize: 28 },
  tileAmount: { color: '#fff', fontWeight: '900', fontSize: 20 },
  tileTag: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 1 },
  corner: { position: 'absolute', right: 5, bottom: 3, fontSize: 15 },
  tierBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  tierDone: { backgroundColor: '#43b36a', borderColor: '#9be6b4' },
  tierTodo: { backgroundColor: '#ff8a3d', borderColor: '#ffc08a' },
  tierBadgeText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  footnote: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, textAlign: 'center', marginTop: 4 },

  toast: { position: 'absolute', top: 6, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  toastText: { color: ink, fontWeight: '800' },

  footer: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4 },
  claimAll: { backgroundColor: '#ffd166', borderRadius: 26, paddingVertical: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  claimAllText: { color: ink, fontSize: 17, fontWeight: '900' },

  perk: { backgroundColor: '#f4f0ff', borderRadius: 14, padding: 12 },
  perkText: { color: '#3d3560', fontSize: 13.5, fontWeight: '600', lineHeight: 19, textAlign: 'center' },
  costBox: { alignItems: 'center', backgroundColor: '#fff4d6', borderRadius: 16, paddingVertical: 10, borderWidth: 1.5, borderColor: '#ffb020' },
  costText: { color: ink, fontSize: 30, fontWeight: '900' },
  costSub: { color: '#5b5575', fontSize: 12.5, fontWeight: '700' },
});
