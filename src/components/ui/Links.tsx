// Help page
import { Link } from 'react-router';
import { ReactNode } from 'react';

type StyledLinkProps = {
  to: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  textSize?: 'default' | 'large' | 'small';
  block?: boolean;
};

export function FgStyledLink({
  to,
  children,
  className = '',
  target,
  rel,
  textSize = 'default'
}: StyledLinkProps) {
  const baseClasses = 'text-primary-light hover:underline focus:underline';
  const textClasses = {
    default: 'text-base',
    large: 'text-lg',
    small: 'text-sm'
  };

  return (
    <Link
      to={to}
      className={`${baseClasses} ${textClasses[textSize]} ${className}`}
      target={target}
      rel={rel}
    >
      {children}
    </Link>
  );
}
