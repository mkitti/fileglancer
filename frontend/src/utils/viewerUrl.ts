import type { ValidViewer } from '@/contexts/ViewersContext';
import type { ViewerUrlSource } from '@/contexts/PreferencesContext';

/**
 * Resolve the URL template to use for a viewer given the user's chosen source.
 *
 * Falls back to the deployment-configured template for an absent/unknown source
 * or when the requested template is empty, so callers always get a usable value.
 */
export function resolveViewerTemplate(
  viewer: ValidViewer,
  source: ViewerUrlSource | undefined
): string {
  if (!source || source === 'configured') {
    return viewer.urlTemplate;
  }
  if (source === 'manifest') {
    return viewer.manifestTemplateUrl || viewer.urlTemplate;
  }
  if (typeof source === 'object' && source.custom) {
    return source.custom;
  }
  return viewer.urlTemplate;
}
