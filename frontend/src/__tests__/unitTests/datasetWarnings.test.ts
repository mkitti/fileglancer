import { describe, it, expect } from 'vitest';
import { getDatasetWarnings } from '@/omezarr-helper';
import type { Metadata } from '@/omezarr-helper';

// Minimal stand-in for the parts of Metadata the checks read. Codec info is
// left out by default, which the chunk check treats as compressed.
const createMetadata = (
  chunks: number[],
  dtype = 'uint16',
  extra: Partial<Metadata> = {},
  shape: number[] = [8, 8, 8]
): Metadata =>
  ({
    arr: { chunks, dtype, shape },
    ...extra
  }) as unknown as Metadata;

const levels = (count: number): Partial<Metadata> => ({
  multiscales: [
    { datasets: Array.from({ length: count }, () => ({})) }
  ] as unknown as Metadata['multiscales']
});

// zstd nested inside a sharding_indexed pipeline, as a sharded v3 array stores it.
const SHARDED_ZSTD: Partial<Metadata> = {
  codecs: [
    {
      name: 'sharding_indexed',
      configuration: { codecs: [{ name: 'bytes' }, { name: 'zstd' }] }
    }
  ]
};
const UNCOMPRESSED_V3: Partial<Metadata> = {
  codecs: [{ name: 'bytes' }, { name: 'crc32c' }]
};

describe('getDatasetWarnings: chunk size', () => {
  it('says nothing about reasonable chunks', () => {
    expect(getDatasetWarnings(createMetadata([64, 64, 64]))).toEqual([]);
  });

  it('does not warn about a compressed 48 MB chunk', () => {
    // 48 MB inner chunks that zstd takes to well under the 32 MB guidance.
    expect(
      getDatasetWarnings(
        createMetadata([24, 128, 128, 128], 'uint8', SHARDED_ZSTD)
      )
    ).toEqual([]);
  });

  it('holds an uncompressed array to the stricter limit', () => {
    // The same 48 MB chunks, but stored raw, so 48 MB is what transfers.
    for (const raw of [UNCOMPRESSED_V3, { compressor: null }]) {
      expect(
        getDatasetWarnings(createMetadata([24, 128, 128, 128], 'uint8', raw))
      ).toEqual([
        {
          case: 'zarr-large-chunks',
          size: '48 MB',
          compressed: false,
          sharded: false
        }
      ]);
    }
  });

  it('finds a compressor nested inside a sharding codec', () => {
    // sharding_indexed is structural, so a flat scan would call this
    // uncompressed and warn at 48 MB.
    expect(
      getDatasetWarnings(
        createMetadata([24, 128, 128, 128], 'uint8', SHARDED_ZSTD)
      )
    ).toEqual([]);
  });

  it('assumes compressed when codec metadata was never fetched', () => {
    // Unknown lands on the permissive limit: a missed warning beats a false one.
    expect(
      getDatasetWarnings(createMetadata([24, 128, 128, 128], 'uint8'))
    ).toEqual([]);
  });

  it('warns above the compressed limit', () => {
    // seed151 img: 128 MB chunks.
    expect(
      getDatasetWarnings(createMetadata([256, 256, 256, 8], 'uint8'))
    ).toEqual([
      {
        case: 'zarr-large-chunks',
        size: '128 MB',
        compressed: true,
        sharded: false
      }
    ]);
  });

  it('calls out that a sharded array is measured by its inner chunks', () => {
    // zarrita resolves the sharding codec, so arr.chunks is the inner chunk
    // shape - the shard around it is never what we size.
    expect(
      getDatasetWarnings(
        createMetadata([256, 256, 256, 8], 'uint8', SHARDED_ZSTD)
      )
    ).toEqual([
      {
        case: 'zarr-large-chunks',
        size: '128 MB',
        compressed: true,
        sharded: true
      }
    ]);
  });

  it('accounts for the dtype width', () => {
    expect(getDatasetWarnings(createMetadata([256, 256, 256]))).toEqual([]);
    expect(
      getDatasetWarnings(createMetadata([256, 256, 256], 'float64'))
    ).toHaveLength(1);
  });
});

describe('getDatasetWarnings: resolution levels', () => {
  const BIG = [3000, 3000, 1350, 8]; // 91 GB of uint8, the seed151 img extent

  it('warns when multiscales declares a single level for a large image', () => {
    expect(
      getDatasetWarnings(createMetadata([64, 64, 64], 'uint8', levels(1), BIG))
    ).toEqual([{ case: 'zarr-single-level', size: '91 GB' }]);
  });

  it('says nothing when the pyramid has levels', () => {
    expect(
      getDatasetWarnings(createMetadata([64, 64, 64], 'uint8', levels(5), BIG))
    ).toEqual([]);
  });

  it('says nothing about a small single-level image', () => {
    expect(
      getDatasetWarnings(
        createMetadata([64, 64, 64], 'uint8', levels(1), [256, 256, 256])
      )
    ).toEqual([]);
  });

  it('never fires on a plain array, however large', () => {
    // The bug that made this warn on raw/s2: a plain array also has one shape,
    // but it declares no multiscales and so claims nothing.
    expect(
      getDatasetWarnings(createMetadata([64, 64, 64], 'uint8', {}, BIG))
    ).toEqual([]);
  });
});
