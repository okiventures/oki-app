import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', elevated = true, onClick, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-2xl bg-white p-4 ${elevated ? 'border border-gray-200' : 'bg-gray-50'} ${className}`}>
      {children}
    </div>
  );
}
