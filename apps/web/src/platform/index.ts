import type { PlatformCapabilities } from '@lifeos/shared';
import { webCapabilities } from './webCapabilities';
import { tauriCapabilities } from './tauriCapabilities';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function getPlatformCapabilities(): PlatformCapabilities {
  return isTauri() ? tauriCapabilities : webCapabilities;
}
