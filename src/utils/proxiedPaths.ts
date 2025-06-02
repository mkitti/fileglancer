import type { ProxiedPath } from '@/contexts/ProxiedPathContext';

const proxyBaseUrl = import.meta.env.VITE_PROXY_BASE_URL;

export function makeSharedDataUrl(item: ProxiedPath): string {
  return `${proxyBaseUrl}/${item.sharing_key}/${item.sharing_name}`;
}
