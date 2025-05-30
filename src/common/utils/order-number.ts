/**
 * Generates a unique order number with format: ORD-YYYYMMDD-XXXXX
 * where XXXXX is a random 5-digit number
 */
export function generateOrderNumber(): string {
  // Get current date in YYYYMMDD format
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Generate random 5-digit number
  const randomNum = Math.floor(10000 + Math.random() * 90000);

  return `ORD-${dateStr}-${randomNum}`;
}
