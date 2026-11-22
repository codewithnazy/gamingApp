import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { requestRewardedAd, useAdsState } from '../ads';
import { rewardedFailureMessage } from '../ads/messages';
import { economy, REWARDS, useCoins } from '../economy';
import { claimFreeCoins } from '../economy/flows';
import { track } from '../analytics';
import * as feedback from '../haptics';
import { ink } from '../glass';
import { Dialog, DialogHeader, GhostButton, Notice, PrimaryButton } from './Dialog';

type Phase = 'idle' | 'working' | 'success';

/** "Free Coins": shows the reward up front; pays +30 only after the ad's reward callback confirms. */
export function FreeCoinsDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const coins = useCoins();
  const ads = useAdsState();
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPhase('idle');
      setMessage(null);
    }
  }, [visible]);

  const watch = async () => {
    if (phase === 'working') return;
    setPhase('working');
    setMessage(null);
    track('rewarded_ad_requested', { placement: 'free_coins' });
    const res = await claimFreeCoins({ economy, requestRewardedAd });
    if (res.ok) {
      track('rewarded_ad_completed', { placement: 'free_coins' });
      feedback.success();
      setPhase('success');
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
      return;
    }
    if (res.reason !== 'busy') track('rewarded_ad_failed', { placement: 'free_coins', reason: res.reason });
    setPhase('idle');
    setMessage(rewardedFailureMessage(res.reason));
  };

  const working = phase === 'working';
  return (
    <Dialog visible={visible} onClose={onClose} dismissable={!working}>
      {phase === 'success' ? (
        <>
          <DialogHeader emoji="🎉" title="Coins collected!" />
          <Animated.View style={[styles.big, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }], opacity: pop }]}>
            <Text style={styles.bigText}>+{REWARDS.rewardedAd} 🪙</Text>
          </Animated.View>
          <Text style={styles.balance}>New balance: 🪙 {coins.toLocaleString()}</Text>
          <PrimaryButton label="Awesome!" onPress={onClose} />
        </>
      ) : (
        <>
          <DialogHeader emoji="🪙" title="Free Coins" subtitle="Watch a short ad to earn coins" />
          <View style={styles.reward}>
            <Text style={styles.rewardText}>+{REWARDS.rewardedAd} 🪙</Text>
            <Text style={styles.rewardSub}>You have 🪙 {coins.toLocaleString()}</Text>
          </View>
          <PrimaryButton
            label={ads.enabled ? '📺  Watch ad' : 'Ads unavailable right now'}
            loading={working}
            disabled={!ads.enabled}
            onPress={watch}
          />
          <Notice text={message} />
          <GhostButton label="Not now" onPress={onClose} />
        </>
      )}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  reward: { alignItems: 'center', backgroundColor: '#fff4d6', borderRadius: 18, paddingVertical: 14, borderWidth: 1.5, borderColor: '#ffb020' },
  rewardText: { color: ink, fontSize: 34, fontWeight: '900' },
  rewardSub: { color: '#5b5575', fontSize: 13, fontWeight: '700', marginTop: 2 },
  big: { alignItems: 'center', paddingVertical: 6 },
  bigText: { color: ink, fontSize: 44, fontWeight: '900' },
  balance: { color: '#5b5575', textAlign: 'center', fontWeight: '700', marginBottom: 4 },
});
