import { Button, Card, Tag } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

interface FeaturePlaceholderProps {
  emoji: string;
  title: string;
  description: string;
  nextStage: string;
}

export function FeaturePlaceholder({ emoji, title, description, nextStage }: FeaturePlaceholderProps) {
  return (
    <>
      <section className="page-heading">
        <div><h1>{title}</h1><p>{description}</p></div>
        <Tag color="processing">规划中 · {nextStage}</Tag>
      </section>
      <Card className="empty-feature">
        <span className="feature-emoji">{emoji}</span>
        <h2>这里正在准备中</h2>
        <p>当前已完成 A0 工程骨架与稳定的数据访问契约。此功能将按路线图在 {nextStage} 阶段实现。</p>
        <Button type="primary" disabled icon={<ArrowRightOutlined />}>等待进入下一项</Button>
      </Card>
    </>
  );
}
