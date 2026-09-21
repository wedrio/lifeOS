import type { PlatformCapabilities, SharePayload } from '@lifeos/shared';

/**
 * Platform capabilities backed by the Tauri 2 desktop shell.
 * All Tauri imports are dynamic so this module only loads inside the shell.
 */

type FsPlugin = typeof import('@tauri-apps/plugin-fs');
type DialogPlugin = typeof import('@tauri-apps/plugin-dialog');
type NotificationPlugin = typeof import('@tauri-apps/plugin-notification');

async function tauriApi() {
  return import('@tauri-apps/api/core');
}

async function loadPlugins() {
  const [fs, dialog, notification] = await Promise.all([
    import('@tauri-apps/plugin-fs') as Promise<FsPlugin>,
    import('@tauri-apps/plugin-dialog') as Promise<DialogPlugin>,
    import('@tauri-apps/plugin-notification') as Promise<NotificationPlugin>,
  ]);
  return { fs, dialog, notification };
}

async function saveBlob(filename: string, blob: Blob): Promise<string> {
  const { dialog, fs } = await loadPlugins();
  const path = await dialog.save({
    defaultPath: filename,
    filters: [{ name: 'All Files', extensions: ['*'] }],
  });
  if (!path) throw new Error('cancelled');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(path, bytes);
  return path;
}

export const tauriCapabilities: PlatformCapabilities = {
  async notify({ title, body }) {
    const { notification } = await loadPlugins();
    const granted = await notification.isPermissionGranted()
      ? true
      : await notification.requestPermission();
    if (granted) await notification.sendNotification({ title, body });
  },
  async pickImages(max) {
    const { dialog, fs } = await loadPlugins();
    const paths = await dialog.open({
      multiple: max > 1,
      directory: false,
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }],
    });
    if (!paths) return [];
    const selected = (Array.isArray(paths) ? paths : [paths]).slice(0, max) as string[];
    return Promise.all(
      selected.map(async (path) => {
        const bytes = await fs.readFile(path);
        return new Blob([bytes as unknown as BlobPart], { type: 'image/*' });
      }),
    );
  },
  async saveFile(filename, blob) {
    await saveBlob(filename, blob);
  },
  async share(content: SharePayload) {
    // Desktop shell has no system share sheet yet; copy text to clipboard as a fallback.
    if (content.text) {
      await navigator.clipboard.writeText(content.text);
    }
  },
  async receiveShare() {
    return null;
  },
  async biometricUnlock() {
    // Windows Hello integration is deferred; password entry still works.
    return false;
  },
  onShortcut(callback: (action: string) => void) {
    void (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      await listen<{ action: string }>('global-shortcut', (event) => {
        callback(event.payload.action);
      });
    })();
  },
  async updateCheck() {
    // Auto-update via tauri-plugin-updater is deferred to a later iteration.
    void tauriApi;
  },
};
