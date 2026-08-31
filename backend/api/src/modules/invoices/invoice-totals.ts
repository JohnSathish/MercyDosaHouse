const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigit(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${TENS[ten]}${one ? ` ${ONES[one]}` : ''}`.trim();
}

function threeDigit(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (hundred && rest) return `${ONES[hundred]} Hundred ${twoDigit(rest)}`;
  if (hundred) return `${ONES[hundred]} Hundred`;
  return twoDigit(rest);
}

/** Indian numbering: crore / lakh / thousand. */
export function amountInWordsInr(amount: number): string {
  const rounded = Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100;
  if (rounded < 0) return amountInWordsInr(0);
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Rupees Zero Only';

  const crore = Math.floor(rupees / 1_00_00_000);
  const lakh = Math.floor((rupees % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((rupees % 1_00_000) / 1000);
  const hundred = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigit(crore)} Crore`);
  if (lakh) parts.push(`${threeDigit(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigit(thousand)} Thousand`);
  if (hundred) parts.push(threeDigit(hundred));

  let out = `Rupees ${parts.join(' ').replace(/\s+/g, ' ').trim()}`;
  if (paise) out += ` and ${twoDigit(paise)} Paise`;
  return `${out} Only`;
}
