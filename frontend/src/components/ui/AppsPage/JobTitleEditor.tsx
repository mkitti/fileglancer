import { useState } from 'react';
import { IconButton, Typography } from '@material-tailwind/react';
import { HiOutlinePencilSquare } from 'react-icons/hi2';
import { HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

import FgIcon from '@/components/designSystem/atoms/FgIcon';
import FgInput from '@/components/designSystem/atoms/formElements/FgInput';
import FgTooltip from '@/components/ui/widgets/FgTooltip';
import { showErrorToast } from '@/utils/errorToast';
import { useUpdateJobMutation } from '@/queries/jobsQueries';
import type { Job } from '@/shared.types';

export default function JobTitleEditor({ job }: { readonly job: Job }) {
  const displayName = job.name || `${job.app_name} - ${job.entry_point_name}`;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName);
  const updateJobMutation = useUpdateJobMutation();

  const startEdit = () => {
    setValue(displayName);
    setEditing(true);
  };

  const save = async () => {
    const name = value.trim();
    if (!name) {
      return;
    }
    try {
      await updateJobMutation.mutateAsync({ jobId: job.id, name });
      toast.success('Job renamed');
      setEditing(false);
    } catch (error) {
      showErrorToast(error, 'Failed to rename job');
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <Typography className="text-foreground font-bold truncate" type="h6">
          {displayName}
        </Typography>
        <FgTooltip label="Edit job name">
          <IconButton
            aria-label="Edit job name"
            className="text-foreground hover:text-primary flex-shrink-0"
            onClick={startEdit}
            size="sm"
            variant="ghost"
          >
            <FgIcon icon={HiOutlinePencilSquare} />
          </IconButton>
        </FgTooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <FgInput
        autoFocus
        className="min-w-64"
        disabled={updateJobMutation.isPending}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            void save();
          } else if (e.key === 'Escape') {
            setEditing(false);
          }
        }}
        type="text"
        value={value}
      />
      <FgTooltip label="Save">
        <IconButton
          aria-label="Save job name"
          className="text-foreground hover:text-primary flex-shrink-0"
          disabled={!value.trim() || updateJobMutation.isPending}
          onClick={() => void save()}
          size="sm"
          variant="ghost"
        >
          <FgIcon icon={HiOutlineCheck} />
        </IconButton>
      </FgTooltip>
      <FgTooltip label="Cancel">
        <IconButton
          aria-label="Cancel rename"
          className="text-foreground hover:text-primary flex-shrink-0"
          onClick={() => setEditing(false)}
          size="sm"
          variant="ghost"
        >
          <FgIcon icon={HiOutlineX} />
        </IconButton>
      </FgTooltip>
    </div>
  );
}
