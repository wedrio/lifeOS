/**
 * 运行平台判断。
 *
 * 仅用于区分「移动外壳」（Android/iOS WebView）与桌面/浏览器，以便选择更合适的
 * 平台能力实现（例如 Android 的文件选择应走 WebView 原生 `<input type="file">`
 * 而非桌面 Tauri 的 dialog + fs）。
 */
export function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}
