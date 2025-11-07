import React from 'react';
import '../styles.css';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function Button({ variant='primary', style, ...rest }: ButtonProps) {
  const base: React.CSSProperties = variant === 'ghost' ? {
    background: 'transparent',
    color: 'var(--semantic-accent)',
    border: '1px solid currentColor'
  } : {};
  return <button className="ui-button" style={{...base, ...style}} {...rest} />;
}
