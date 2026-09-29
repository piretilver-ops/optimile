export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatCurrency(n: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCpp(cpp: number): string {
  return `${cpp.toFixed(1)}¢/pt`;
}

export function calculateCpp(cashFareEur: number, milesRequired: number): number {
  return (cashFareEur * 100) / milesRequired;
}

export function calculatePortfolioValue(
  balance: number,
  cppBaseline: number
): number {
  return (balance * cppBaseline) / 100;
}

export function cppColor(cpp: number): string {
  if (cpp >= 2.0) return 'text-emerald-600';
  if (cpp >= 1.2) return 'text-amber-600';
  return 'text-red-500';
}

export function cppBgColor(cpp: number): string {
  if (cpp >= 2.0) return 'bg-emerald-50 border-emerald-200';
  if (cpp >= 1.2) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
