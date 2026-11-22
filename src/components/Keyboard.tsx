import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TileState } from '../game.ts';
import * as feedback from '../haptics';
import { colors, tileColor } from '../theme';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const GAP = 5;

interface Props {
  states: Record<string, TileState>;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  disabled?: boolean;
  keyHeight: number;
}

/**
 * Keys are flex-sized (not fixed-width), so the keyboard always fits the screen
 * width, from small 320dp phones to tablets.
 */
export function Keyboard({ states, onLetter, onEnter, onBackspace, disabled, keyHeight }: Props) {
  return (
    <View style={styles.keyboard}>
      {ROWS.map((row, i) => (
        <View key={row} style={styles.row}>
          {i === 1 && <View style={styles.spacer} />}
          {i === 2 && (
            <Key label="ENTER" wide height={keyHeight} onPress={onEnter} disabled={disabled} accent />
          )}
          {row.split('').map((l) => (
            <Key
              key={l}
              label={l}
              height={keyHeight}
              bg={tileColor(states[l])}
              onPress={() => onLetter(l)}
              disabled={disabled}
            />
          ))}
          {i === 2 && (
            <Key
              label="⌫"
              wide
              height={keyHeight}
              a11y="Backspace"
              onPress={onBackspace}
              disabled={disabled}
            />
          )}
          {i === 1 && <View style={styles.spacer} />}
        </View>
      ))}
    </View>
  );
}

function Key(props: {
  label: string;
  onPress: () => void;
  height: number;
  bg?: string;
  wide?: boolean;
  accent?: boolean;
  a11y?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.a11y ?? props.label}
      disabled={props.disabled}
      onPressIn={feedback.tap}
      onPress={props.onPress}
      hitSlop={{ top: GAP, bottom: GAP }}
      style={({ pressed }) => [
        styles.key,
        props.wide ? styles.wide : styles.letterKey,
        { height: props.height, backgroundColor: props.bg ?? colors.key },
        props.accent && !props.bg && { backgroundColor: colors.panelAlt, borderColor: colors.accent },
        pressed && styles.pressed,
        props.disabled && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.keyText, props.wide && styles.wideText]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  keyboard: { width: '100%', paddingHorizontal: 6, gap: GAP + 3 },
  row: { flexDirection: 'row', gap: GAP, justifyContent: 'center' },
  spacer: { flex: 0.5 },
  key: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  letterKey: { flex: 1 },
  wide: { flex: 1.6 },
  pressed: { opacity: 0.55, transform: [{ scale: 0.94 }] },
  keyText: { color: colors.text, fontWeight: '700', fontSize: 18 },
  wideText: { fontSize: 13 },
});
