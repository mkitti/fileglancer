/**
 * Amber chip shown on app cards and the app detail page when the remote has a
 * newer commit than the version the app is pinned to.
 */
export default function UpdateAvailableBadge() {
  return (
    <span className="inline-block px-2 py-0.5 rounded-sm bg-warning/10 text-warning text-xs font-medium flex-shrink-0">
      Update available
    </span>
  );
}
