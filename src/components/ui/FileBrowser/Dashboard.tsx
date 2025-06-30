import { Card, Typography } from '@material-tailwind/react';

export default function Dashboard() {
  return (
    <div className="p-12 w-4/5">
      <Card className="p-6 bg-surface-light shadow-none border border-surface-dark">
        <Card.Header>
          <Typography className="font-semibold text-surface-foreground">
            Quick Access Dashboard (under development)
          </Typography>
        </Card.Header>
        <Card.Body className="flex flex-col gap-4 pb-4">
          <Typography className="text-sm text-foreground">
            Select one of the options below or use the sidebar to start browsing
            your files.
          </Typography>
          <ul className="flex flex-col gap-2">
            <li className="text-foreground">
              Home folder (based on group membership)
            </li>
            <li className="text-foreground">Recently viewed folders</li>
            <li className="text-foreground">Most viewed folders</li>
            <li className="text-foreground">Recently shared folders</li>
          </ul>
        </Card.Body>
      </Card>
    </div>
  );
}
