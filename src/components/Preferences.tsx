import * as React from 'react';
import { Card, Typography } from '@material-tailwind/react';
import toast from 'react-hot-toast';

import { usePreferencesContext } from '@/contexts/PreferencesContext';

export default function Preferences() {
  const {
    pathPreference,
    handlePathPreferenceSubmit,
    hideDotFiles,
    toggleHideDotFiles,
    disableNeuroglancerStateGeneration,
    toggleDisableNeuroglancerStateGeneration
  } = usePreferencesContext();

  return (
    <>
      <Typography type="h5" className="text-foreground pb-6">
        Preferences
      </Typography>

      <Card>
        <Card.Header>
          <Typography className="font-semibold">
            Format to use for file paths:
          </Typography>
        </Card.Header>
        <Card.Body className="flex flex-col gap-4 pb-4">
          <div className="flex items-center gap-2">
            <input
              className="icon-small checked:accent-secondary-light"
              type="radio"
              id="linux_path"
              value="linux_path"
              checked={pathPreference[0] === 'linux_path'}
              onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
                if (event.target.checked) {
                  const result = await handlePathPreferenceSubmit([
                    'linux_path'
                  ]);
                  if (result.success) {
                    toast.success('Path preference updated successfully!');
                  } else {
                    toast.error(result.error);
                  }
                }
              }}
            />

            <Typography
              as="label"
              htmlFor="linux_path"
              className="text-foreground"
            >
              Cluster/Linux (e.g., /misc/public)
            </Typography>
          </div>

          <div className="flex items-center gap-2">
            <input
              className="icon-small checked:accent-secondary-light"
              type="radio"
              id="windows_path"
              value="windows_path"
              checked={pathPreference[0] === 'windows_path'}
              onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
                if (event.target.checked) {
                  const result = await handlePathPreferenceSubmit([
                    'windows_path'
                  ]);
                  if (result.success) {
                    toast.success('Path preference updated successfully!');
                  } else {
                    toast.error(result.error);
                  }
                }
              }}
            />
            <Typography
              as="label"
              htmlFor="windows_path"
              className="text-foreground"
            >
              Windows/Linux SMB (e.g. \\prfs.hhmi.org\public)
            </Typography>
          </div>

          <div className="flex items-center gap-2">
            <input
              className="icon-small checked:accent-secondary-light"
              type="radio"
              id="mac_path"
              value="mac_path"
              checked={pathPreference[0] === 'mac_path'}
              onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
                if (event.target.checked) {
                  const result = await handlePathPreferenceSubmit(['mac_path']);
                  if (result.success) {
                    toast.success('Path preference updated successfully!');
                  } else {
                    toast.error(result.error);
                  }
                }
              }}
            />
            <Typography
              as="label"
              htmlFor="mac_path"
              className="text-foreground"
            >
              macOS (e.g. smb://prfs.hhmi.org/public)
            </Typography>
          </div>
        </Card.Body>
      </Card>

      <Card className="mt-6">
        <Card.Header>
          <Typography className="font-semibold">Options:</Typography>
        </Card.Header>
        <Card.Body className="flex flex-col gap-4 pb-4">
          <div className="flex items-center gap-2">
            <input
              className="icon-small checked:accent-secondary-light"
              type="checkbox"
              id="hide_dot_files"
              checked={hideDotFiles}
              onChange={async () => {
                const result = await toggleHideDotFiles();
                if (result.success) {
                  toast.success(
                    hideDotFiles
                      ? 'Dot files are now visible'
                      : 'Dot files are now hidden'
                  );
                } else {
                  toast.error(result.error);
                }
              }}
            />
            <Typography
              as="label"
              htmlFor="hide_dot_files"
              className="text-foreground"
            >
              Hide dot files (files and folders starting with ".")
            </Typography>
          </div>

          <div className="flex items-center gap-2">
            <input
              className="icon-small checked:accent-secondary-light"
              type="checkbox"
              id="disable_neuroglancer_state_generation"
              checked={disableNeuroglancerStateGeneration}
              onChange={async () => {
                const result = await toggleDisableNeuroglancerStateGeneration();
                if (result.success) {
                  toast.success(
                    disableNeuroglancerStateGeneration
                      ? 'Neuroglancer state generation is now enabled'
                      : 'Neuroglancer state generation is now disabled'
                  );
                } else {
                  toast.error(result.error);
                }
              }}
            />
            <Typography
              as="label"
              htmlFor="disable_neuroglancer_state_generation"
              className="text-foreground"
            >
              Disable neuroglancer state generation
            </Typography>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}
