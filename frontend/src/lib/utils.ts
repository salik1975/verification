import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatForDateInput(dateStr: string | Date): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function cleanAddress(raw: string): string {
  const [prefixPart, suffixPart = ''] = raw.split('),').map(s => s.trim());
  const inner = prefixPart.replace(/^AddressValue\(/, '');
  const entries = inner
    .split(',')
    .map(p => p.trim())
    .filter(p => !p.endsWith('=None') && p.includes('='));
  const obj: Record<string, string> = {};
  for (const entry of entries) {
    const [key, val] = entry.split('=').map(s => s.trim());
    obj[key] = val;
  }
  const rawStreet =
    obj.street_address ||
    [obj.house_number, obj.road].filter(Boolean).join(' ');
  const street = titleCase(rawStreet);
  const city = titleCase(obj.city || '');
  const state = obj.state?.toUpperCase() || '';
  const postal = obj.postal_code ? ` ${obj.postal_code}` : '';
  const location = [city, state + postal].filter(Boolean).join(', ');
  const suffix = suffixPart;
  return [street, location, suffix].filter(Boolean).join(', ');
}
