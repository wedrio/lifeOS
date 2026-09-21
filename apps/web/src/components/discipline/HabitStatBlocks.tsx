import type { Habit, HabitCheckIn } from '@lifeos/shared';
import { calculateHabitStats } from '../../lib/dates';

export function HabitStatBlocks({ habit, checkIns }: { habit: Habit; checkIns: HabitCheckIn[] }) {
  const stats = calculateHabitStats(habit, checkIns);
  const unit = stats.streakUnit === 'week' ? '周' : '天';
  return <div className="habit-stats"><div className="habit-stat"><strong>🔥 {stats.currentStreak}</strong><span>当前连续（{unit}）</span></div><div className="habit-stat"><strong>{stats.longestStreak}</strong><span>最长连续（{unit}）</span></div><div className="habit-stat"><strong>{stats.totalCheckIns}</strong><span>累计完成</span></div><div className="habit-stat"><strong>{stats.recent30Rate}%</strong><span>近 30 天</span></div></div>;
}
