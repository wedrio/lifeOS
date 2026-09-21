import { dataSource } from '../data';
import { getPlatformCapabilities } from '../platform';
import { isHabitDue, today } from './dates';

/**
 * 习惯提醒调度器（docs/01 §2.1.1 v2.3）：
 * - 启动时检查一次：已过提醒时间、今日需要打卡且未完成/未休息的习惯立即提醒
 * - 运行中每 30 秒轮询：到达 reminderTime 的当分钟触发
 * - 每个习惯每天最多提醒一次（内存去重）
 * 返回清理函数；桌面端通知经 PlatformCapabilities 走系统通知/托盘。
 */
export function startHabitReminderScheduler(): () => void {
  let stopped = false;
  const notified = new Set<string>();

  const check = async () => {
    if (stopped) return;
    try {
      const habits = await dataSource.habits.list();
      if (habits.length === 0) return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const date = today();
      await Promise.all(habits.map(async (habit) => {
        if (!habit.reminderTime || habit.archived || habit.reminderTime > hhmm) return;
        if (!isHabitDue(habit, date)) return;
        const key = `${habit.id}:${date}`;
        if (notified.has(key)) return;
        const records = await dataSource.habits.listCheckIns(habit.id, date, date);
        const settled = records.some((item) => item.state === 'skip' || (item.count ?? 1) > 0);
        if (settled) { notified.add(key); return; }
        notified.add(key);
        await getPlatformCapabilities().notify({
          title: `⏰ 该打卡了：${habit.icon} ${habit.name}`,
          body: habit.frequency === 'daily' && habit.timesPerPeriod > 1 ? '今天的打卡目标还没完成，坚持就是胜利！' : '坚持就是胜利，去完成今天的打卡吧！',
        });
      }));
    } catch { /* 提醒失败静默，不打扰用户 */ }
  };

  const timer = window.setInterval(() => void check(), 30_000);
  void check();
  return () => { stopped = true; window.clearInterval(timer); };
}
