import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  InputNumber,
  Modal,
  Radio,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from 'antd';
import { ClearOutlined, DownloadOutlined, InboxOutlined, SaveOutlined } from '@ant-design/icons';
import type { BackupImportMode, BackupPayload, Settings, SettingsInput } from '@lifeos/shared';
import { settingsInputSchema } from '@lifeos/shared';
import { dataSource } from '../data';
import { useUIStore, type ParticleDensity } from '../stores/uiStore';
import { webCapabilities } from '../platform/webCapabilities';
import { SpotlightCard } from '../components/ui';
import '../styles/settings.css';

type SettingsFormValues = SettingsInput;

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingImport, setPendingImport] = useState<BackupPayload | null>(null);
  const [importMode, setImportMode] = useState<BackupImportMode>('replace');
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm<SettingsFormValues>();
  const setTheme = useUIStore((state) => state.setTheme);
  const particlesEnabled = useUIStore((state) => state.particlesEnabled);
  const setParticlesEnabled = useUIStore((state) => state.setParticlesEnabled);
  const particlesDensity = useUIStore((state) => state.particlesDensity);
  const setParticlesDensity = useUIStore((state) => state.setParticlesDensity);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextSettings = await dataSource.settings.get();
      setSettings(nextSettings);
      form.setFieldsValue(nextSettings);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '设置加载失败');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = async (values: SettingsFormValues) => {
    const result = settingsInputSchema.safeParse(values);
    if (!result.success) return message.error(result.error.issues[0]?.message ?? '请检查设置');
    setSaving(true);
    try {
      const saved = await dataSource.settings.update(result.data);
      setSettings(saved);
      const appliedTheme = saved.theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : saved.theme;
      setTheme(appliedTheme);
      message.success('偏好已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    try {
      const backup = await dataSource.backup.exportData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
      await webCapabilities.saveFile(`lifeos-backup-${backup.exportedAt.slice(0, 10)}.json`, blob);
      message.success('备份文件已导出');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const readImport = async (file?: File) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!looksLikeBackup(parsed)) throw new Error('请选择由 lifeOS 导出的有效 JSON 备份文件');
      setPendingImport(parsed);
      setImportMode('replace');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '读取备份失败');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const importData = async () => {
    if (!pendingImport) return;
    setImporting(true);
    try {
      await dataSource.backup.importData(pendingImport, importMode);
      message.success(importMode === 'replace' ? '备份已恢复，当前 Mock 数据已替换' : '备份已合并到当前 Mock 数据');
      setPendingImport(null);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败，未修改现有数据');
    } finally {
      setImporting(false);
    }
  };

  const clearData = () =>
    Modal.confirm({
      title: '清空全部 Mock 数据？',
      content: '习惯、计划、纸质书架、账单、资产和日常记录都会被清除，且无法撤销。内置分类和账户会恢复为初始状态。',
      okText: '确认清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await dataSource.backup.clear();
        await load();
        message.success('Mock 数据已清空');
      },
    });

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>设置与备份</h1>
          <p>你的数据保存在本地 Mock 存储中，可随时导出、恢复或清空。</p>
        </div>
      </section>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="使用偏好" loading={loading}>
            <Form
              form={form}
              layout="vertical"
              onFinish={saveSettings}
              initialValues={{
                currency: 'CNY',
                theme: 'system',
                weekStartsOn: 1,
                autoRollOverIncompletePlans: true,
                annualReadingTarget: 12,
              }}
            >
              <Form.Item name="theme" label="界面主题">
                <Segmented
                  block
                  options={[
                    { label: '浅色', value: 'light' },
                    { label: '深色', value: 'dark' },
                    { label: '跟随系统', value: 'system' },
                  ]}
                />
              </Form.Item>

              <Form.Item name="currency" label="货币单位">
                <Select options={[{ label: '人民币（CNY）', value: 'CNY' }]} />
              </Form.Item>

              <Form.Item name="weekStartsOn" label="每周起始日">
                <Radio.Group
                  options={[
                    { label: '周一', value: 1 },
                    { label: '周日', value: 0 },
                  ]}
                />
              </Form.Item>

              <Form.Item name="annualReadingTarget" label="年度阅读目标 (本)">
                <InputNumber min={1} max={365} addonAfter="本 / 年" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="autoRollOverIncompletePlans" label="日计划自动结转" valuePropName="checked">
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />{' '}
                <Typography.Text type="secondary">
                  进入今天的计划时，自动结转昨天未完成的日计划
                </Typography.Text>
              </Form.Item>

              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                保存偏好
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="视觉与动效增强">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Typography.Text strong>动态粒子背景</Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    在背景中渲染呼吸浮游的微光粒子与连线
                  </Typography.Text>
                </div>
                <Switch
                  checked={particlesEnabled}
                  onChange={(checked) => setParticlesEnabled(checked)}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
              </div>

              {particlesEnabled && (
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 13, marginBottom: 6, display: 'block' }}>
                    粒子密度
                  </Typography.Text>
                  <Segmented<ParticleDensity>
                    block
                    value={particlesDensity}
                    onChange={(val) => setParticlesDensity(val)}
                    options={[
                      { label: '轻量 (省电)', value: 'low' },
                      { label: '标准', value: 'normal' },
                      { label: '丰富 (沉浸)', value: 'high' },
                    ]}
                  />
                </div>
              )}

              <Divider style={{ margin: '8px 0' }} />

              <div>
                <Typography.Text strong style={{ fontSize: 13 }}>
                  ⚡ 全局快捷键
                </Typography.Text>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, fontSize: 12 }}>
                  <div><kbd style={{ background: 'var(--glass-soft)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>T</kbd> 切换明暗主题</div>
                  <div><kbd style={{ background: 'var(--glass-soft)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>N</kbd> 记一笔账</div>
                  <div><kbd style={{ background: 'var(--glass-soft)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>H</kbd> 习惯打卡</div>
                  <div><kbd style={{ background: 'var(--glass-soft)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>M</kbd> 写一条日常</div>
                  <div><kbd style={{ background: 'var(--glass-soft)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>P</kbd> 行动计划</div>
                  <div><kbd style={{ background: 'var(--glass-soft)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>B</kbd> 纸质书架</div>
                </div>
              </div>
            </div>
          </Card>

          <Card title="当前数据概览" loading={loading} style={{ marginTop: 16 }}>
            {settings && (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="当前数据源">MockDataSource · localStorage</Descriptions.Item>
                <Descriptions.Item label="货币单位">{settings.currency}</Descriptions.Item>
                <Descriptions.Item label="主题偏好">
                  {settings.theme === 'system' ? '跟随系统' : settings.theme === 'dark' ? '深色' : '浅色'}
                </Descriptions.Item>
                <Descriptions.Item label="年度阅读目标">{settings.annualReadingTarget ?? 12} 本</Descriptions.Item>
                <Descriptions.Item label="计划自动结转">
                  {settings.autoRollOverIncompletePlans ? '已开启' : '已关闭'}
                </Descriptions.Item>
              </Descriptions>
            )}
            <Divider />
            <Alert type="info" showIcon message="接入真实数据库前，备份文件是本地数据的安全副本。" />
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="数据备份与恢复">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <SpotlightCard className="settings-action-card" spotlightColor="rgba(35, 141, 91, 0.16)">
                  <div className="settings-action">
                    <DownloadOutlined />
                    <h3>导出完整备份</h3>
                    <p>导出所有板块数据为可迁移的 JSON 文件。</p>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={() => void exportData()}>
                      导出 JSON
                    </Button>
                  </div>
                </SpotlightCard>
              </Col>
              <Col xs={24} md={8}>
                <SpotlightCard className="settings-action-card" spotlightColor="rgba(56, 189, 248, 0.16)">
                  <div className="settings-action">
                    <InboxOutlined />
                    <h3>导入备份</h3>
                    <p>读取 lifeOS JSON 文件后，选择替换或合并。</p>
                    <Button icon={<InboxOutlined />} onClick={() => inputRef.current?.click()}>
                      选择 JSON 文件
                    </Button>
                    <input
                      ref={inputRef}
                      className="visually-hidden"
                      type="file"
                      accept="application/json,.json"
                      onChange={(event) => void readImport(event.target.files?.[0])}
                    />
                  </div>
                </SpotlightCard>
              </Col>
              <Col xs={24} md={8}>
                <SpotlightCard className="settings-action-card" spotlightColor="rgba(248, 113, 113, 0.16)">
                  <div className="settings-action danger">
                    <ClearOutlined />
                    <h3>清空 Mock 数据</h3>
                    <p>保留内置分类与账户，其他数据恢复为空。</p>
                    <Button danger icon={<ClearOutlined />} onClick={clearData}>
                      清空数据
                    </Button>
                  </div>
                </SpotlightCard>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Modal
        open={Boolean(pendingImport)}
        title="确认导入备份"
        onCancel={() => setPendingImport(null)}
        onOk={importData}
        okText={importMode === 'replace' ? '确认替换并导入' : '确认合并'}
        okButtonProps={{ danger: importMode === 'replace' }}
        confirmLoading={importing}
      >
        <Typography.Paragraph>
          备份导出时间：{pendingImport?.exportedAt ? new Date(pendingImport.exportedAt).toLocaleString('zh-CN') : '—'}
        </Typography.Paragraph>
        <Radio.Group value={importMode} onChange={(event) => setImportMode(event.target.value)} style={{ width: '100%' }}>
          <Space direction="vertical">
            <Radio value="replace">
              <strong>替换当前数据</strong>
              <br />
              <Typography.Text type="secondary">用备份完整覆盖当前 Mock 数据。</Typography.Text>
            </Radio>
            <Radio value="merge">
              <strong>合并到当前数据</strong>
              <br />
              <Typography.Text type="secondary">按 ID 合并；同 ID 的备份数据将覆盖当前记录。</Typography.Text>
            </Radio>
          </Space>
        </Radio.Group>
      </Modal>
    </>
  );
}

function looksLikeBackup(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const backup = value as Partial<BackupPayload>;
  return backup.version === 1 && Boolean(backup.exportedAt) && Boolean(backup.data && typeof backup.data === 'object');
}
