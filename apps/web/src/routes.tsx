import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { FeaturePlaceholder } from './pages/FeaturePlaceholder';
import { FinanceTransactionsPage } from './pages/FinanceTransactionsPage';
import { BudgetPage } from './pages/BudgetPage';
import { FinanceStatsPage } from './pages/FinanceStatsPage';

const features = {
  habits: { emoji: '🎯', title: '习惯打卡', description: '建立习惯、完成打卡并看见坚持的轨迹。', nextStage: 'A2 · 自律闭环' },
  plans: { emoji: '🗓️', title: '四级计划', description: '从年度目标拆解到每一天的具体行动。', nextStage: 'A2 · 自律闭环' },
  transactions: { emoji: '💰', title: '账单流水', description: '记录每一笔收支，清楚掌握资金流向。', nextStage: 'A1 · 记账闭环' },
  budget: { emoji: '📊', title: '预算管理', description: '为本月和分类设置可执行的花钱边界。', nextStage: 'A1 · 记账闭环' },
  stats: { emoji: '📈', title: '财务报表', description: '用趋势和占比回顾每个月的收支。', nextStage: 'A1 · 记账闭环' },
  assets: { emoji: '📦', title: '资产登记', description: '管理实物设备、订阅与即将到期的提醒。', nextStage: 'A3 · 资产闭环' },
  moments: { emoji: '📔', title: '记录日常', description: '用文字与图片留住日常生活的瞬间。', nextStage: 'A4 · 日常闭环' },
  settings: { emoji: '⚙️', title: '设置与备份', description: '管理主题、偏好与未来的数据备份。', nextStage: 'A5 · 主面板与备份' },
};

export function AppRoutes() {
  return <AppLayout><Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/discipline/habits" element={<FeaturePlaceholder {...features.habits} />} />
    <Route path="/discipline/plans" element={<FeaturePlaceholder {...features.plans} />} />
    <Route path="/finance" element={<Navigate to="/finance/transactions" replace />} />
    <Route path="/finance/transactions" element={<FinanceTransactionsPage />} />
    <Route path="/finance/budget" element={<BudgetPage />} />
    <Route path="/finance/stats" element={<FinanceStatsPage />} />
    <Route path="/assets" element={<FeaturePlaceholder {...features.assets} />} />
    <Route path="/moments" element={<FeaturePlaceholder {...features.moments} />} />
    <Route path="/settings" element={<FeaturePlaceholder {...features.settings} />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppLayout>;
}
