import { useMemo, useState } from 'react';

import { ButtonGroup, IconButton, Typography } from '@material-tailwind/react';
import {
  HiOutlineLink,
  HiOutlineSquares2X2,
  HiOutlineTableCells
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

import AppCard from '@/components/ui/AppsPage/AppCard';
import AddAppDialog from '@/components/ui/AppsPage/AddAppDialog';
import AppActionDialogs from '@/components/ui/AppsPage/AppActionDialogs';
import { TableCard } from '@/components/ui/Table/TableCard';
import { createMyAppsColumns } from '@/components/ui/Table/myAppsColumns';
import FgTooltip from '@/components/ui/widgets/FgTooltip';
import {
  useAppsQuery,
  useAddAppMutation,
  useDiscoverAppsMutation
} from '@/queries/appsQueries';
import { useAppActions } from '@/hooks/useAppActions';
import FgButton from './designSystem/atoms/FgButton';
import FgExternalLink from '@/components/designSystem/atoms/FgExternalLink';
import { DOCS_BASE_URL } from '@/constants/docs';

type AppsViewMode = 'cards' | 'table';

const VIEW_MODE_STORAGE_KEY = 'appsViewMode';

function ViewModeToggle({
  viewMode,
  onChange
}: {
  readonly viewMode: AppsViewMode;
  readonly onChange: (mode: AppsViewMode) => void;
}) {
  const triggerClasses = (active: boolean) =>
    active
      ? 'text-primary bg-primary/10'
      : 'text-foreground/60 hover:text-foreground';
  return (
    <ButtonGroup className="gap-1">
      <FgTooltip
        as={IconButton}
        icon={HiOutlineSquares2X2}
        label="Card view"
        onClick={() => onChange('cards')}
        triggerClasses={triggerClasses(viewMode === 'cards')}
        variant="ghost"
      />
      <FgTooltip
        as={IconButton}
        icon={HiOutlineTableCells}
        label="Table view"
        onClick={() => onChange('table')}
        triggerClasses={triggerClasses(viewMode === 'table')}
        variant="ghost"
      />
    </ButtonGroup>
  );
}

export default function Apps() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewMode, setViewMode] = useState<AppsViewMode>(() =>
    localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'table' ? 'table' : 'cards'
  );

  const appsQuery = useAppsQuery();
  const addAppMutation = useAddAppMutation();
  const discoverAppsMutation = useDiscoverAppsMutation();
  const actions = useAppActions();

  const appsColumns = useMemo(
    () => createMyAppsColumns(actions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const changeViewMode = (mode: AppsViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  };

  const handleDiscover = (url: string) => discoverAppsMutation.mutateAsync(url);

  const handleAddFromUrl = async (url: string, manifestPaths?: string[]) => {
    const apps = await addAppMutation.mutateAsync({
      url,
      manifest_paths: manifestPaths
    });
    const count = apps.length;
    toast.success(`${count} app${count !== 1 ? 's' : ''} added`);
    setShowAddDialog(false);
  };

  return (
    <div>
      <Typography className="mb-6 text-foreground">
        Run command-line tools on the compute cluster. Browse the App Catalog to
        find shared apps, or add one from a GitHub URL. If you want to create
        your own app, see the{' '}
        <FgExternalLink href={`${DOCS_BASE_URL}/authoring/overview/`}>
          authoring guide
        </FgExternalLink>
        .
      </Typography>

      <div className="mb-6 flex items-center justify-between gap-2">
        <FgButton
          icon={HiOutlineLink}
          onClick={() => setShowAddDialog(true)}
          variant="outline"
        >
          Add from URL
        </FgButton>
        <ViewModeToggle onChange={changeViewMode} viewMode={viewMode} />
      </div>

      {viewMode === 'table' ? (
        <div className="mb-8">
          <TableCard
            columns={appsColumns}
            data={appsQuery.data || []}
            dataType="apps"
            errorState={appsQuery.error}
            gridColsClass="grid-cols-[2fr_1fr_2fr_3fr_1fr_1fr]"
            loadingState={appsQuery.isPending}
          />
        </div>
      ) : appsQuery.isPending ? (
        <Typography className="text-foreground mb-6" type="small">
          Loading apps...
        </Typography>
      ) : appsQuery.isError ? (
        <div className="mb-6 p-3 bg-error/10 rounded text-error text-sm">
          Failed to load apps: {appsQuery.error?.message || 'Unknown error'}
        </div>
      ) : appsQuery.data?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {appsQuery.data.map(app => (
            <AppCard
              actions={actions}
              app={app}
              key={`${app.url}::${app.manifest_path}`}
            />
          ))}
        </div>
      ) : (
        <div className="mb-8 p-6 border border-dashed border-primary-light rounded-lg text-center">
          <Typography className="text-foreground" type="small">
            No apps configured. Browse the catalog or add one from a GitHub URL
            to get started.
          </Typography>
        </div>
      )}

      <AddAppDialog
        adding={addAppMutation.isPending}
        discovering={discoverAppsMutation.isPending}
        onAdd={handleAddFromUrl}
        onClose={() => setShowAddDialog(false)}
        onDiscover={handleDiscover}
        open={showAddDialog}
      />
      <AppActionDialogs actions={actions} />
    </div>
  );
}
