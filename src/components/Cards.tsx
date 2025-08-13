import React from 'react';
import { Card, Typography } from '@material-tailwind/react';

import { TableRowSkeleton } from '@/components/ui/widgets/Loaders';
import type { ProxiedPath } from '@/contexts/ProxiedPathContext';
import type { Ticket } from '@/contexts/TicketsContext';

type TableCardProps = {
  gridColsClass: string;
  rowTitles: string[];
  rowContent?: React.FC<any>;
  items?: ProxiedPath[] | Ticket[];
  loadingState?: boolean;
  emptyText?: string;
};

function FgCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-surface dark:border-foreground">{children}</Card>
  );
}

function TableRow({
  gridColsClass,
  children
}: {
  gridColsClass: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid ${gridColsClass} justify-items-start gap-4 px-4 py-4 border-b border-surface dark:border-foreground last:border-0`}
    >
      {children}
    </div>
  );
}

function TableCard({
  gridColsClass,
  rowTitles,
  rowContent,
  items,
  loadingState,
  emptyText
}: TableCardProps) {
  return (
    <FgCard>
      <div
        className={`grid ${gridColsClass} gap-4 px-4 py-2 border-b border-surface dark:border-foreground`}
      >
        {rowTitles.map(title => (
          <Typography key={`${title}`} className="font-bold">
            {title}
          </Typography>
        ))}
      </div>
      {loadingState ? (
        <TableRowSkeleton gridColsClass={gridColsClass} />
      ) : rowContent && items && items.length > 0 ? (
        items.map((item: ProxiedPath | Ticket, index) => {
          const RowComponent = rowContent;
          return (
            <TableRow key={index} gridColsClass={gridColsClass}>
              <RowComponent item={item} />
            </TableRow>
          );
        })
      ) : !items || items.length === 0 ? (
        <div className="px-4 py-8 text-center text-foreground">
          {emptyText || 'No data available'}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-foreground">
          There was an error loading the data.
        </div>
      )}
    </FgCard>
  );
}

export { FgCard, TableCard, TableRow };
