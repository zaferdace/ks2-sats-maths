// Saving a backup file from the iPad: the share sheet (Save to Files) where it exists, else a download.
import type { StoreData } from '../store/model';
import { backupFileName } from '../store/persist';

export type BackupResult = 'shared' | 'downloaded' | 'cancelled';

export async function saveBackupFile(json: string): Promise<BackupResult> {
  const file = new File([json], backupFileName(), { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'KS2 SATs backup' });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancelled';
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const restoredMessage = (incoming: StoreData): string => {
  const skipped = incoming.unreadable?.length ?? 0;
  return (
    `Restored ${plural(incoming.attempts.length, 'paper')} and ${plural(incoming.profiles.length, 'profile')} (merged with what was here).` +
    (skipped ? ` ${plural(skipped, 'item')} from a newer version of the app will be read after the next update.` : '')
  );
};
