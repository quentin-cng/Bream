import { decodeGameSave, encodeGameSave, type GameSnapshot } from './gameSaveSchema';

export const GAME_SAVE_FILES = {
  primary: 'bream-game-save.json',
  backup: 'bream-game-save.backup.json',
  primaryTemp: 'bream-game-save.tmp',
  backupTemp: 'bream-game-save.backup.tmp',
} as const;

export type GameSaveSource = 'primary' | 'backup' | 'none';

export type SaveFileStore = {
  readText: (name: string) => string | null;
  writeText: (name: string, contents: string) => void;
  replace: (sourceName: string, destinationName: string) => void;
  remove: (name: string) => void;
};

export function decodeGameSaveText(contents: string | null): GameSnapshot | null {
  if (contents === null) return null;
  try {
    return decodeGameSave(JSON.parse(contents));
  } catch {
    return null;
  }
}

export function selectRecoverableGameSave(
  primaryContents: string | null,
  backupContents: string | null,
): { snapshot: GameSnapshot | null; source: GameSaveSource } {
  const primary = decodeGameSaveText(primaryContents);
  if (primary) return { snapshot: primary, source: 'primary' };
  const backup = decodeGameSaveText(backupContents);
  return backup
    ? { snapshot: backup, source: 'backup' }
    : { snapshot: null, source: 'none' };
}

function safelyRead(store: SaveFileStore, name: string): string | null {
  try {
    return store.readText(name);
  } catch {
    return null;
  }
}

function replaceAtomically(
  store: SaveFileStore,
  temporaryName: string,
  destinationName: string,
  contents: string,
) {
  store.writeText(temporaryName, contents);
  store.replace(temporaryName, destinationName);
}

export function writeRecoverableGameSave(store: SaveFileStore, snapshot: GameSnapshot): void {
  const nextContents = JSON.stringify(encodeGameSave(snapshot));
  // Runtime validation protects this boundary even if an untyped caller passes malformed state.
  if (!decodeGameSaveText(nextContents)) throw new Error('Refusing to persist an invalid game save');

  const primaryContents = safelyRead(store, GAME_SAVE_FILES.primary);
  const backupContents = safelyRead(store, GAME_SAVE_FILES.backup);
  const validPrimary = decodeGameSaveText(primaryContents);
  const validBackup = decodeGameSaveText(backupContents);

  if (validPrimary && primaryContents !== null) {
    // Preserve the last known valid primary before publishing the new primary.
    replaceAtomically(store, GAME_SAVE_FILES.backupTemp, GAME_SAVE_FILES.backup, primaryContents);
  } else if (!validBackup) {
    // A first save (or two unusable files) still starts with a recoverable copy.
    replaceAtomically(store, GAME_SAVE_FILES.backupTemp, GAME_SAVE_FILES.backup, nextContents);
  }

  replaceAtomically(store, GAME_SAVE_FILES.primaryTemp, GAME_SAVE_FILES.primary, nextContents);
}

export function clearRecoverableGameSave(store: SaveFileStore): void {
  for (const name of Object.values(GAME_SAVE_FILES)) {
    store.remove(name);
  }
}
