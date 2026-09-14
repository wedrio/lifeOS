import { useEffect, useState } from 'react';
import { Button, Form, Image, Input, Modal, Select, message } from 'antd';
import { CloseOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import type { EntityLink, Moment, MomentInput } from '@lifeos/shared';
import { momentInputSchema } from '@lifeos/shared';
import { dataSource } from '../../data';
import { optimizeImageForLocalStorage } from '../../lib/images';
import { webCapabilities } from '../../platform/webCapabilities';

export interface MomentLinkOption { value: string; label: string; }
interface MomentFormValues { content: string; mood?: string; weather?: string; location?: string; tags?: string; links?: string[]; }

const moods = ['😊', '🥳', '😌', '😔', '😤', '🤩', '😴'];
const weathers = ['☀️', '🌤️', '☁️', '🌧️', '⛈️', '❄️', '🌫️'];

export function MomentFormModal({ moment, linkOptions, open, onClose, onSaved }: { moment?: Moment; linkOptions: MomentLinkOption[]; open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form] = Form.useForm<MomentFormValues>();
  const [images, setImages] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ content: moment?.content, mood: moment?.mood, weather: moment?.weather, location: moment?.location, tags: moment?.tags.join(', '), links: moment?.links.map((link) => `${link.type}:${link.id}`) });
    setImages(moment?.imageUrls ?? []);
  }, [form, moment, open]);

  const addImages = async () => {
    const remaining = 9 - images.length;
    if (remaining <= 0) return message.warning('一条日常最多上传 9 张图片');
    try {
      const files = await webCapabilities.pickImages(remaining);
      if (!files.length) return;
      setImageLoading(true);
      const optimized = await Promise.all(files.map(optimizeImageForLocalStorage));
      setImages((current) => [...current, ...optimized].slice(0, 9));
    } catch (error) { message.error(error instanceof Error ? error.message : '图片处理失败'); }
    finally { setImageLoading(false); }
  };
  const save = async (values: MomentFormValues) => {
    const links: EntityLink[] = (values.links ?? []).map((value) => {
      const [type, ...parts] = value.split(':');
      return { type: type as EntityLink['type'], id: parts.join(':') };
    });
    const input: MomentInput = { content: values.content.trim(), imageUrls: images, mood: values.mood || undefined, weather: values.weather || undefined, location: values.location?.trim() || undefined, tags: values.tags?.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) ?? [], links };
    const result = momentInputSchema.safeParse(input);
    if (!result.success) return message.error(result.error.issues[0]?.message ?? '请检查日常内容');
    try {
      if (moment) await dataSource.moments.update(moment.id, result.data);
      else await dataSource.moments.create(result.data);
      message.success(moment ? '日常已更新' : '日常已发布');
      await onSaved();
      onClose();
    } catch (error) { message.error(error instanceof Error ? error.message : '保存失败'); }
  };

  return <Modal open={open} title={moment ? '编辑日常' : '写一条日常'} onCancel={onClose} footer={null} destroyOnClose width={680}>
    <Form form={form} layout="vertical" onFinish={save} initialValues={{ links: [] }}>
      <Form.Item name="content" label="这一刻，想记录什么？" rules={[{ required: true, whitespace: true, message: '写下一点此刻的感受吧' }]}><Input.TextArea rows={5} maxLength={10000} showCount placeholder="文字、想法、值得记住的小事……" autoFocus /></Form.Item>
      <div className="moment-image-editor"><div className="moment-image-list">{images.map((url, index) => <div className="moment-image-edit" key={`${url.slice(0, 30)}-${index}`}><Image src={url} alt={`待上传图片 ${index + 1}`} preview={{ mask: '预览' }} /><Button shape="circle" danger size="small" icon={<CloseOutlined />} onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} aria-label="删除图片" /></div>)}{images.length < 9 && <Button className="moment-image-add" onClick={() => void addImages()} loading={imageLoading} icon={<PictureOutlined />}>{images.length ? `${images.length}/9` : '添加图片'}</Button>}</div></div>
      <div className="form-three-columns"><Form.Item name="mood" label="心情"><Select allowClear placeholder="选择" options={moods.map((mood) => ({ label: mood, value: mood }))} /></Form.Item><Form.Item name="weather" label="天气"><Select allowClear placeholder="选择" options={weathers.map((weather) => ({ label: weather, value: weather }))} /></Form.Item><Form.Item name="location" label="地点"><Input maxLength={120} placeholder="可选" /></Form.Item></div>
      <Form.Item name="tags" label="标签"><Input maxLength={300} placeholder="例如：阅读, 周末（以逗号分隔）" /></Form.Item>
      <Form.Item name="links" label="关联记录（可选）"><Select mode="multiple" allowClear showSearch optionFilterProp="label" placeholder="关联打卡、账单或资产" options={linkOptions} maxTagCount="responsive" /></Form.Item>
      <div className="modal-footer"><Button onClick={onClose}>取消</Button><Button type="primary" icon={<PlusOutlined />} htmlType="submit">{moment ? '保存修改' : '发布日常'}</Button></div>
    </Form>
  </Modal>;
}
