import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TileState } from '../game.ts';
import { colors, tileColor } from '../theme';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

interface Props {
  states: Record<string, TileState>;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}

export function Keyboard({ states, onLetter, onEnter, onBackspace, disabled }: Props) {
  return (
    <View style={styles.keyboard}>
      {ROWS.map((row, i) => (
        <View key={row} style={styles.row}>
          {i === 2 && <Key label="ENTER" wide onPress={onEnter} disabled={disabled} />}
          {row.split('').map((l) => (
            <Key
              key={l}
              label={l}
              bg={tileColor(states[l])}
              onPress={() => onLetter(l)}
              disabled={disabled}
            />
          ))}
          {i === 2 && <Key label="⌫" wide a11y="Backspace" onPress={onBackspace} disabled={disabled} />}
        </View>
      ))}
    </View>
  );
}

function Key(props: {
  label: string;
  onPress: () => void;
  bg?: string;
  wide?: boolean;
  a11y?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.a11y ?? props.label}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.key,
        props.wide && styles.wide,
        { backgroundColor: props.bg ?? colors.key },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.keyText, props.wide && { fontSize: 12 }]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  keyboard: { gap: 8, alignItems: 'center', width: '100%' },
  row: { flexDirection: 'row', gap: 5, justifyContent: 'center' },
  key: {
    minWidth: 31,
    height: 52,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: { minWidth: 52 },
  keyText: { color: colors.text, fontWeight: '700', fontSize: 16 },
});
