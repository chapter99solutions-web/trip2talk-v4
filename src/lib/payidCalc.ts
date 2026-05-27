import { Tour, PayIDSettlement } from '../types/tour';
export const calcStaffCommission = (pax: number, rate: number, threshold: number, bonus: number): number => (pax * rate) + (pax >= threshold ? bonus : 0);
export const calcYTDSummary = (settlements: PayIDSettlement[]) => settlements.reduce((acc, cur) => {
  acc.revenue += cur.total_revenue; acc.expenses += cur.total_expenses; acc.commissions += cur.total_commissions;
  acc.net_profit += cur.net_profit; acc.gst_collected += cur.gst_collected; acc.gst_claimed += cur.gst_claimed;
  return acc;
}, { revenue: 0, expenses: 0, commissions: 0, net_profit: 0, gst_collected: 0, gst_claimed: 0 });
export const formatAUD = (amount: number): string => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
export const generateReceiptFilename = (trip_code: string, amount: number): string => `[${trip_code}]_[${new Date().toISOString().split('T')[0]}]_[${amount.toFixed(2).replace('.', '')}]_Receipt.jpg`;
