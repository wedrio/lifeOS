import { useEffect, useRef } from 'react';

/**
 * Android 硬件返回键兼容层。
 *
 * Android WebView（Tauri/WRY）中返回键等价于 `history.back()`：`WryActivity`
 * 在 WebView 可回退时调用 `goBack()`，否则退出应用。由于本项目用 HashRouter，
 * 每次路由跳转都会产生一条历史记录，因此「关闭最上层弹层」需要在其上方临时
 * 压入一条**同 URL** 的守卫记录：
 *
 * - 弹层打开 → pushState 一条与当前完全相同的 URL（含 hash）的守卫记录，
 *   HashRouter 的 hashchange 不触发，故不会产生路由跳转；
 * - 用户按返回键 → 触发 popstate，弹出栈顶并关闭对应弹层；
 * - 用户从 UI 关闭弹层 → 主动 `history.back()` 移除守卫记录，并用计数器
 *   `expectedPops` 标记这次「程序性后退」，避免误关其它弹层。
 *
 * 用法：`useBackDismiss(open, onClose)`（条件渲染的弹层可传 `true`）。
 */

type CloseFn = () => void;

interface GuardEntry {
  id: number;
  close: CloseFn;
}

const stack: GuardEntry[] = [];
let seq = 0;
let expectedPops = 0;

function handlePopState() {
  if (expectedPops > 0) {
    expectedPops -= 1;
    return;
  }
  const top = stack.pop();
  if (top) top.close();
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', handlePopState);
}

export function useBackDismiss(open: boolean, onClose: CloseFn): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const id = ++seq;
    stack.push({ id, close: () => closeRef.current() });

    // 压入一条与当前 URL 完全一致的守卫记录（保留 Router 写入的 state）
    window.history.pushState(
      { ...(window.history.state as Record<string, unknown> | null), __lifeosBackGuard: id },
      '',
      window.location.href,
    );

    return () => {
      const index = stack.findIndex((entry) => entry.id === id);
      if (index === -1) return; // 已被返回键消费，无需再处理
      stack.splice(index, 1);
      const state = window.history.state as Record<string, unknown> | null;
      if (state && state.__lifeosBackGuard === id) {
        expectedPops += 1;
        window.history.back();
      }
    };
  }, [open]);
}
