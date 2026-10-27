import React from 'react';

export default function Badge({ children, variant = 'default', size = 'md' }) {
  const variantStyles = {
    default: {
      pill: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400'
    },
    success: {
      pill: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-xs',
      dot: 'bg-emerald-500'
    },
    warning: {
      pill: 'bg-amber-50 text-amber-800 border-amber-200/80 shadow-xs',
      dot: 'bg-amber-500'
    },
    danger: {
      pill: 'bg-rose-50 text-rose-800 border-rose-200/80 shadow-xs',
      dot: 'bg-rose-500'
    },
    info: {
      pill: 'bg-blue-50 text-blue-800 border-blue-200/80 shadow-xs',
      dot: 'bg-blue-500'
    },
    purple: {
      pill: 'bg-purple-50 text-purple-800 border-purple-200/80 shadow-xs',
      dot: 'bg-purple-500'
    },
  };

  let chosenVariant = variant;
  const text = String(children || '').toUpperCase();

  if (text.includes('ACTIVE') || text.includes('SAFE') || text.includes('OPTIMAL') || text.includes('DELIVERED') || text.includes('APPROVED') || text.includes('COMPLETED') || text.includes('RESOLVED')) {
    chosenVariant = 'success';
  } else if (text.includes('WARNING') || text.includes('LOW') || text.includes('ROUTINE') || text.includes('SCHEDULED') || text.includes('IN_PRODUCTION') || text.includes('SUGGESTED')) {
    chosenVariant = 'warning';
  } else if (text.includes('QUARANTINED') || text.includes('CRITICAL') || text.includes('SHORTAGE') || text.includes('EXPIRED') || text.includes('URGENT') || text.includes('REJECTED') || text.includes('DISCARDED')) {
    chosenVariant = 'danger';
  } else if (text.includes('EXCESS') || text.includes('DISPATCHED') || text.includes('PENDING')) {
    chosenVariant = 'info';
  }

  const current = variantStyles[chosenVariant] || variantStyles.default;

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-[11px] px-2.5 py-0.5 font-bold',
    lg: 'text-xs px-3 py-1 font-bold',
  };

  return (
    <span className={`inline-flex items-center space-x-1.5 rounded-full border transition-colors ${current.pill} ${sizeStyles[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot} shrink-0`}></span>
      <span>{children}</span>
    </span>
  );
}
