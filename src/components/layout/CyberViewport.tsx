import { ReactNode } from 'react';

export default function CyberViewport({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`cyber-viewport text-neutral-100 ${className}`}>
      <div className="cyber-grid-bg" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
