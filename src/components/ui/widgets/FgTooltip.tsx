import { Tooltip, Typography } from '@material-tailwind/react';

type FgTooltipProps = {
  as?: React.ElementType;
  variant?: 'outline' | 'ghost';
  link?: string;
  disabledCondition?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon?: React.ElementType;
  label: string;
  triggerClasses?: string;
  children?: React.ReactNode;
};

export default function FgTooltip({
  as,
  variant,
  link,
  disabledCondition,
  onClick,
  icon,
  label,
  triggerClasses,
  children
}: FgTooltipProps) {
  const Component = as || null;
  const Icon = icon || null;

  return (
    <Tooltip placement="top">
      <Tooltip.Trigger
        as={Component}
        variant={variant || null}
        to={link}
        className={triggerClasses || ''}
        disabled={Boolean(disabledCondition || false)}
        onClick={onClick ? onClick : undefined}
      >
        {Icon ? <Icon className="icon-default" /> : null}
        {children}
        <Tooltip.Content className="px-2.5 py-1.5 text-primary-foreground z-10">
          <Typography type="small" className="opacity-90">
            {label}
          </Typography>
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Trigger>
    </Tooltip>
  );
}
