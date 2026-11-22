import { StyleSheet, Text, View } from 'react-native';
import { MAX_GUESSES, WORD_LENGTH, evaluateGuess } from '../game.ts';
import { colors, tileColor } from '../theme';

interface Props {
  guesses: string[];
  current: string;
  answer: string;
  tileSize: number;
}

export function Board({ guesses, current, answer, tileSize }: Props) {
  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    if (r < guesses.length) {
      return { letters: guesses[r], states: evaluateGuess(guesses[r], answer) };
    }
    if (r === guesses.length) return { letters: current, states: undefined };
    return { letters: '', states: undefined };
  });

  return (
    <View accessibilityRole="grid" style={styles.board}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: WORD_LENGTH }, (_, c) => {
            const letter = row.letters[c] ?? '';
            const bg = tileColor(row.states?.[c]);
            return (
              <View
                key={c}
                accessibilityLabel={
                  letter ? `${letter}, ${row.states?.[c] ?? 'not submitted'}` : 'empty'
                }
                style={[
                  styles.tile,
                  { width: tileSize, height: tileSize },
                  bg
                    ? { backgroundColor: bg, borderColor: bg }
                    : letter
                      ? { borderColor: colors.muted }
                      : null,
                ]}
              >
                <Text style={[styles.letter, { fontSize: tileSize * 0.55 }]}>{letter}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { gap: 6, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 6 },
  tile: {
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  letter: { color: colors.text, fontWeight: '800' },
});
