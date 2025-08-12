export default function Loader({
  customClasses
}: {
  customClasses?: string;
}): JSX.Element {
  return (
    <div
      className={`w-10 h-10 border-4 border-surface-foreground border-t-transparent rounded-full animate-spin ${customClasses}`}
      title="Loading Thumbnail..."
    ></div>
  );
}
