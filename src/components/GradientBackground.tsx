import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import type { Palette } from '../search/themes';

// Fixed layout (percent of screen) so the background is stable between renders.
const BUBBLES = [
  { x: 6, y: 8, size: 110, drift: 22, ms: 6200, opacity: 0.16 },
  { x: 70, y: 14, size: 70, drift: 16, ms: 5200, opacity: 0.2 },
  { x: 40, y: 32, size: 150, drift: 28, ms: 7600, opacity: 0.1 },
  { x: 78, y: 48, size: 120, drift: 20, ms: 6800, opacity: 0.14 },
  { x: 4, y: 58, size: 90, drift: 18, ms: 5600, opacity: 0.18 },
  { x: 55, y: 74, size: 130, drift: 26, ms: 7200, opacity: 0.12 },
  { x: 18, y: 86, size: 60, drift: 14, ms: 4800, opacity: 0.2 },
];

function Bubble(props: { color: string } & (typeof BUBBLES)[number]) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: props.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: props.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, props.ms]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: `${props.x}%`,
        top: `${props.y}%`,
        width: props.size,
        height: props.size,
        borderRadius: props.size / 2,
        backgroundColor: props.color,
        opacity: props.opacity,
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -props.drift] }) }],
      }}
    />
  );
}

/** Full-screen colourful gradient with slowly floating translucent bubbles. */
export function GradientBackground({ palette, children }: { palette: Palette; children: ReactNode }) {
  return (
    <View style={styles.fill}>
      <LinearGradient
        colors={palette.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {BUBBLES.map((b, i) => (
        <Bubble key={i} color={palette.bubble} {...b} />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, overflow: 'hidden' } });
