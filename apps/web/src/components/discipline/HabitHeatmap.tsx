import { useMemo, type CSSProperties } from 'react';
import { Tooltip, Typography } from 'antd';
import type { Habit, HabitCheckIn, ISODate } from '@lifeos/shared';
import { buildHeatmap, calculateHabitStats, today } from '../../lib/dates';

export function HabitHeatmap({ habit, checkIns, onToggle }: { habit: Habit; checkIns: HabitCheckIn[]; onToggle: (date: ISODate) => void }) {
  const reference = today();
  const checkedDates = useMemo(() => new Set(checkIns.map((item) => item.date)), [checkIns]);
  const stats = calculateHabitStats(habit, checkIns, reference);
  const weeks = useMemo(() => buildHeatmap(reference), [reference]);

  return <>
    <div className="heatmap-heading"><div><Typography.Title level={4} style={{ margin: 0 }}>坚持轨迹</Typography.Title><Typography.Text type="secondary">点击日期可打卡或取消；补打规则仍会生效</Typography.Text></div><Typography.Text type="secondary">近一年 · 共 {stats.totalCheckIns} 次</Typography.Text></div>
    <div className="heatmap-grid-wrap" style={{ '--habit-color': habit.color } as CSSProperties}>
      <div className="heatmap-grid" aria-label={`${habit.name} 近一年打卡热力图`}>
        {weeks.flat().map(({ date, inRange }) => {
          const checked = checkedDates.has(date);
          return <Tooltip key={date} title={inRange ? `${date}${checked ? ' · 已完成' : ' · 未打卡'}` : ''}><button type="button" aria-label={`${date}${checked ? '，已完成' : '，未完成'}`} disabled={!inRange} className={`heatmap-cell ${checked ? 'checked' : ''} ${!inRange ? 'outside' : ''}`} onClick={() => onToggle(date)} /></Tooltip>;
        })}
      </div>
    </div>
    <div className="heatmap-legend"><span>少</span><i /><i style={{ opacity: .4, background: habit.color }} /><i style={{ opacity: .7, background: habit.color }} /><i /><span>多</span></div>
  </>;
}
