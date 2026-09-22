import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AppLayout } from './layout/AppLayout';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { DashboardPage } from './pages/DashboardPage';
import { FinanceTransactionsPage } from './pages/FinanceTransactionsPage';
import { BudgetPage } from './pages/BudgetPage';
import { FinanceStatsPage } from './pages/FinanceStatsPage';
import { HabitsPage } from './pages/HabitsPage';
import { PlansPage } from './pages/PlansPage';
import { ReadingPage } from './pages/ReadingPage';
import { AssetsPage } from './pages/AssetsPage';
import { MomentsPage } from './pages/MomentsPage';
import { SeedsPage } from './pages/SeedsPage';
import { SettingsPage } from './pages/SettingsPage';

export function AppRoutes() {
  const location = useLocation();
  useGlobalShortcuts();

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={{ width: '100%', minHeight: '100%' }}
        >
          <Routes location={location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/discipline" element={<Navigate to="/discipline/habits" replace />} />
            <Route path="/discipline/habits" element={<HabitsPage />} />
            <Route path="/discipline/plans" element={<PlansPage />} />
            <Route path="/discipline/reading" element={<ReadingPage />} />
            <Route path="/finance" element={<Navigate to="/finance/transactions" replace />} />
            <Route path="/finance/transactions" element={<FinanceTransactionsPage />} />
            <Route path="/finance/budget" element={<BudgetPage />} />
            <Route path="/finance/stats" element={<FinanceStatsPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/moments" element={<MomentsPage />} />
            <Route path="/seeds" element={<SeedsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
}
