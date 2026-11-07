import * as TabsPrimitive from '@radix-ui/react-tabs';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import type { Pagination } from '@/lib/api-client';
import { num, statusLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from './button';

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-lg border border-border bg-surface shadow-card', className)} {...p} />
);
export const CardHeader = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between gap-3 border-b border-border px-5 py-4', className)} {...p} />
);
export const CardTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) => <h3 className={cn('text-base font-bold', className)} {...p} />;
export const CardBody = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('p-5', className)} {...p} />;

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded bg-soft', className)} />;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 no-print">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <Inbox className="h-9 w-9 text-muted/60" />
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

const tone = {
  neutral: 'bg-soft text-muted',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
} as const;

export function Badge({ children, color = 'neutral', className }: { children: ReactNode; color?: keyof typeof tone; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', tone[color], className)}>{children}</span>;
}

const statusTone: Record<string, keyof typeof tone> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'primary',
  ready: 'primary',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
  draft: 'warning',
  received: 'success',
};
export const StatusBadge = ({ status }: { status: string }) => <Badge color={statusTone[status] ?? 'neutral'}>{statusLabel(status)}</Badge>;

export function StatCard({ label, value, hint, icon, color = 'primary' }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode; color?: keyof typeof tone }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {icon && <div className={cn('rounded-lg p-2.5', tone[color])}>{icon}</div>}
      </div>
    </Card>
  );
}

export const Table = ({ className, ...p }: HTMLAttributes<HTMLTableElement>) => (
  <div className="overflow-x-auto">
    <table className={cn('w-full text-left text-sm', className)} {...p} />
  </div>
);
export const THead = (p: HTMLAttributes<HTMLTableSectionElement>) => <thead className="border-b border-border bg-soft/60 text-xs uppercase tracking-wide text-muted" {...p} />;
export const TH = ({ className, ...p }: ThHTMLAttributes<HTMLTableCellElement>) => <th className={cn('whitespace-nowrap px-4 py-3 font-semibold', className)} {...p} />;
export const TR = ({ className, ...p }: HTMLAttributes<HTMLTableRowElement>) => <tr className={cn('border-b border-border last:border-0', className)} {...p} />;
export const TD = ({ className, ...p }: TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn('px-4 py-3 align-middle', className)} {...p} />;

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Pager({ pagination, onPage }: { pagination?: Pagination; onPage: (p: number) => void }) {
  if (!pagination || pagination.total === 0) return null;
  const { page, pageSize, total, totalPages } = pagination;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm no-print">
      <span className="text-muted">
        {num(from)}–{num(to)} of {num(total)}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[72px] text-center tabular-nums">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export const Tabs = TabsPrimitive.Root;
export const TabsList = ({ className, ...p }: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List className={cn('mb-5 inline-flex gap-1 rounded-lg bg-soft p-1', className)} {...p} />
);
export const TabsTrigger = ({ className, ...p }: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn('rounded px-4 py-1.5 text-sm font-semibold text-muted transition-colors data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-card', className)}
    {...p}
  />
);
export const TabsContent = TabsPrimitive.Content;
