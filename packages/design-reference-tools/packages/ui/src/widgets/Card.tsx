import React from 'react';
import '../styles.css';

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ children, ...rest }: CardProps) {
  return <div className="ui-card" {...rest}>{children}</div>;
}
