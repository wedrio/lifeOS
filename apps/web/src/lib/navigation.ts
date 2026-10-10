import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';

/**
 * 应用内导航封装：默认使用 `replace`，避免历史栈随导航不断累积。
 *
 * Android 上侧滑返回等价于 `history.back()`（Tauri/WRY 的 `WryActivity` 在
 * WebView 可回退时调用 `goBack()`）。若每次页面/功能切换都 push 历史，用户
 * 点击多个功能后需要连续侧滑多次才能退出应用。本项目页面均为平级主入口
 * （无详情子页），故统一 `replace`：历史深度恒定，侧滑一次即可退出。
 */
export function useAppNavigate() {
  const navigate = useNavigate();
  return (to: To, options?: NavigateOptions) => navigate(to, { replace: true, ...options });
}
