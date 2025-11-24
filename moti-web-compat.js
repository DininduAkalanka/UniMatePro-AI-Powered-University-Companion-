// Web-compatible animation wrapper
import { Platform, View } from 'react-native';

// Only import moti on native platforms
let MotiView;
if (Platform.OS !== 'web') {
  try {
    const moti = require('moti');
    MotiView = moti.MotiView;
  } catch (e) {
    console.warn('Moti not available, using fallback');
  }
}

// Fallback to regular View on web or if moti fails
if (!MotiView) {
  MotiView = View;
}

export { MotiView };
export default { MotiView };
