const isTauri = '__TAURI_INTERNALS__' in window;

export const deviceIdentifier = {
  isWeb: !isTauri,
};
