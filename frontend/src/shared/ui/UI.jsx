import React from 'react';
import { Button as ShadButton } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge as ShadBadge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

export const Button = ({
  children,
  variant = 'gradient',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const variantMap = {
    gradient: 'default',
    outline: 'outline',
    ghost: 'ghost',
    danger: 'destructive',
    success: 'default',
  };
  const sizeMap = {
    sm: 'sm',
    md: 'default',
    lg: 'lg',
  };

  return (
    <ShadButton
      variant={variantMap[variant] || 'default'}
      size={sizeMap[size] || 'default'}
      disabled={disabled || loading}
      className={cn(variant === 'success' && 'bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))]/90', className)}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Loading...
        </>
      ) : (
        <>
          {Icon && <Icon className="h-4 w-4" />}
          {children}
        </>
      )}
    </ShadButton>
  );
};

export const GlassCard = ({ children, className = '', hover = true, ...props }) => (
  <Card className={cn('p-6', hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg', className)} {...props}>
    {children}
  </Card>
);

export const Input = ({ label, error, icon: Icon, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="mb-2 block text-sm font-medium text-muted-foreground">{label}</label>}
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <input className={cn('input-field', Icon && 'pl-10', error && 'border-red-500', className)} {...props} />
    </div>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

export const Badge = ({ children, variant = 'info', className = '' }) => {
  const variantMap = {
    success: 'default',
    warning: 'secondary',
    error: 'destructive',
    danger: 'destructive',
    info: 'secondary',
  };

  return (
    <ShadBadge variant={variantMap[variant] || 'secondary'} className={className}>
      {children}
    </ShadBadge>
  );
};

export const ProgressBar = ({ value, max = 100, className = '' }) => {
  const percentage = Math.max(0, Math.min(100, (Number(value || 0) / max) * 100));

  return (
    <div className={cn('progress-bar', className)}>
      <div className="progress-fill" style={{ width: `${percentage}%` }} />
    </div>
  );
};

export const LoadingSpinner = ({ size = 'md' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex items-center justify-center">
      <div className={cn('animate-spin rounded-full border-4 border-[hsl(var(--brand))]/20 border-t-[hsl(var(--brand))]', sizes[size] || sizes.md)} />
    </div>
  );
};

export const GradientText = ({ children, className = '' }) => (
  <span className={cn('text-[hsl(var(--brand))]', className)}>{children}</span>
);

export const FloatingIcon = ({ icon: Icon, className = '' }) => (
  <div className={className}>
    <Icon className="h-12 w-12 text-[hsl(var(--brand))]" />
  </div>
);

export const Skeleton = ({ className = '', width = 'w-full', height = 'h-4' }) => (
  <div className={cn('animate-pulse rounded-md bg-muted', width, height, className)} />
);
