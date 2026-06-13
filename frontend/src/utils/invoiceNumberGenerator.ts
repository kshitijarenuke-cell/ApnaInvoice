import dayjs from 'dayjs';

const COUNTER_KEY = 'shivohini-hub:invoiceCounter';

export function getStoredCounter(): number {
  try {
    const stored = localStorage.getItem(COUNTER_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

export function incrementCounter(): number {
  const current = getStoredCounter();
  const next = current + 1;
  try {
    localStorage.setItem(COUNTER_KEY, next.toString());
  } catch (error) {
    console.error('Failed to save invoice counter:', error);
  }
  return next;
}

export function generateInvoiceNumber(issueDate: string): string {
  const counter = incrementCounter();
  const yearMonth = dayjs(issueDate).format('YYYYMM');
  const paddedCounter = counter.toString().padStart(3, '0');
  return `INV-${yearMonth}-${paddedCounter}`;
}

export function resetCounter(): void {
  try {
    localStorage.removeItem(COUNTER_KEY);
  } catch (error) {
    console.error('Failed to reset invoice counter:', error);
  }
}
