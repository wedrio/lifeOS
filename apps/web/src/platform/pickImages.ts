export interface PickImagesFromInputOptions {
  /** 直接调起相机拍照（此时忽略多选）。 */
  capture?: boolean;
}

/**
 * 通过隐藏的 `<input type="file">` 选择图片，返回 `Blob[]`。
 *
 * 浏览器与 Android WebView（Tauri/WRY）都支持该方式：WRY 的
 * `RustWebChromeClient.onShowFileChooser` 会接管选择器，`capture` 属性会调起
 * 系统相机（`ACTION_IMAGE_CAPTURE`），不带则走文件/相册选择器。相比桌面端的
 * `dialog.open` + `fs.readFile`，它不涉及 SAF `content://` URI，因此在 Android
 * 上更可靠。
 */
export function pickImagesFromInput(max: number, options?: PickImagesFromInputOptions): Promise<Blob[]> {
  return new Promise<Blob[]>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = !options?.capture && max > 1;
    if (options?.capture) input.setAttribute('capture', 'environment');
    input.onchange = () => resolve(Array.from(input.files ?? []).slice(0, max));
    input.click();
  });
}
