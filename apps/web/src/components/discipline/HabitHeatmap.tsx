import { useMemo, type CSSProperties } from 'react';
import { Tooltip, Typography } from 'antd';
import type { Habit, HabitCheckIn, ISODate } from '@lifeos/shared';
import { buildHeatmap, calculateHabitStats, isHabitDue, today } from '../../lib/dates';

/** 按当日完成次数相对目标折算为 0-3 档颜色（0=未打卡） */
function cellLevel(count: number, dailyTarget: number): number {
  if (count <= 0) return 0;
  return Math.min(3, Math.max(1, Math.round((count / Math.max(dailyTarget, 1)) * 3)));
}

export function HabitHeatmap({ habit, checkIns, onToggle }: { habit: Habit; checkIns: HabitCheckIn[]; onToggle: (date: ISODate) => void }) {
  const reference = today();
  const recordByDate = useMemo(() => {
    const map = new Map<ISODate, HabitCheckIn>();
    checkIns.forEach((item) => map.set(item.date, item));
    return map;
  }, [checkIns]);
  const stats = calculateHabitStats(habit, checkIns, reference);
  const weeks = useMemo(() => buildHeatmap(reference), [reference]);
  const dailyTarget = habit.frequency === 'daily' ? habit.timesPerPeriod : 1;

  // 月份标签：月份首次出现的周列标注「N月」（GitHub 风格）
  const monthLabels = useMemo(() => {
    let lastMonth = '';
    return weeks.map((week) => {
      const first = week.find((cell) => cell.inRange);
      if (!first) return '';
      const month = first.date.slice(0, 7);
      if (month === lastMonth) return '';
      lastMonth = month;
      return `${Number(month.slice(5, 7))}月`;
    });
  }, [weeks]);

  return <>
    <div className="heatmap-heading"><div><Typography.Title level={4} style={{ margin: 0 }}>坚持轨迹</Typography.Title><Typography.Text type="secondary">点击日期可打卡或取消；补打规则仍会生效</Typography.Text></div><Typography.Text type="secondary">近一年 · 共 {stats.totalCheckIns} 次</Typography.Text></div>
    <div className="heatmap-grid-wrap" style={{ '--habit-color': habit.color } as CSSProperties}>
      <div className="heatmap-months" aria-hidden="true">
        {monthLabels.map((label, index) => <span key={index} className="heatmap-month-label">{label}</span>)}
      </div>
      <div className="heatmap-grid" aria-label={`${habit.name} 近一年打卡热力图`}>
        {weeks.flat().map(({ date, inRange }) => {
          const record = recordByDate.get(date);
          const skipped = record?.state === 'skip';
          const count = skipped ? 0 : record?.count ?? 0;
          const level = cellLevel(count, dailyTarget);
          const tooltip = !inRange ? '' : skipped
            ? `${date} · 休息日 🛌`
            : count > 0
              ? `${date} · 已完成 ${count}${dailyTarget > 1 ? `/${dailyTarget}` : ''} 次${record?.note ? ` · ${record.note}` : ''}`
              : isHabitDue(habit, date) ? `${date} · 未打卡` : `${date} · 非打卡日`;
          return <Tooltip key={date} title={tooltip}><button
            type="button"
            aria-label={`${date}${skipped ? '，休息日' : count > 0 ? `，已完成 ${count} 次` : '，未完成'}`}
            disabled={!inRange}
            className={`heatmap-cell ${skipped ? 'skipped' : level > 0 ? `level-${level}` : ''} ${date === reference ? 'today' : ''} ${!inRange ? 'outside' : ''}`}
            onClick={() => onToggle(date)}
          /></Tooltip>;
        })}
      </div>
    </div>
    <div className="heatmap-legend"><span>少</span><i /><i className="level-1" /><i className="level-2" /><i className="level-3" /><span>多</span>{dailyTarget > 1 && <span className="heatmap-legend-note">（颜色深浅 = 当日完成 {dailyTarget} 次中的次数）</span>}</div>
  </>;
}
