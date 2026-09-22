import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Skeleton, Typography, message } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import type { Seed } from '@lifeos/shared';
import { useNavigate } from 'react-router-dom';
import { dataSource } from '../../data';
import { today } from '../../lib/dates';
import { KIND_META } from './SeedCard';

/** 首页种草入口摘要卡：统计 + 最近长草 + 跳转完整清单 */
export function SeedSummaryCard() {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSeeds(await dataSource.seeds.list());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '种草清单加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const growing = seeds.filter((item) => item.status === 'growing');
  const month = today().slice(0, 7);
  const pulledThisMonth = seeds.filter((item) => item.status === 'pulled' && (item.settledAt ?? '').startsWith(month)).length;
  const recent = growing.slice(0, 3);

  return (
    <Card
      title="种草清单"
      extra={(
        <Button type="link" onClick={() => navigate('/seeds')}>
          进入清单 <RightOutlined style={{ fontSize: 10 }} />
        </Button>
      )}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <>
          <Typography.Text type="secondary">
            长草 {growing.length} 棵 · 本月拔草 {pulledThisMonth} 棵
          </Typography.Text>
          {recent.length ? (
            <div className="dashboard-seed-summary-list">
              {recent.map((seed) => (
                <button type="button" className="dashboard-seed-summary-row" key={seed.id} onClick={() => navigate('/seeds')}>
                  <span aria-hidden>{KIND_META[seed.kind].emoji}</span>
                  <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>{seed.title}</Typography.Text>
                  <span>›</span>
                </button>
              ))}
            </div>
          ) : (
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              {seeds.length ? '花园暂时空着，去逛逛吧 🌱' : '花园空空的，刷到好东西就来种一棵 🌱'}
            </Typography.Paragraph>
          )}
        </>
      )}
    </Card>
  );
}
