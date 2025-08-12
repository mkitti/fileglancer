import { Typography } from '@material-tailwind/react';

export default function Loader({
  customClasses,
  text
}: {
  customClasses?: string;
  text?: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-10 h-10 border-4 border-surface-foreground border-t-transparent rounded-full animate-spin ${customClasses}`}
        title="Loading Thumbnail..."
      ></div>
      <Typography type="lead">{text}</Typography>
    </div>
  );
}
