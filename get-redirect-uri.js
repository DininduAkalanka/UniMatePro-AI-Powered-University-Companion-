// Script to get redirect URIs for your app
const { makeRedirectUri } = require('expo-auth-session');

console.log('\n📱 Redirect URIs for UniMate App:\n');

// Default (Expo Go)
const expoGoUri = makeRedirectUri();
console.log('Expo Go Development:', expoGoUri);

// With custom scheme
const customSchemeUri = makeRedirectUri({ 
  scheme: 'unimatemobile',
  native: 'unimatemobile://'
});
console.log('Custom Scheme:', customSchemeUri);

// Production build
const productionUri = makeRedirectUri({
  scheme: 'unimatemobile',
  native: 'unimatemobile://',
  isTripleSlashed: true
});
console.log('Production:', productionUri);

console.log('\n✅ Add these URIs to Google Cloud Console:\n');
console.log('1.', expoGoUri);
console.log('2. unimatemobile://');
console.log('3. exp://192.168.8.175:8081');
console.log('4. exp://localhost:8081');
console.log('\n');
