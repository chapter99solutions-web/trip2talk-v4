import { useEffect, useState } from 'react';
import { formatAUD } from '../../lib/payidCalc';

type BarTone = 'emerald' | 'orange';

export default function KpiCard({
  label,
  value,
  percent,
  barTone,
}: {
  label: string;
  value: number;
  percent: number;
  barTone: BarTone;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setWidth(Math.min(100, Math.max(0, percent))));
    return () => cancelAnimationFrame(t);
  }, [percent]);

  return (
    <div className="cyber-card p-5">
      <p className="cyber-kpi-label">{label}</p>
      <p className="cyber-kpi-value mt-2">{formatAUD(value)}</p>
      <div className="cyber-progress-track">
        <div className={`cyber-progress-fill ${barTone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
