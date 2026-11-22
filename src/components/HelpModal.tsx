import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MAX_GUESSES, STEAL_PENALTY, WORD_LENGTH } from '../game.ts';
import { colors } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function HelpModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>How to play</Text>
          <Text style={styles.body}>
            Crack today&apos;s {WORD_LENGTH}-letter word in {MAX_GUESSES} guesses. Everyone gets the
            same word.
          </Text>

          <View style={styles.legend}>
            <Swatch color={colors.correct} text="Right letter, right spot" />
            <Swatch color={colors.present} text="Right letter, wrong spot" />
            <Swatch color={colors.absent} text="Not in the word" />
          </View>

          <Text style={styles.heading}>🕶️ The heist</Text>
          <Text style={styles.body}>
            Stuck? Once per day you can steal one letter from the rival&apos;s board. It&apos;s
            revealed in its exact spot, but it costs you {STEAL_PENALTY} points.
          </Text>

          <Text style={styles.heading}>Scoring</Text>
          <Text style={styles.body}>
            Win in 1 guess for 600 points, and 100 less for each extra guess.
          </Text>

          <Pressable accessibilityRole="button" style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Swatch({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.swatchRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  card: { backgroundColor: colors.panel, borderRadius: 18, padding: 22, gap: 8 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  heading: { color: colors.accent, fontSize: 15, fontWeight: '800', marginTop: 8 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  legend: { gap: 8, marginVertical: 6 },
  swatchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 26, height: 26, borderRadius: 6 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  buttonText: { color: colors.accentText, fontWeight: '800', fontSize: 16 },
});
