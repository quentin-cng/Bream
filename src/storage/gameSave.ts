import { File, Paths } from 'expo-file-system';

import type { GameSnapshot } from './gameSaveSchema';
import {
  clearRecoverableGameSave,
  GAME_SAVE_FILES,
  selectRecoverableGameSave,
  writeRecoverableGameSave,
  type SaveFileStore,
} from './gameSaveRecovery';

const fileFor = (name: string) => new File(Paths.document, name);

const fileStore: SaveFileStore = {
  readText(name) {
    const file = fileFor(name);
    return file.exists ? file.textSync() : null;
  },
  writeText(name, contents) {
    const file = fileFor(name);
    file.create({ overwrite: true });
    file.write(contents);
  },
  replace(sourceName, destinationName) {
    fileFor(sourceName).moveSync(fileFor(destinationName), { overwrite: true });
  },
  remove(name) {
    const file = fileFor(name);
    if (file.exists) file.delete();
  },
};

export async function loadGameSave(): Promise<GameSnapshot | null> {
  let primary: string | null = null;
  let backup: string | null = null;
  try { primary = fileStore.readText(GAME_SAVE_FILES.primary); } catch { /* try recovery */ }
  try { backup = fileStore.readText(GAME_SAVE_FILES.backup); } catch { /* fall back safely */ }
  return selectRecoverableGameSave(primary, backup).snapshot;
}

export function saveGameState(snapshot: GameSnapshot): void {
  writeRecoverableGameSave(fileStore, snapshot);
}

export function clearGameSave(): void {
  clearRecoverableGameSave(fileStore);
}
