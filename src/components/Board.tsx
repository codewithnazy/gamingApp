import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MAX_GUESSES, WORD_LENGTH, evaluateGuess, type TileState } from '../game.ts';
import { colors, tileColor } from '../theme';

export const TILE_GAP = 6;
const FLIP_MS = 150;
const STAGGER_MS = 280;

interface Props {
  guesses: string[];
  current: string;
  answer: string;
  tileSize: number;
  /** Row index whose reveal should animate (just submitted); -1 for none. */
  animateRow: number;
  /** Increment to shake the current row (invalid guess). */
  shakeKey: number;
}

export function Board({ guesses, current, answer, tileSize, animateRow, shakeKey }: Props) {
  return (
    <View accessibilityRole="grid" style={styles.board}>
      {Array.from({ length: MAX_GUESSES }, (_, r) => {
        const submitted = r < guesses.length;
        const letters = submitted ? guesses[r] : r === guesses.length ? current : '';
        const states = submitted ? evaluateGuess(guesses[r], answer) : undefined;
        return (
          <Row
            key={r}
            letters={letters}
            states={states}
            tileSize={tileSize}
            animate={r === animateRow}
            shakeKey={r === guesses.length ? shakeKey : 0}
          />
        );
      })}
    </View>
  );
}

function Row(props: {
  letters: string;
  states?: TileState[];
  tileSize: number;
  animate: boolean;
  shakeKey: number;
}) {
  const shake = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (props.shakeKey === 0) return;
    Animated.sequence(
      [10, -10, 8, -8, 4, 0].map((v) =>
        Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: true }),
      ),
    ).start();
  }, [props.shakeKey, shake]);

  return (
    <Animated.View style={[styles.row, { transform: [{ translateX: shake }] }]}>
      {Array.from({ length: WORD_LENGTH }, (_, c) => (
        <Tile
          key={c}
          letter={props.letters[c] ?? ''}
          state={props.states?.[c]}
          size={props.tileSize}
          animate={props.animate}
          delay={c * STAGGER_MS}
        />
      ))}
    </Animated.View>
  );
}

function Tile(props: {
  letter: string;
  state?: TileState;
  size: number;
  animate: boolean;
  delay: number;
}) {
  const { letter, state, size, animate, delay } = props;
  const flip = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(1)).current;
  // The color shown. When animating, it switches at the midpoint of the flip.
  const [shown, setShown] = useState<TileState | undefined>(animate ? undefined : state);

  useEffect(() => {
    if (!state) {
      setShown(undefined);
      return;
    }
    if (!animate) {
      setShown(state);
      return;
    }
    const t = setTimeout(() => setShown(state), delay + FLIP_MS);
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(flip, { toValue: 0, duration: FLIP_MS, useNativeDriver: true }),
      Animated.timing(flip, { toValue: 1, duration: FLIP_MS, useNativeDriver: true }),
    ]).start();
    return () => clearTimeout(t);
  }, [state, animate, delay, flip]);

  useEffect(() => {
    if (!letter || state) return;
    pop.setValue(1.14);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();
  }, [letter, state, pop]);

  const bg = tileColor(shown);
  return (
    <Animated.View
      accessibilityLabel={letter ? `${letter}, ${state ?? 'not submitted'}` : 'empty'}
      style={[
        styles.tile,
        { width: size, height: size, transform: [{ scaleY: flip }, { scale: pop }] },
        bg
          ? { backgroundColor: bg, borderColor: bg }
          : letter
            ? { borderColor: colors.muted, backgroundColor: colors.panel }
            : { backgroundColor: colors.panel },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.56 }]}>{letter}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: { gap: TILE_GAP, alignItems: 'center' },
  row: { flexDirection: 'row', gap: TILE_GAP },
  tile: {
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  letter: { color: colors.text, fontWeight: '800' },
});
