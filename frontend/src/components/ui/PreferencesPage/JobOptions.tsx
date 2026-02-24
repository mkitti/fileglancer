import { useState } from 'react';

import { Typography } from '@material-tailwind/react';
import toast from 'react-hot-toast';

import { usePreferencesContext } from '@/contexts/PreferencesContext';

export default function JobOptions() {
  const { defaultExtraArgs, updateDefaultExtraArgs } = usePreferencesContext();

  const [localValue, setLocalValue] = useState(defaultExtraArgs);
  const [saving, setSaving] = useState(false);

  // Track whether the local value differs from the saved preference
  const isDirty = localValue !== defaultExtraArgs;

  const handleSave = async () => {
    setSaving(true);
    const result = await updateDefaultExtraArgs(localValue.trim());
    setSaving(false);
    if (result.success) {
      toast.success('Default extra arguments saved');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div>
      <Typography className="font-semibold">Jobs</Typography>
      <div className="pl-4 mt-2">
        <label
          className="block text-foreground text-sm mb-1"
          htmlFor="default-extra-args"
        >
          Default extra arguments
        </label>
        <Typography className="text-secondary mb-2" type="small">
          Additional CLI arguments appended to every job submit command. Can be
          overridden per job on the Cluster tab.
        </Typography>
        <input
          className="max-w-md w-full p-2 text-foreground border rounded-sm focus:outline-none bg-background border-primary-light focus:border-primary font-mono text-sm"
          id="default-extra-args"
          onChange={e => setLocalValue(e.target.value)}
          placeholder="e.g. -P your_project"
          type="text"
          value={localValue}
        />
        <button
          className="mt-2 block px-3 py-1 text-sm rounded bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
          disabled={!isDirty || saving}
          onClick={handleSave}
          type="button"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
