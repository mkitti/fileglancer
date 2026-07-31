import { useMemo, useState } from 'react';
import { Typography } from '@material-tailwind/react';

import ListingActionDialogs from '@/components/ui/AppsPage/ListingActionDialogs';
import ListingCard from '@/components/ui/AppsPage/ListingCard';
import FgCheckbox from '@/components/designSystem/atoms/formElements/FgCheckbox';
import { TableCard } from '@/components/ui/Table/TableCard';
import { createCatalogColumns } from '@/components/ui/Table/catalogColumns';
import ViewModeToggle from '@/components/ui/widgets/ViewModeToggle';
import { useAppsQuery, useCatalogQuery } from '@/queries/appsQueries';
import { useListingActions } from '@/hooks/useListingActions';
import { useViewMode } from '@/hooks/useViewMode';
import { useProfileContext } from '@/contexts/ProfileContext';
import { canonicalGithubUrl } from '@/utils';
import type { AppListing, UserApp } from '@/shared.types';

// Installed-app lookup key. Canonicalize the URL so a match can't be missed
// over URL formatting differences (same convention as AppDetail/AppLaunch).
const listingKey = (url: string, manifestPath: string) =>
  `${canonicalGithubUrl(url)}::${manifestPath}`;

export default function Catalog() {
  const [search, setSearch] = useState('');
  const [hideInstalled, setHideInstalled] = useState(false);
  const [viewMode, changeViewMode] = useViewMode('catalogViewMode');

  const catalogQuery = useCatalogQuery();
  const appsQuery = useAppsQuery();
  const { profile } = useProfileContext();
  const actions = useListingActions();

  const myAppsByKey = useMemo(() => {
    const map = new Map<string, UserApp>();
    (appsQuery.data ?? []).forEach(a =>
      map.set(listingKey(a.url, a.manifest_path), a)
    );
    return map;
  }, [appsQuery.data]);

  const catalogColumns = useMemo(
    () =>
      createCatalogColumns(
        actions,
        (listing: AppListing) =>
          myAppsByKey.get(listingKey(listing.url, listing.manifest_path)),
        profile?.username
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myAppsByKey, profile?.username]
  );

  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase();
    const listings = catalogQuery.data ?? [];
    return listings.filter(l => {
      if (
        hideInstalled &&
        myAppsByKey.has(listingKey(l.url, l.manifest_path))
      ) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        l.name.toLowerCase().includes(term) ||
        (l.description ?? '').toLowerCase().includes(term) ||
        l.owner_username.toLowerCase().includes(term)
      );
    });
  }, [catalogQuery.data, search, hideInstalled, myAppsByKey]);

  const totalListings = catalogQuery.data?.length ?? 0;

  return (
    <div>
      <Typography className="mb-6 text-foreground">
        Browse shared apps. Click &quot;Add to my apps&quot; to get your own
        copy, or manage listings you have shared.
      </Typography>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <input
            aria-label="Search shared apps"
            className="w-full sm:max-w-sm p-2 text-foreground border rounded-sm focus:outline-none bg-background border-primary-light focus:border-primary"
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, description, or sharer"
            type="text"
            value={search}
          />
          <FgCheckbox
            checked={hideInstalled}
            label="Hide already installed apps"
            onChange={e => setHideInstalled(e.target.checked)}
          />
        </div>
        <ViewModeToggle onChange={changeViewMode} viewMode={viewMode} />
      </div>

      {catalogQuery.isPending ? (
        <Typography className="text-foreground mb-6" type="small">
          Loading catalog...
        </Typography>
      ) : catalogQuery.isError ? (
        <div className="mb-6 p-3 bg-error/10 rounded text-error text-sm">
          Failed to load catalog:{' '}
          {catalogQuery.error?.message || 'Unknown error'}
        </div>
      ) : totalListings === 0 ? (
        <div className="mb-8 p-6 border border-dashed border-primary-light rounded-lg text-center">
          <Typography className="text-foreground" type="small">
            No shared apps yet. Add an app from a GitHub URL on the Apps page,
            then share it to populate the catalog.
          </Typography>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="mb-8 p-6 border border-dashed border-primary-light rounded-lg text-center">
          <Typography className="text-foreground" type="small">
            {search.trim()
              ? `No listings match "${search}".`
              : 'All shared apps are already in your apps.'}
          </Typography>
        </div>
      ) : viewMode === 'table' ? (
        <div className="mb-8">
          <TableCard
            columns={catalogColumns}
            data={filteredListings}
            dataType="shared apps"
            errorState={catalogQuery.error}
            gridColsClass="grid-cols-[2fr_2fr_3fr_1fr_1fr_1fr_1fr]"
            initialPageSize={50}
            loadingState={catalogQuery.isPending}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filteredListings.map(listing => {
            const installedApp = myAppsByKey.get(
              listingKey(listing.url, listing.manifest_path)
            );
            const isOwner =
              profile?.username !== undefined &&
              profile.username === listing.owner_username;
            return (
              <ListingCard
                actions={actions}
                canManage={isOwner}
                installedApp={installedApp}
                key={listing.id}
                listing={listing}
              />
            );
          })}
        </div>
      )}

      <ListingActionDialogs actions={actions} />
    </div>
  );
}
