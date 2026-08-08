'use client';

import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@mdh/ui';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
}

export function OtpInput({ value, onChange, length = 6, error }: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const updateDigit = (index: number, digit: string) => {
    const clean = digit.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    while (arr.length < length) arr.push('');
    arr[index] = clean;
    const next = arr.join('').slice(0, length);
    onChange(next.replace(/\s/g, ''));
    if (clean && index < length - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputs.current[focusIdx]?.focus();
  };

  return (
    <motion.div
      animate={error ? { x: [0, -8, 8, -6, 6, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="flex gap-2 sm:gap-3 justify-center"
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i]?.trim() || ''}
          onChange={(e) => updateDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`OTP digit ${i + 1}`}
          className={cn(
            'w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all shadow-sm',
            'bg-[#FFF8E8] text-[#14532D] placeholder:text-gray-300',
            'dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500',
            error
              ? 'border-red-500 ring-2 ring-red-200 bg-red-50 dark:bg-red-950/30'
              : 'border-[#14532D]/30 focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/25 focus:bg-white dark:border-gray-600 dark:focus:border-[#F59E0B] dark:focus:ring-[#F59E0B]/20 dark:focus:bg-gray-900',
          )}
        />
      ))}
    </motion.div>
  );
}
