import { COSTS } from '../economy/rewards';
import { Dialog, DialogHeader, GhostButton, Notice, OptionButton } from './Dialog';

interface Props {
  visible: boolean;
  coins: number;
  /** Ads are switched on and consent allows them. */
  adsEnabled: boolean;
  /** A rewarded ad is loaded and ready right now. */
  adReady: boolean;
  /** An ad request is in progress (loading or playing). */
  adBusy: boolean;
  message: string | null;
  onUseCoins: () => void;
  onWatchAd: () => void;
  onCancel: () => void;
}

/** "Need a hint?" - pay with coins, watch an ad, or cancel. Costs nothing until a choice is made. */
export function HintDialog(p: Props) {
  const cost = COSTS.hint;
  const canPay = p.coins >= cost;
  const adSub = !p.adsEnabled
    ? 'Ads are unavailable right now'
    : p.adBusy
      ? 'Loading the ad…'
      : p.adReady
        ? 'A short video - the hint is free'
        : 'The ad will load in a moment';

  return (
    <Dialog visible={p.visible} onClose={p.onCancel} dismissable={!p.adBusy}>
      <DialogHeader emoji="💡" title="Need a hint?" subtitle={`Your coins: 🪙 ${p.coins.toLocaleString()}`} />

      <OptionButton
        title={`🪙  Use ${cost} coins`}
        sub={canPay ? 'Reveals one word start' : `Not enough coins - you need ${cost - p.coins} more`}
        disabled={!canPay || p.adBusy}
        highlight={canPay}
        onPress={p.onUseCoins}
        accessibilityLabel={`Use ${cost} coins for a hint`}
      />
      <OptionButton
        title="📺  Watch an ad - Free hint"
        sub={adSub}
        disabled={!p.adsEnabled || p.adBusy}
        loading={p.adBusy}
        onPress={p.onWatchAd}
        accessibilityLabel="Watch an ad for a free hint"
      />

      <Notice text={p.message} />
      <GhostButton label="Cancel" onPress={p.onCancel} />
    </Dialog>
  );
}
