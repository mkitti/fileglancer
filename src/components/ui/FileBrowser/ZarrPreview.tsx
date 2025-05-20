import { Typography } from '@material-tailwind/react';

type ZarrPreviewProps = {
  thumbnailSrc: string | null;
  loadingThumbnail: boolean;
  neuroglancerUrl: string | null;
};

export default function ZarrPreview({
  thumbnailSrc,
  loadingThumbnail,
  neuroglancerUrl
}: ZarrPreviewProps): React.ReactNode {
  return (
    <div className="flex flex-col justify-center gap-4 my-2 p-4 bg-primary-light/30 rounded-md w-full h-96">
      <div className="flex flex-col gap-2 max-h-full">
        <Typography variant="small" className="text-surface-foreground">
          {loadingThumbnail ? 'Loading OME-Zarr image...' : ''}
        </Typography>
        {loadingThumbnail ? (
          <div
            className="w-10 h-10 border-4 border-surface-foreground border-t-transparent rounded-full animate-spin"
            title="Loading Thumbnail..."
          ></div>
        ) : null}
        {!loadingThumbnail && thumbnailSrc ? (
          <img
            id="thumbnail"
            src={thumbnailSrc}
            alt="Thumbnail"
            className="max-h-72 max-w-max rounded-md"
          />
        ) : null}
      </div>

      {neuroglancerUrl ? (
        <a href={neuroglancerUrl} target="_blank" rel="noopener noreferrer">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-400 dark:hover:bg-blue-500">
            View in Neuroglancer
          </button>
        </a>
      ) : null}
    </div>
  );
}
