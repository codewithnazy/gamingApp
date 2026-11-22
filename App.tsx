import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setHapticsEnabled } from './src/haptics';
import { DIFFICULTIES } from './src/search/engine';
import { PALETTES, THEMES } from './src/search/themes';
import { HeistScreen } from './src/screens/HeistScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchPlayScreen } from './src/screens/SearchPlayScreen';
import { SearchSetupScreen } from './src/screens/SearchSetupScreen';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from './src/settings';
import { loadBestTimes, loadRawSettings, saveBestTimes, saveSettings, type BestTimes } from './src/storage';

type Screen = 'home' | 'search-setup' | 'search-play' | 'heist';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [best, setBest] = useState<BestTimes>({});

  useEffect(() => {
    (async () => {
      const [raw, savedBest] = await Promise.all([loadRawSettings(), loadBestTimes()]);
      setSettings(
        sanitizeSettings(raw, {
          themes: THEMES.map((t) => t.id),
          difficulties: Object.keys(DIFFICULTIES),
          palettes: PALETTES.map((p) => p.id),
        }),
      );
      setBest(savedBest);
    })();
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
          onChange={update}
          onStart={() => setScreen('search-play')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'search-play' && (
        <SearchPlayScreen
          settings={settings}
          best={best}
          onNewBest={recordBest}
          onBack={() => setScreen('search-setup')}
        />
      )}
      {screen === 'heist' && <HeistScreen onBack={() => setScreen('home')} />}
    </SafeAreaProvider>
  );
}
