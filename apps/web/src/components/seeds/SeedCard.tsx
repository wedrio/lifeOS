import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Dropdown, Empty, Popconfirm, Segmented, Space, Tag, Typography, message } from 'antd';
import { DownOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import type { Seed, SeedEffort, SeedStatus } from '@lifeos/shared';
import { dataSource } from '../../data';
import { daysBetween, today } from '../../lib/dates';
import { SeedFormModal } from './SeedFormModal';

export const KIND_META: Record<Seed['kind'], { emoji: string; label: string }> = {
  video: { emoji: '📺', label: '视频' },
  article: { emoji: '📰', label: '文章' },
  tool: { emoji: '🧰', label: '工具' },
  tutorial: { emoji: '📖', label: '教程' },
};
const EFFORT_LABEL: Record<SeedEffort, string> = {
  m5: '≈5 分钟',
  m15: '≈15 分钟',
  m30: '≈30 分钟',
  m60: '1 小时+',
};
const STATUS_META: Record<SeedStatus, { label: string; emoji: string }> = {
  growing: { label: '长草', emoji: '🌱' },
  pulled: { label: '拔草', emoji: '🌿' },
  abandoned: { label: '弃坑', emoji: '🥀' },
};
const EFFORT_FILTERS: Array<{ label: string; value: SeedEffort | 'all' }> = [
  { label: '我有 5 分钟', value: 'm5' },
  { label: '我有 15 分钟', value: 'm15' },
  { label: '我有 30 分钟', value: 'm30' },
  { label: '我有大把时间', value: 'm60' },
  { label: '随便逛逛', value: 'all' },
];

/** 长草天数文案：>30 天标红提示"该捞一下了"，7~30 天灰字，<7 天不显示 */
function growingBadge(seed: Seed): { text: string; stale: boolean } | null {
  if (seed.status !== 'growing') return null;
  const days = daysBetween(seed.createdAt.slice(0, 10), today());
  if (days < 7) return null;
  return days > 30 ? { text: `长草 ${days} 天 🥀`, stale: true } : { text: `长草 ${days} 天`, stale: false };
}

export function SeedCard() {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<SeedStatus>('growing');
  const [effort, setEffort] = useState<SeedEffort | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Seed | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const rows = useMemo(() => seeds
    .filter((item) => item.status === view)
    .filter((item) => effort === 'all' || item.effort === effort), [seeds, view, effort]);

  const settle = async (seed: Seed, status: Extract<SeedStatus, 'pulled' | 'abandoned'>) => {
    try {
      await dataSource.seeds.update(seed.id, { status, settledAt: today() });
      message.success(status === 'pulled' ? '拔掉了，真痛快！🌿' : '弃坑了，放下也挺好');
      await reload();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const remove = async (seed: Seed) => {
    try {
      await dataSource.seeds.remove(seed.id);
      message.success('连根除掉了');
      await reload();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const month = today().slice(0, 7);
  const stats = {
    growing: seeds.filter((item) => item.status === 'growing').length,
    pulledThisMonth: seeds.filter((item) => item.status === 'pulled' && (item.settledAt ?? '').startsWith(month)).length,
    abandoned: seeds.filter((item) => item.status === 'abandoned').length,
  };

  return (
    <Card
      extra={(
        <Space size={8} wrap>
          <Segmented
            size="small"
            value={effort}
            onChange={(value) => setEffort(value as SeedEffort | 'all')}
            options={EFFORT_FILTERS}
          />
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => { setEditing(undefined); setFormOpen(true); }}
          >
            种一棵
          </Button>
        </Space>
      )}
    >
      <div className="dashboard-seed-toolbar">
        <Segmented
          size="small"
          value={view}
          onChange={(value) => { setView(value as SeedStatus); setExpandedId(null); }}
          options={(Object.keys(STATUS_META) as SeedStatus[]).map((status) => ({
            label: `${STATUS_META[status].emoji} ${STATUS_META[status].label}`,
            value: status,
          }))}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          长草 {stats.growing} · 本月拔草 {stats.pulledThisMonth} · 弃坑 {stats.abandoned}
        </Typography.Text>
      </div>

      {loading ? (
        <Typography.Text type="secondary">正在翻花园……</Typography.Text>
      ) : rows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            view === 'growing' && effort !== 'all'
              ? '这个空档没有合适的草，换一档试试，或者去种一棵 🌱'
              : view === 'growing'
                ? '花园空空的，刷到好东西就来种一棵 🌱'
                : `还没有${STATUS_META[view].label}的草`
          }
        />
      ) : (
        <div className="dashboard-seed-list">
          {rows.map((seed) => {
            const kind = KIND_META[seed.kind];
            const badge = growingBadge(seed);
            const expanded = expandedId === seed.id;
            return (
              <div className="dashboard-seed-row" key={seed.id}>
                <span className="dashboard-seed-kind" title={kind.label}>{kind.emoji}</span>
                <div className="dashboard-seed-body">
                  <button type="button" className="dashboard-seed-title" onClick={() => setExpandedId(expanded ? null : seed.id)}>
                    <Typography.Text strong ellipsis style={{ fontSize: 14 }}>{seed.title}</Typography.Text>
                    <DownOutlined className={`dashboard-seed-caret ${expanded ? 'is-open' : ''}`} />
                  </button>
                  <div className="dashboard-seed-meta">
                    <Tag style={{ marginInlineEnd: 0 }}>{EFFORT_LABEL[seed.effort]}</Tag>
                    {badge && (
                      <span className={`dashboard-seed-age ${badge.stale ? 'is-stale' : ''}`}>{badge.text}</span>
                    )}
                    {view !== 'growing' && seed.settledAt && (
                      <span className="dashboard-seed-age">{view === 'pulled' ? '拔于 ' : '弃于 '}{seed.settledAt}</span>
                    )}
                  </div>
                  {expanded && (
                    <div className="dashboard-seed-detail">
                      {seed.note && <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>{seed.note}</Typography.Paragraph>}
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        种于 {seed.createdAt.slice(0, 10)}
                        {seed.url && <> · <a href={seed.url} target="_blank" rel="noreferrer">打开链接</a></>}
                      </Typography.Text>
                    </div>
                  )}
                </div>
                {view === 'growing' && (
                  <Button size="small" type="primary" ghost onClick={() => void settle(seed, 'pulled')}>拔一棵</Button>
                )}
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      { key: 'edit', label: '编辑' },
                      ...(view === 'growing' ? [{ key: 'abandon', label: <Popconfirm title="确定弃坑？这棵草就枯了 🥀" onConfirm={() => void settle(seed, 'abandoned')}>弃坑</Popconfirm> }] : []),
                      { type: 'divider' as const },
                      { key: 'remove', label: <Popconfirm title="连根除掉这棵草？" onConfirm={() => void remove(seed)}><span style={{ color: '#db5161' }}>删除</span></Popconfirm> },
                    ],
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation();
                      if (key === 'edit') { setEditing(seed); setFormOpen(true); }
                    },
                  }}
                >
                  <Button size="small" type="text" icon={<MoreOutlined />} aria-label="更多操作" />
                </Dropdown>
              </div>
            );
          })}
        </div>
      )}

      <SeedFormModal seed={editing} open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} />
    </Card>
  );
}
