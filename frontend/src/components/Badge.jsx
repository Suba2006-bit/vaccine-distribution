import React from 'react';

export default function Badge({ children, variant = 'default', size = 'md' }) {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  let chosenVariant = variant;
  const text = String(children || '').toUpperCase();

  if (text.includes('ACTIVE') || text.includes('SAFE') || text.includes('OPTIMAL') || text.includes('DELIVERED') || text.includes('APPROVED') || text.includes('COMPLETED') || text.includes('RESOLVED')) {
    chosenVariant = 'success';
  } else if (text.includes('WARNING') || text.includes('LOW') || text.includes('ROUTINE') || text.includes('SCHEDULED') || text.includes('IN_PRODUCTION') || text.includes('SUGGESTED')) {
    chosenVariant = 'warning';
  } else if (text.includes('QUARANTINED') || text.includes('CRITICAL') || text.includes('SHORTAGE') || text.includes('EXPIRED') || text.includes('URGENT') || text.includes('REJECTED')) {
    chosenVariant = 'danger';
  } else if (text.includes('EXCESS') || text.includes('DISPATCHED') || text.includes('PENDING')) {
    chosenVariant = 'info';
  }

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${variantStyles[chosenVariant] || variantStyles.default} ${sizeStyles[size]}`}>
      {children}
    </span>
  );
}
