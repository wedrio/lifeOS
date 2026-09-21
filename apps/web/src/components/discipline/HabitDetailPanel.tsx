import { useMemo, type CSSProperties } from 'react';
import { Divider, Typography } from 'antd';
import type { Habit, HabitCheckIn, ISODate } from '@lifeos/shared';
import { buildMonthCalendar, calculateHabitStats, habitRollingWeeklyRates, isHabitDue, today } from '../../lib/dates';

const MILESTONES = [
  { days: 7, icon: '🌱', label: '7 天' },
  { days: 21, icon: '🔥', label: '21 天' },
  { days: 66, icon: '⚡', label: '66 天' },
  { days: 100, icon: '💎', label: '100 天' },
];

const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];

/** 习惯详情统计：当月月历 + 近 12 周滚动完成率曲线 + 里程碑徽章（docs/01 §2.1.1 v2.3） */
export function HabitDetailPanel({ habit, checkIns }: { habit: Habit; checkIns: HabitCheckIn[] }) {
  const reference = today();
  const stats = calculateHabitStats(habit, checkIns, reference);
  const longestDays = stats.streakUnit === 'week' ? stats.longestStreak * 7 : stats.longestStreak;

  const calendar = useMemo(() => buildMonthCalendar(reference), [reference]);
  const rates = useMemo(() => habitRollingWeeklyRates(habit, checkIns, reference), [habit, checkIns, reference]);

  const curve = useMemo(() => {
    const width = 280;
    const height = 64;
    const step = rates.length > 1 ? width / (rates.length - 1) : width;
    const points = rates.map((rate, index) => `${(index * step).toFixed(1)},${(height - 4 - (rate / 100) * (height - 8)).toFixed(1)}`);
    return { width, height, line: points.join(' '), area: `0,${height} ${points.join(' ')} ${width},${height}` };
  }, [rates]);

  const cellClass = (date: ISODate, inMonth: boolean) => {
    if (!inMonth) return 'out-month';
    if (date > reference) return 'future';
    const record = checkIns.find((item) => item.date === date);
    if (record?.state === 'skip') return 'skipped';
    if ((record?.count ?? 0) > 0) return 'done';
    return isHabitDue(habit, date) ? 'missed' : 'idle';
  };

  return <>
    <Divider style={{ margin: '22px 0 14px' }} />
    <Typography.Title level={4} style={{ marginTop: 0 }}>统计详情</Typography.Title>
    <div className="habit-detail">
      <div className="habit-detail-block">
        <Typography.Text type="secondary">{reference.slice(0, 7).replace('-', ' 年 ')} 月 · 月历</Typography.Text>
        <div className="habit-month-calendar" style={{ '--habit-color': habit.color } as CSSProperties}>
          {WEEKDAY_HEADERS.map((day) => <span key={day} className="calendar-head">{day}</span>)}
          {calendar.flat().map(({ date, inMonth }) => (
            <span key={date} className={`calendar-cell ${cellClass(date, inMonth)} ${date === reference ? 'today' : ''}`}>
              {Number(date.slice(8, 10))}
            </span>
          ))}
        </div>
        <div className="calendar-legend">
          <span><i className="done" />完成</span>
          <span><i className="skipped" />休息</span>
          <span><i className="missed" />未打</span>
          <span><i className="idle" />非打卡日</span>
        </div>
      </div>
      <div className="habit-detail-block">
        <Typography.Text type="secondary">近 12 周滚动完成率 · 本周 {rates[rates.length - 1] ?? 0}%</Typography.Text>
        <svg className="habit-rate-curve" viewBox={`0 0 ${curve.width} ${curve.height}`} role="img" aria-label="近 12 周完成率曲线">
          <polygon points={curve.area} fill={habit.color} opacity="0.12" />
          <polyline points={curve.line} fill="none" stroke={habit.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <div className="curve-axis"><span>12 周前</span><span>本周</span></div>
      </div>
      <div className="habit-detail-block">
        <Typography.Text type="secondary">里程碑徽章</Typography.Text>
        <div className="habit-badges">
          {MILESTONES.map((milestone) => {
            const achieved = longestDays >= milestone.days;
            return (
              <div key={milestone.days} className={`habit-badge ${achieved ? 'achieved' : ''}`} style={{ '--habit-color': habit.color } as CSSProperties} title={achieved ? `已达成连续 ${milestone.label}` : `连续 ${milestone.label} 后点亮`}>
                <span className="badge-icon">{achieved ? milestone.icon : '🔒'}</span>
                <span className="badge-label">{milestone.label}</span>
              </div>
            );
          })}
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>以最长连续 {longestDays} 天计算{stats.streakUnit === 'week' ? '（周连续 × 7 折算）' : ''}</Typography.Text>
      </div>
    </div>
  </>;
}
