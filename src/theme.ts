import { StyleSheet } from 'react-native';

export const colors = {
  background: '#FBF6EF',
  surface: '#FFFFFF',
  text: '#2E211C',
  muted: '#685750',
  accent: '#893B2D',
};

export const screenStyles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 16,
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
});
