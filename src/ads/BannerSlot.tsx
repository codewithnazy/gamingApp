import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getAdsLib, getUnit } from './adsImpl';
import { useAdsState } from './store';

/** A banner ad for menu screens. Renders nothing when ads are off, unavailable or failed to load. */
export function BannerSlot() {
  const { enabled } = useAdsState();
  const [failed, setFailed] = useState(false);
  const lib = getAdsLib();
  const unit = getUnit('banner');
  if (!enabled || !lib || !unit || failed) return null;

  const { BannerAd, BannerAdSize } = lib;
  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={unit.id}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center' } });
