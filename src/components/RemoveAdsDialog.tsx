import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { billingAvailable, PRODUCTS, restoreEntitlements, startRemoveAdsPurchase } from '../billing';
import { useEconomy } from '../economy';
import { Dialog, DialogHeader, GhostButton, Notice, OptionButton, PrimaryButton } from './Dialog';

/**
 * The "Remove Ads" store entry. Real purchases arrive with a billing integration (docs/BILLING.md);
 * until then this explains what it will do and the buttons answer honestly ("not available yet").
 */
export function RemoveAdsDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const owned = useEconomy().adsRemoved;
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const product = PRODUCTS.remove_ads;
  const available = billingAvailable();

  const run = async (kind: 'buy' | 'restore') => {
    if (working) return;
    setWorking(true);
    setMessage(null);
    try {
      const status = kind === 'buy' ? await startRemoveAdsPurchase() : await restoreEntitlements();
      if (status === 'unavailable') setMessage('Purchases are not available in this version yet.');
      else if (status === 'cancelled') setMessage('Purchase cancelled. You have not been charged.');
      else if (status === 'failed') setMessage('Something went wrong. You have not been charged - please try again.');
      else if (status === 'nothing-to-restore') setMessage('No earlier purchases were found.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog visible={visible} onClose={onClose} dismissable={!working}>
      <DialogHeader emoji={owned ? '✅' : '🚫'} title={owned ? 'Ads removed' : product.title} subtitle={owned ? 'Thank you for supporting the game!' : 'One-time purchase'} />
      <View style={styles.box}>
        <Text style={styles.text}>
          {owned
            ? 'Banner and between-level ads are switched off. Optional reward videos (free hints and coins) are still available if you want them.'
            : product.description}
        </Text>
      </View>
      {!owned && (
        <>
          <PrimaryButton
            label={available ? 'Remove Ads' : 'Coming soon'}
            disabled={!available}
            loading={working}
            onPress={() => run('buy')}
          />
          <OptionButton title="Restore purchases" sub="Already bought it on another device?" disabled={working} onPress={() => run('restore')} />
        </>
      )}
      <Notice text={message} tone="info" />
      <GhostButton label="Close" onPress={onClose} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#f4f0ff', borderRadius: 14, padding: 14 },
  text: { color: '#3d3560', fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
});
