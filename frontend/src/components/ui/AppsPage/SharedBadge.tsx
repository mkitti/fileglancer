/**
 * Green chip shown on app cards and table rows when the app has been shared
 * to the catalog.
 */
export default function SharedBadge() {
  return (
    <span className="inline-block px-2 py-0.5 rounded-sm bg-success/10 text-success text-xs font-medium flex-shrink-0">
      Shared
    </span>
  );
}
