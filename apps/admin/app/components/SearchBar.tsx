'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...' }: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className="flex flex-1 flex-row items-center gap-2 rounded-xl border px-3 py-2.5"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: focused ? '#ed6e7e' : '#E5E7EB',
      }}>
      <Search size={18} className="text-gray-400" strokeWidth={2} fill="none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 bg-transparent text-sm font-normal text-gray-900 outline-none placeholder:text-gray-400"
      />
    </div>
  );
}
