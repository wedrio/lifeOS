import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { FinanceTransactionsPage } from './pages/FinanceTransactionsPage';
import { BudgetPage } from './pages/BudgetPage';
import { FinanceStatsPage } from './pages/FinanceStatsPage';
import { HabitsPage } from './pages/HabitsPage';
import { PlansPage } from './pages/PlansPage';
import { AssetsPage } from './pages/AssetsPage';
import { MomentsPage } from './pages/MomentsPage';
import { SettingsPage } from './pages/SettingsPage';


export function AppRoutes() {
  return <AppLayout><Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/discipline" element={<Navigate to="/discipline/habits" replace />} />
    <Route path="/discipline/habits" element={<HabitsPage />} />
    <Route path="/discipline/plans" element={<PlansPage />} />
    <Route path="/finance" element={<Navigate to="/finance/transactions" replace />} />
    <Route path="/finance/transactions" element={<FinanceTransactionsPage />} />
    <Route path="/finance/budget" element={<BudgetPage />} />
    <Route path="/finance/stats" element={<FinanceStatsPage />} />
    <Route path="/assets" element={<AssetsPage />} />
    <Route path="/moments" element={<MomentsPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppLayout>;
}
