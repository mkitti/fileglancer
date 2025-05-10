import * as React from 'react';
import { Typography, Button } from '@material-tailwind/react';

export default function Convert() {
  return (
    <div className="flex flex-col gap-2">
      <Typography variant="small" className="font-medium">
        Convert data to OME-Zarr
      </Typography>
      <Button as="a" href="#" variant="outline">
        Submit
      </Button>
    </div>
  );
} 