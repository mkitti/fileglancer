import { Link } from 'react-router-dom';
import { Typography } from '@material-tailwind/react';

function BetaBanner() {
  return (
    <div className="flex justify-center items-center gap-1 w-full bg-warning/80 pt-[5px] pb-1 text-black font-semibold">
      <Typography className="text-sm">
        Find a bug or want to request a feature?
      </Typography>
      <Typography
        as={Link}
        className="underline text-sm"
        to="https://forms.clickup.com/10502797/f/a0gmd-713/NBUCBCIN78SI2BE71G"
        target="_blank"
        rel="noopener noreferrer"
      >
        Let us know.
      </Typography>
    </div>
  );
}

function BetaSticker() {
  return (
    <Typography className="text-xs font-bold py-1 px-2 text-black bg-warning/80 rounded-sm">
      BETA
    </Typography>
  );
}

export { BetaBanner, BetaSticker };
