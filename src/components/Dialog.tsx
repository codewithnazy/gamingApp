import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { ink } from '../glass';
import * as feedback from '../haptics';

/** Shared rounded white card on a dimmed backdrop - the same look as the level-complete dialog. */
export function Dialog(props: { visible: boolean; onClose: () => void; children: ReactNode; dismissable?: boolean }) {
  const { visible, onClose, children, dismissable = true } = props;
  const pop = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    pop.setValue(0.9);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 7, tension: 140, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [visible, pop, fade]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismissable ? onClose : undefined}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable
          accessibilityLabel="Close dialog"
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onClose : undefined}
        />
        <Animated.View style={[styles.card, { transform: [{ scale: pop }] }]}>{children}</Animated.View>
      </Animated.View>
    </Modal>
  );
}

export function DialogHeader(props: { emoji: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.emoji}>{props.emoji}</Text>
      <Text style={styles.title}>{props.title}</Text>
      {props.subtitle ? <Text style={styles.subtitle}>{props.subtitle}</Text> : null}
    </View>
  );
}

/** Large yellow call-to-action (matches the app's primary buttons). */
export function PrimaryButton(props: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!props.disabled || !!props.loading, busy: !!props.loading }}
      disabled={props.disabled || props.loading}
      onPress={() => {
        feedback.tap();
        props.onPress();
      }}
      style={({ pressed }) => [styles.primary, (props.disabled || props.loading) && styles.dim, pressed && styles.pressed]}
    >
      {props.loading ? <ActivityIndicator color={ink} /> : <Text style={styles.primaryText}>{props.label}</Text>}
    </Pressable>
  );
}

/** A big tappable choice with a title and an optional second line. */
export function OptionButton(props: {
  title: string;
  sub?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  highlight?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  const off = props.disabled || props.loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? props.title}
      accessibilityState={{ disabled: !!off, busy: !!props.loading }}
      disabled={off}
      onPress={() => {
        feedback.tap();
        props.onPress();
      }}
      style={({ pressed }) => [
        styles.option,
        props.highlight && styles.optionHighlight,
        off && styles.dim,
        pressed && styles.pressed,
        props.style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{props.title}</Text>
        {props.sub ? <Text style={styles.optionSub}>{props.sub}</Text> : null}
      </View>
      {props.loading ? <ActivityIndicator color="#6a5fa8" /> : null}
    </Pressable>
  );
}

export function GhostButton(props: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={props.onPress} style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}>
      <Text style={styles.ghostText}>{props.label}</Text>
    </Pressable>
  );
}

/** An inline message (errors / info) inside a dialog. */
export function Notice(props: { text: string | null; tone?: 'error' | 'info' }) {
  if (!props.text) return null;
  return (
    <View style={[styles.notice, props.tone === 'info' && styles.noticeInfo]} accessibilityLiveRegion="polite">
      <Text style={styles.noticeText}>{props.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,6,30,0.72)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 22, gap: 10 },
  header: { alignItems: 'center', gap: 2, marginBottom: 2 },
  emoji: { fontSize: 44 },
  title: { color: ink, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#5b5575', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  primary: { backgroundColor: '#ffb020', borderRadius: 16, paddingVertical: 15, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  primaryText: { color: ink, fontSize: 17, fontWeight: '900' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: '#f4f0ff', borderWidth: 1.5, borderColor: '#e1d9fb' },
  optionHighlight: { backgroundColor: '#fff4d6', borderColor: '#ffb020' },
  optionTitle: { color: ink, fontSize: 17, fontWeight: '800' },
  optionSub: { color: '#5b5575', fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  ghost: { alignItems: 'center', paddingVertical: 12 },
  ghostText: { color: '#6a5fa8', fontWeight: '800', fontSize: 15 },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  notice: { backgroundColor: '#ffe9ec', borderRadius: 12, padding: 12 },
  noticeInfo: { backgroundColor: '#eef6ff' },
  noticeText: { color: '#6b2030', fontSize: 13.5, fontWeight: '700', textAlign: 'center' },
});
