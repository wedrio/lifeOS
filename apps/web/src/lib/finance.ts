import { today } from './dates';

export const currentDate = today;
export const currentMonth = () => currentDate().slice(0, 7);

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCents = (amount: number) => currencyFormatter.format(amount / 100);
export const toCents = (amount: number) => Math.round(amount * 100);
export const fromCents = (amount: number) => amount / 100;

export const formatShortDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
};
