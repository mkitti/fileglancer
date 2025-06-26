import { default as log } from 'loglevel';
import { Typography } from '@material-tailwind/react';

import errorImg from '@/assets/error_icon_gradient.png';

export default function ErrorFallback({ error }: any) {
  if (error instanceof Error) {
    log.error('ErrorBoundary caught an error:', error);
  }
  return (
    <div className="flex flex-col h-full gap-4 justify-center items-center">
      {error instanceof Error ? (
        <>
          <Typography
            type="h2"
            className="text-black dark:text-white font-bold"
          >
            Oops! An error occurred
          </Typography>
          <Typography
            type="h5"
            className="text-foreground"
          >{`${error.message ? error.message : 'Unknown error'}`}</Typography>
        </>
      ) : (
        <Typography type="h2" className="text-black dark:text-white font-bold">
          Oops! An unknown error occurred
        </Typography>
      )}
      <Typography
        type="h5"
        as="a"
        href="https://forms.clickup.com/10502797/f/a0gmd-713/NBUCBCIN78SI2BE71G"
        target="_blank"
        rel="noopener noreferrer"
        className="text-black dark:text-white underline"
      >
        Submit a bug report
      </Typography>
      <div className="flex flex-col items-center pl-4">
        <img
          src={errorImg}
          alt="An icon showing a magnifying glass with a question mark hovering over an eye on a page"
          width="500px"
          height="500px"
          className="dark:bg-slate-50 rounded-full"
        />
      </div>
    </div>
  );
}
