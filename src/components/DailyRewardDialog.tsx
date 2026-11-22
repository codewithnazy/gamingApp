import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { claimDaily } from '../daily/actions';
import { canClaimDaily } from '../daily/rewards';
import { REWARDS, useEconomy } from '../economy';
import * as feedback from '../haptics';
import { ink } from '../glass';
import { Dialog, GhostButton, PrimaryButton } from './Dialog';

/** 🎁 Daily Reward: today's coins, one claim per calendar day (and it stays claimed after a restart). */
export function DailyRewardDialog(props: { visible: boolean; today: string; onClose: () => void }) {
  const eco = useEconomy();
  const claimable = canClaimDaily(eco, props.today);
  const [justClaimed, setJustClaimed] = useState(false);
  const wobble = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (props.visible) setJustClaimed(false);
  }, [props.visible]);

  // The unclaimed gift wobbles gently to invite a tap.
  useEffect(() => {
    if (!props.visible || !claimable) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(wobble, { toValue: -1, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(wobble, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(900),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [props.visible, claimable, wobble]);

  const claim = () => {
    const res = claimDaily(props.today);
    if (res.claimed) {
      feedback.success();
      setJustClaimed(true);
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
    }
  };

  const done = !claimable;
  return (
    <Dialog visible={props.visible} onClose={props.onClose}>
      <View style={styles.header}>
        <Animated.Text
          style={[
            styles.gift,
            { transform: [{ rotate: wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) }, { scale: justClaimed ? pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) : 1 }] },
          ]}
        >
          {done ? '🎉' : '🎁'}
        </Animated.Text>
        <Text style={styles.title}>Daily Reward</Text>
      </View>

      <View style={[styles.reward, done && styles.rewardDone]}>
        <Text style={styles.rewardLabel}>{done ? 'Reward claimed' : "Today's reward"}</Text>
        <Text style={styles.rewardAmount}>
          {done ? '✅' : `+${REWARDS.dailyLogin} 🪙`}
        </Text>
        {done ? <Text style={styles.sub}>{justClaimed ? `+${REWARDS.dailyLogin} 🪙 added!  ` : ''}Come back tomorrow for more.</Text> : <Text style={styles.sub}>You have 🪙 {eco.coins.toLocaleString()}</Text>}
      </View>

      {done ? <PrimaryButton label="Nice!" onPress={props.onClose} /> : <PrimaryButton label="Claim" onPress={claim} />}
      {!done && <GhostButton label="Later" onPress={props.onClose} />}
    </Dialog>
  );
}

/** Convenience for screens: is today's reward still waiting? */
export const useDailyClaimable = (today: string) => canClaimDaily(useEconomy(), today);

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 2 },
  gift: { fontSize: 64 },
  title: { color: ink, fontSize: 26, fontWeight: '900' },
  reward: { alignItems: 'center', backgroundColor: '#fff4d6', borderRadius: 18, paddingVertical: 14, borderWidth: 1.5, borderColor: '#ffb020' },
  rewardDone: { backgroundColor: '#e9f9ef', borderColor: '#43b36a' },
  rewardLabel: { color: '#5b5575', fontWeight: '800', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  rewardAmount: { color: ink, fontSize: 38, fontWeight: '900', marginTop: 2 },
  sub: { color: '#5b5575', fontSize: 13, fontWeight: '700', marginTop: 2, textAlign: 'center' },
});
