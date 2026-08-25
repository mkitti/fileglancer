import { Fragment, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Typography } from '@material-tailwind/react';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';

import FgButton from '@/components/designSystem/atoms/FgButton';
import FgIcon from '@/components/designSystem/atoms/FgIcon';
import FgCheckbox from '@/components/designSystem/atoms/formElements/FgCheckbox';
import FgInput from '@/components/designSystem/atoms/formElements/FgInput';
import FgSelect from '@/components/designSystem/atoms/formElements/FgSelect';
import FgFormField from '@/components/designSystem/molecules/FgFormField';
import FgDialog from '@/components/ui/Dialogs/FgDialog';
import {
  API_SCOPES,
  SCOPE_DESCRIPTIONS,
  SCOPE_WARNINGS,
  useCreateApiTokenMutation
} from '@/queries/apiTokenQueries';
import type { ApiScope, CreateTokenResult } from '@/queries/apiTokenQueries';

const EXPIRY_OPTIONS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '365 days' }
];

type CreateTokenDialogProps = {
  readonly showDialog: boolean;
  readonly setShowDialog: Dispatch<SetStateAction<boolean>>;
  readonly onTokenCreated: (result: CreateTokenResult) => void;
};

export default function CreateTokenDialog({
  showDialog,
  setShowDialog,
  onTokenCreated
}: CreateTokenDialogProps) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<ApiScope[]>(['files:read']);
  const [expiryDays, setExpiryDays] = useState(30);
  const createToken = useCreateApiTokenMutation();

  const canSubmit = name.trim().length > 0 && scopes.length > 0;

  // Warnings for whichever dangerous scopes are currently selected, iterated in
  // API_SCOPES order so the list stays stable as boxes are ticked.
  const selectedWarnings = API_SCOPES.flatMap(scope => {
    const warning = SCOPE_WARNINGS[scope];
    return warning && scopes.includes(scope) ? [{ scope, warning }] : [];
  });

  /** The `:read` scope a `:write` scope implies, or null for a read scope. */
  const impliedRead = (scope: ApiScope): ApiScope | null =>
    scope.endsWith(':write')
      ? (scope.replace(':write', ':read') as ApiScope)
      : null;

  /**
   * A `:read` box is locked on while its `:write` counterpart is selected. The
   * server grants read implicitly to any write scope, so letting the user
   * uncheck it would show a state the server would not honour.
   */
  const isImpliedByWrite = (scope: ApiScope) =>
    API_SCOPES.some(
      other => scopes.includes(other) && impliedRead(other) === scope
    );

  const toggleScope = (scope: ApiScope) => {
    setScopes(current => {
      if (current.includes(scope)) {
        return current.filter(s => s !== scope);
      }
      const read = impliedRead(scope);
      return read && !current.includes(read)
        ? [...current, scope, read]
        : [...current, scope];
    });
  };

  const handleClose = () => {
    if (createToken.isPending) {
      // A create is already on the wire; letting the dialog close here would
      // still pop the one-time secret dialog when the response lands.
      return;
    }
    setName('');
    setScopes(['files:read']);
    setExpiryDays(30);
    createToken.reset();
    setShowDialog(false);
  };

  const handleSubmit = async () => {
    try {
      const result = await createToken.mutateAsync({
        name: name.trim(),
        scopes,
        expires_in_days: expiryDays
      });
      handleClose();
      onTokenCreated(result);
    } catch {
      // createToken.error below surfaces the failure to the user
    }
  };

  return (
    <FgDialog className="max-w-4xl" onClose={handleClose} open={showDialog}>
      <Typography className="text-foreground font-semibold text-lg mb-4">
        New API Token
      </Typography>

      <FgFormField htmlFor="token-name" label="Name">
        <FgInput
          onChange={event => setName(event.target.value)}
          placeholder="laptop notebook"
          type="text"
          value={name}
        />
      </FgFormField>

      <fieldset className="mb-4">
        <legend className="text-foreground text-sm font-semibold mb-1">
          Scopes
        </legend>
        {/* One grid for every row, not a grid per row: a CSS grid column is as
            wide as its widest cell across all rows, which is what lines the
            descriptions up without hard-coding a width. */}
        <div className="grid grid-cols-[max-content_1fr] items-start gap-x-4 gap-y-2">
          {API_SCOPES.map(scope => {
            const locked = isImpliedByWrite(scope);
            const descriptionId = `scope-${scope}-description`;
            return (
              <Fragment key={scope}>
                <FgCheckbox
                  aria-describedby={descriptionId}
                  checked={locked || scopes.includes(scope)}
                  disabled={locked}
                  label={scope}
                  onChange={() => toggleScope(scope)}
                />
                <Typography
                  className="text-secondary text-sm"
                  id={descriptionId}
                >
                  {SCOPE_DESCRIPTIONS[scope]}
                </Typography>
              </Fragment>
            );
          })}
        </div>

        {selectedWarnings.length > 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 mt-3">
            <FgIcon
              className="text-warning shrink-0 mt-0.5"
              icon={HiOutlineExclamationTriangle}
              size="sm"
            />
            <div className="space-y-2">
              <Typography className="text-foreground text-sm">
                Treat this token like a password. Anyone who obtains it can act
                as you — Fileglancer cannot tell your own scripts apart from
                someone using a stolen token.
              </Typography>
              <ul className="list-disc list-outside pl-4 space-y-1">
                {selectedWarnings.map(({ scope, warning }) => (
                  <li className="text-foreground text-sm" key={scope}>
                    {warning}
                  </li>
                ))}
              </ul>
              <Typography className="text-foreground text-sm">
                Store it somewhere only you can read, and revoke it here if you
                think it has leaked.
              </Typography>
            </div>
          </div>
        ) : null}
      </fieldset>

      <FgFormField htmlFor="token-expiry" label="Expires in">
        <FgSelect
          onChange={event => setExpiryDays(Number(event.target.value))}
          value={expiryDays}
        >
          {EXPIRY_OPTIONS.map(option => (
            <option key={option.days} value={option.days}>
              {option.label}
            </option>
          ))}
        </FgSelect>
      </FgFormField>

      {createToken.error ? (
        <Typography className="text-error text-sm mb-2">
          {createToken.error.message}
        </Typography>
      ) : null}

      <div className="flex gap-2 justify-start mt-2">
        <FgButton
          disabled={!canSubmit || createToken.isPending}
          loading={createToken.isPending}
          loadingText="Creating..."
          onClick={handleSubmit}
        >
          Create
        </FgButton>
        <FgButton
          disabled={createToken.isPending}
          onClick={handleClose}
          variant="ghost"
        >
          Cancel
        </FgButton>
      </div>
    </FgDialog>
  );
}
