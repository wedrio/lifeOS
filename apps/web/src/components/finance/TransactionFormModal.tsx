import { useEffect } from 'react';
import { Button, Col, Form, Input, InputNumber, Modal, Radio, Row, Select, message } from 'antd';
import type { Account, Category, Transaction, TransactionInput } from '@lifeos/shared';
import { transactionInputSchema } from '@lifeos/shared';
import { dataSource } from '../../data';
import { currentDate, fromCents, toCents } from '../../lib/finance';

interface TransactionFormValues {
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  accountId: string;
  date: string;
  note?: string;
  tags?: string;
}

interface TransactionFormModalProps {
  open: boolean;
  transaction?: Transaction;
  categories: Category[];
  accounts: Account[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export function TransactionFormModal({ open, transaction, categories, accounts, onClose, onSaved }: TransactionFormModalProps) {
  const [form] = Form.useForm<TransactionFormValues>();
  const type = Form.useWatch('type', form) ?? transaction?.type ?? 'expense';
  const usableCategories = categories.filter((category) => category.type === type);

  useEffect(() => {
    if (!open) return;
    const initialType = transaction?.type ?? 'expense';
    const firstCategory = categories.find((category) => category.type === initialType);
    form.setFieldsValue({
      type: initialType,
      amount: transaction ? fromCents(transaction.amount) : undefined,
      categoryId: transaction?.categoryId ?? firstCategory?.id,
      accountId: transaction?.accountId ?? accounts.find((account) => !account.archived)?.id,
      date: transaction?.date ?? currentDate(),
      note: transaction?.note,
      tags: transaction?.tags.join(', '),
    });
  }, [accounts, categories, form, open, transaction]);

  const submit = async (values: TransactionFormValues) => {
    const input = {
      ...values,
      amount: toCents(values.amount),
      note: values.note?.trim() || undefined,
      tags: values.tags?.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) ?? [],
    } satisfies TransactionInput;
    const result = transactionInputSchema.safeParse(input);
    if (!result.success) {
      message.error(result.error.issues[0]?.message ?? '请检查账单信息');
      return;
    }
    try {
      if (transaction) await dataSource.finance.updateTransaction(transaction.id, result.data);
      else await dataSource.finance.createTransaction(result.data);
      message.success(transaction ? '账单已更新' : '已记下一笔');
      form.resetFields();
      await onSaved();
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败，请稍后重试');
    }
  };

  return (
    <Modal title={transaction ? '编辑账单' : '记一笔'} open={open} onCancel={onClose} footer={null} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={submit} requiredMark="optional" initialValues={{ type: 'expense', date: currentDate() }}>
        <Form.Item name="type" label="类型" rules={[{ required: true }]}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={[{ label: '支出', value: 'expense' }, { label: '收入', value: 'income' }]}
            onChange={() => form.setFieldValue('categoryId', undefined)}
          />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="amount" label="金额" rules={[{ required: true, message: '请输入金额' }]}><InputNumber min={0.01} precision={2} prefix="¥" placeholder="0.00" style={{ width: '100%' }} autoFocus /></Form.Item></Col>
          <Col span={12}><Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}><Input type="date" /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="categoryId" label="分类" rules={[{ required: true, message: '请选择分类' }]}><Select placeholder="选择分类" options={usableCategories.map((category) => ({ value: category.id, label: `${category.icon}  ${category.name}` }))} /></Form.Item></Col>
          <Col span={12}><Form.Item name="accountId" label="账户" rules={[{ required: true, message: '请选择账户' }]}><Select placeholder="选择账户" options={accounts.filter((account) => !account.archived).map((account) => ({ value: account.id, label: `${account.icon}  ${account.name}` }))} /></Form.Item></Col>
        </Row>
        <Form.Item name="tags" label="标签"><Input placeholder="例如：日常, 午餐（以逗号分隔）" maxLength={200} /></Form.Item>
        <Form.Item name="note" label="备注"><Input.TextArea placeholder="可选，记录这笔钱花在了哪里" rows={3} maxLength={1000} showCount /></Form.Item>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Button onClick={onClose}>取消</Button><Button type="primary" htmlType="submit">{transaction ? '保存修改' : '确认记账'}</Button></div>
      </Form>
    </Modal>
  );
}
