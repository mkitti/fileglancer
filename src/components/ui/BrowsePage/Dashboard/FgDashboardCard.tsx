import { Card, Typography } from '@material-tailwind/react';

export default function DashboardCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <Card.Header>
        <Typography className="font-semibold text-surface-foreground">
          {title}
        </Typography>
      </Card.Header>
      <Card.Body className="flex flex-col gap-4 pb-4">{children}</Card.Body>
    </Card>
  );
}
