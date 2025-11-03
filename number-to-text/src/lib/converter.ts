import { NumberingSystem, sentenceCase } from './helpers';

const units = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen'
];

const tens = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety'
];

const internationalScales = [
  { value: 1_000_000_000, label: 'billion' },
  { value: 1_000_000, label: 'million' },
  { value: 1_000, label: 'thousand' }
] as const;

const indianScales = [
  { value: 10_000_000, label: 'crore' },
  { value: 100_000, label: 'lakh' },
  { value: 1_000, label: 'thousand' }
] as const;

const convertBelowThousand = (num: number): string => {
  const result: string[] = [];
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundreds > 0) {
    result.push(`${units[hundreds]} hundred`);
  }

  if (remainder > 0) {
    if (remainder < 20) {
      result.push(units[remainder]);
    } else {
      const tenValue = Math.floor(remainder / 10);
      const unit = remainder % 10;
      if (tenValue > 0) {
        result.push(unit > 0 ? `${tens[tenValue]} ${units[unit]}` : tens[tenValue]);
      }
    }
  }

  return result.join(' ').trim();
};

export const convertNumberToText = (num: number, system: NumberingSystem): string => {
  if (!Number.isInteger(num) || num < 0) {
    throw new Error('Only non-negative integers are supported.');
  }
  if (num === 0) {
    return 'Zero';
  }

  if (system === 'international') {
    if (num < 1000) {
      return sentenceCase(convertBelowThousand(num));
    }
    const parts: string[] = [];
    let remainder = num;
    for (const { value, label } of internationalScales) {
      if (remainder >= value) {
        const chunk = Math.floor(remainder / value);
        remainder %= value;
        parts.push(`${convertNumberToText(chunk, 'international').toLowerCase()} ${label}`);
      }
    }
    if (remainder > 0) {
      parts.push(convertBelowThousand(remainder));
    }
    return sentenceCase(parts.join(' ').replace(/\s+/g, ' ').trim());
  }

  // Indian system
  if (num < 1000) {
    return sentenceCase(convertBelowThousand(num));
  }

  const parts: string[] = [];
  let remainder = num;
  for (const { value, label } of indianScales) {
    if (remainder >= value) {
      const chunk = Math.floor(remainder / value);
      remainder %= value;
      parts.push(`${convertNumberToText(chunk, 'indian').toLowerCase()} ${label}`);
    }
  }

  if (remainder > 0) {
    parts.push(convertBelowThousand(remainder));
  }

  return sentenceCase(parts.join(' ').replace(/\s+/g, ' ').trim());
};
