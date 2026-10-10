import type { PlatformCapabilities, SharePayload } from '@lifeos/shared';
import { pickImagesFromInput } from './pickImages';

export const webCapabilities: PlatformCapabilities = {
  async notify({ title, body }) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') await Notification.requestPermission();
    if (Notification.permission === 'granted') new Notification(title, { body });
  },
  async pickImages(max, options) {
    return pickImagesFromInput(max, options);
  },
  async saveFile(filename, blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  },
  async share(content: SharePayload) {
    if (navigator.share) await navigator.share({ text: content.text, url: content.images?.[0] });
  },
  async receiveShare() {
    return null;
  },
  async biometricUnlock() {
    return false;
  },
  onShortcut() {
    // Global shortcuts belong to desktop/mobile shells; the web intentionally has no equivalent.
  },
  async updateCheck() {
    // Browser deployments update on refresh.
  },
};
