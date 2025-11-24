// Polyfill for tslib to fix web compatibility issues
if (typeof window !== 'undefined') {
  const tslib = require('tslib');
  
  // Ensure default export is properly structured
  if (tslib && !tslib.default) {
    tslib.default = tslib;
  }
  
  // Export all tslib helpers
  if (typeof global !== 'undefined') {
    global.__tslib = tslib;
  }
}
