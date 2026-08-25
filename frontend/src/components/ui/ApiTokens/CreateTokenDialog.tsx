import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Typography } from '@material-tailwind/react';

import FgButton from '@/components/designSystem/atoms/FgButton';
import FgCheckbox from '@/components/designSystem/atoms/formElements/FgCheckbox';
import FgInput from '@/components/designSystem/atoms/formElements/FgInput';
import FgSelect from '@/components/designSystem/atoms/formElements/FgSelect';
import FgFormField from '@/components/designSystem/molecules/FgFormField';
import FgDialog from '@/components/ui/Dialogs/FgDialog';
import {
  API_SCOPES,
  useCreateApiTokenMutation
} from '@/queries/apiTokenQueries';
import type { CreateTokenResult } from '@/queries/apiTokenQueries';

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
  const [scopes, setScopes] = useState<string[]>(['files:read']);
  const [expiryDays, setExpiryDays] = useState(30);
  const createToken = useCreateApiTokenMutation();

  const canSubmit = name.trim().length > 0 && scopes.length > 0;

  const toggleScope = (scope: string) => {
    setScopes(current =>
      current.includes(scope)
        ? current.filter(s => s !== scope)
        : [...current, scope]
    );
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
    <FgDialog className="max-w-md" onClose={handleClose} open={showDialog}>
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
        <div className="space-y-1">
          {API_SCOPES.map(scope => (
            <FgCheckbox
              checked={scopes.includes(scope)}
              key={scope}
              label={scope}
              onChange={() => toggleScope(scope)}
            />
          ))}
        </div>
        <Typography className="text-secondary text-xs mt-1">
          A <code>:write</code> scope also grants <code>:read</code>.
        </Typography>
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
