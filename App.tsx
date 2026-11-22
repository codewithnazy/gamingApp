import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AdOverlay, initAds } from './src/ads';
import { track } from './src/analytics';
import { CoinFloater } from './src/components/CoinFloater';
import { economy } from './src/economy';
import { setHapticsEnabled } from './src/haptics';
import { DIFFICULTIES } from './src/search/engine';
import { EMPTY_PROGRESS, type LevelProgress } from './src/search/levels';
import { PALETTES, THEME_CHOICES } from './src/search/themes';
import { HeistScreen } from './src/screens/HeistScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchPlayScreen } from './src/screens/SearchPlayScreen';
import { SearchSetupScreen } from './src/screens/SearchSetupScreen';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from './src/settings';
import {
  loadBestTimes,
  loadLevelProgress,
  loadRawSettings,
  saveBestTimes,
  saveLevelProgress,
  saveSettings,
  type BestTimes,
} from './src/storage';

type Screen = 'home' | 'search-setup' | 'search-play' | 'heist';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [best, setBest] = useState<BestTimes>({});
  const [progress, setProgress] = useState<LevelProgress>(EMPTY_PROGRESS);
  /** Level being played, or null for quick play. */
  const [playLevel, setPlayLevel] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [raw, savedBest, savedProgress] = await Promise.all([
        loadRawSettings(),
        loadBestTimes(),
        loadLevelProgress(),
        economy.init(), // coins & reward ledger (repairs corrupt data, never throws)
      ]);
      setSettings(
        sanitizeSettings(raw, {
          themes: THEME_CHOICES.map((t) => t.id),
          difficulties: Object.keys(DIFFICULTIES),
          palettes: PALETTES.map((p) => p.id),
        }),
      );
      setBest(savedBest);
      setProgress(savedProgress);
    })();
  }, []);

  // Start ads once (consent form first where required). Failure just means no ads.
  useEffect(() => {
    initAds();
    track('app_opened', {});
  }, []);

  // One place bridges coin transactions to analytics, so no call site can forget.
  useEffect(() => {
    const offGain = economy.onGain((e) => track('coins_earned', { amount: e.amount, source: e.reason }));
    const offSpend = economy.onSpend((e) => track('coins_spent', { amount: e.amount, reason: e.reason }));
    return () => {
      offGain();
      offSpend();
    };
  }, []);

  useEffect(() => {
    if (settings) setHapticsEnabled(settings.haptics);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...(prev ?? DEFAULT_SETTINGS), ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const recordBest = useCallback((key: string, seconds: number) => {
    setBest((prev) => {
      const next = { ...prev, [key]: seconds };
      saveBestTimes(next);
      return next;
    });
  }, []);

  const updateProgress = useCallback((next: LevelProgress) => {
    setProgress(next);
    saveLevelProgress(next);
  }, []);

  // Android hardware back button walks back up the screen stack.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false; // let the OS leave the app
      setScreen(screen === 'search-play' ? 'search-setup' : 'home');
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  if (!settings) {
    return (
      <View style={{ flex: 1, backgroundColor: '#12123d', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#ffd166" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen === 'home' && (
        <HomeScreen settings={settings} onSearch={() => setScreen('search-setup')} onHeist={() => setScreen('heist')} />
      )}
      {screen === 'search-setup' && (
        <SearchSetupScreen
          settings={settings}
          best={best}
          progress={progress}
          onChange={update}
          onStartQuick={() => {
            setPlayLevel(null);
            setScreen('search-play');
          }}
          onStartLevel={(level) => {
            setPlayLevel(level);
            setScreen('search-play');
          }}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'search-play' && (
        <SearchPlayScreen
          key={playLevel ?? 'quick'}
          settings={settings}
          best={best}
          level={playLevel}
          progress={progress}
          onProgress={updateProgress}
          onNextLevel={setPlayLevel}
          onNewBest={recordBest}
          onBack={() => setScreen('search-setup')}
        />
      )}
      {screen === 'heist' && <HeistScreen onBack={() => setScreen('home')} />}
      <CoinFloater />
      <AdOverlay />
    </SafeAreaProvider>
  );
}
