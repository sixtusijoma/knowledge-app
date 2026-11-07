// EXPO_PUBLIC_DEMO=sample is inlined by Expo. It must be a static process.env read.
export function isSampleMode(): boolean {
  return process.env.EXPO_PUBLIC_DEMO === 'sample';
}
