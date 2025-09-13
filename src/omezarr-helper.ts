import { default as log } from '@/logger';
import * as zarr from 'zarrita';
import * as omezarr from 'ome-zarr.js';

export type LayerType = 'auto' | 'image' | 'segmentation';

/**
 * A single omero channel.
 */
export interface Channel {
  color: string;
  window: Window;
  lut?: string;
  active?: boolean;
  inverted?: boolean;
  [k: string]: unknown;
}
/**
 * A single window.
 */
export interface Window {
  max: number;
  min: number;
  start?: number;
  end?: number;
  [k: string]: unknown;
}

export type Metadata = {
  arr: zarr.Array<any>;
  shapes: number[][] | undefined;
  scales: number[][] | undefined;
  multiscale: omezarr.Multiscale | null | undefined;
  omero: omezarr.Omero | null | undefined;
  zarrVersion: 2 | 3;
};

const COLORS = ['magenta', 'green', 'cyan', 'white', 'red', 'green', 'blue'];

const UNIT_CONVERSIONS: Record<string, string> = {
  micron: 'um', // Micron is not a valid UDUNITS-2, but some data still uses it
  micrometer: 'um',
  millimeter: 'mm',
  nanometer: 'nm',
  centimeter: 'cm',
  meter: 'm',
  second: 's',
  millisecond: 'ms',
  microsecond: 'us',
  nanosecond: 'ns'
};

/**
 * Convert UDUNITS-2 units to Neuroglancer SI units.
 */
function translateUnitToNeuroglancer(unit: string): string {
  if (unit === null || unit === undefined) {
    return '';
  }
  if (UNIT_CONVERSIONS[unit]) {
    return UNIT_CONVERSIONS[unit];
  }
  return unit;
}

/**
 * Find and return the first scale transform from the given coordinate transformations.
 * @param coordinateTransformations - List of coordinate transformations
 * @returns The first transform with type "scale", or undefined if no scale transform is found
 */
function getScaleTransform(coordinateTransformations: any[]) {
  return coordinateTransformations?.find((ct: any) => ct.type === 'scale') as {
    scale: number[];
  };
}

/**
 * Calculate resolved scales by multiplying root scales with full scale dataset scales
 * @param multiscale - The multiscale object
 * @param scales - Array of full scale dataset scale values
 * @returns Array of resolved scale values
 */
function getResolvedScales(multiscale: omezarr.Multiscale): number[] {
  // Get the root transform
  const rct = getScaleTransform(multiscale.coordinateTransformations as any[]);
  const rootScales = rct?.scale || [];

  // Get the transform for the full scale dataset
  const dataset = multiscale.datasets[0];
  const ct = getScaleTransform(dataset.coordinateTransformations);
  const scales = ct?.scale || [];

  // Calculate the resolved scales
  return scales.map((scale, index) => scale * (rootScales[index] || 1));
}

/**
 * Get the size in bytes for a given dtype string.
 */
function getDtypeSize(dtype: string): number {
  if (!dtype) {
    return 4; // Default to 4 bytes
  }

  // Parse numpy-style dtype strings (int8, int16, uint8, etc.)
  if (dtype.includes('int') || dtype.includes('uint')) {
    const bitMatch = dtype.match(/\d+/);
    if (bitMatch) {
      const bitCount = parseInt(bitMatch[0]);
      return bitCount / 8;
    } else {
      // Try explicit endianness format: <byteorder><type><bytes>
      const oldFormatMatch = dtype.match(/^[<>|]([iuf])(\d+)$/);
      if (oldFormatMatch) {
        return parseInt(oldFormatMatch[2], 10);
      }
    }
  }

  // Handle float types
  if (dtype.includes('float')) {
    const bitMatch = dtype.match(/\d+/);
    if (bitMatch) {
      const bitCount = parseInt(bitMatch[0]);
      return bitCount / 8;
    }
  }

  // Default fallback
  return 4;
}

/**
 * Get the min and max values for a given Zarr array, based on the dtype:
 * https://zarr-specs.readthedocs.io/en/latest/v2/v2.0.html#data-type-encoding
 */
function getMinMaxValues(arr: zarr.Array<any>): { min: number; max: number } {
  // Default values
  let dtypeMin = 0;
  let dtypeMax = 65535;

  if (arr.dtype) {
    const dtype = arr.dtype;
    log.trace('Parsing dtype:', dtype);
    // Parse numpy-style dtype strings (int8, int16, uint8, etc.)
    if (dtype.includes('int') || dtype.includes('uint')) {
      // Extract the numeric part for bit depth
      const bitMatch = dtype.match(/\d+/);
      if (bitMatch) {
        const bitCount = parseInt(bitMatch[0]);
        if (dtype.startsWith('u')) {
          // Unsigned integer (uint8, uint16, etc.)
          log.trace('Unsigned integer');
          dtypeMin = 0;
          dtypeMax = 2 ** bitCount - 1;
        } else {
          // Signed integer (int8, int16, etc.)
          log.trace('Signed integer');
          dtypeMin = -(2 ** (bitCount - 1));
          dtypeMax = 2 ** (bitCount - 1) - 1;
        }
      } else {
        // Try explicit endianness format: <byteorder><type><bytes>
        const oldFormatMatch = dtype.match(/^[<>|]([iuf])(\d+)$/);
        if (oldFormatMatch) {
          const typeCode = oldFormatMatch[1];
          const bytes = parseInt(oldFormatMatch[2], 10);
          const bitCount = bytes * 8;
          if (typeCode === 'i') {
            // Signed integer
            log.trace('Signed integer');
            dtypeMin = -(2 ** (bitCount - 1));
            dtypeMax = 2 ** (bitCount - 1) - 1;
          } else if (typeCode === 'u') {
            // Unsigned integer
            log.trace('Unsigned integer');
            dtypeMin = 0;
            dtypeMax = 2 ** bitCount - 1;
          }
        } else {
          log.warn('Could not determine min/max values for dtype: ', dtype);
        }
      }
    } else {
      log.warn('Unrecognized dtype format: ', dtype);
    }
  }

  return { min: dtypeMin, max: dtypeMax };
}

/**
 * Generate a Neuroglancer shader for a given color and min/max values.
 */
function getShader(color: string, minValue: number, maxValue: number): string {
  return `#uicontrol vec3 hue color(default="${color}")
#uicontrol invlerp normalized(range=[${minValue},${maxValue}])
void main(){emitRGBA(vec4(hue*normalized(),1));}`;
}

/**
 * Get a map of axes names to their details.
 */
function getAxesMap(multiscale: omezarr.Multiscale): Record<string, any> {
  const axesMap: Record<string, any> = {};
  const axes = multiscale.axes;
  if (axes) {
    axes.forEach((axis, i) => {
      axesMap[axis.name] = { ...axis, index: i };
    });
  }
  return axesMap;
}

/**
 * Get the Neuroglancer source for a given Zarr array.
 */
function getNeuroglancerSource(dataUrl: string, zarrVersion: 2 | 3): string {
  // Neuroglancer expects a trailing slash
  if (!dataUrl.endsWith('/')) {
    dataUrl = dataUrl + '/';
  }
  return dataUrl + '|zarr' + zarrVersion + ':';
}

/**
 * Get the layer name for a given URL, the same way that Neuroglancer does it.
 */
function getLayerName(dataUrl: string): string {
  // Get the last component of the URL after the final slash (filter(Boolean) discards empty strings)
  return dataUrl.split('/').filter(Boolean).pop() || 'Default';
}

function generateNeuroglancerStateForDataURL(dataUrl: string): string | null {
  log.debug('Generating Neuroglancer state for Zarr array:', dataUrl);
  const layer: Record<string, any> = {
    name: getLayerName(dataUrl),
    source: dataUrl,
    type: 'new'
  };

  // The intent of this state is to reproduce the behavior of the Neuroglancer viewer
  // when a URL is pasted into source input.
  const state: any = {
    layers: [layer],
    selectedLayer: {
      visible: true,
      layer: layer.name
    },
    layout: '4panel-alt'
  };

  // Convert the state to a URL-friendly format
  const stateJson = JSON.stringify(state);
  return encodeURIComponent(stateJson);
}

function generateNeuroglancerStateForZarrArray(
  dataUrl: string,
  zarrVersion: 2 | 3,
  layerType: LayerType
): string | null {
  log.debug('Generating Neuroglancer state for Zarr array:', dataUrl);

  const layer: Record<string, any> = {
    name: getLayerName(dataUrl),
    type: layerType,
    source: getNeuroglancerSource(dataUrl, zarrVersion),
    tab: 'rendering'
  };

  // Create the scaffold for theNeuroglancer viewer state
  const state: any = {
    layers: [layer],
    selectedLayer: {
      visible: true,
      layer: layer.name
    },
    layout: '4panel-alt'
  };

  // Convert the state to a URL-friendly format
  const stateJson = JSON.stringify(state);
  return encodeURIComponent(stateJson);
}

/**
 * Generate a Neuroglancer state for a given Zarr array.
 */
function generateNeuroglancerStateForOmeZarr(
  dataUrl: string,
  zarrVersion: 2 | 3,
  layerType: LayerType,
  multiscale: omezarr.Multiscale,
  arr: zarr.Array<any>,
  omero?: omezarr.Omero | null
): string | null {
  if (!multiscale || !arr) {
    throw new Error(
      'Missing required metadata for Neuroglancer state generation: multiscale=' +
        multiscale +
        ', arr=' +
        arr +
        ', omero=' +
        omero
    );
  }
  log.debug('Generating Neuroglancer state for OME-Zarr:', dataUrl);

  // Convert axes array to a map for easier access
  const axesMap = getAxesMap(multiscale);
  log.debug('Axes map: ', axesMap);

  const { min: dtypeMin, max: dtypeMax } = getMinMaxValues(arr);
  log.debug('Inferred min/max values:', dtypeMin, dtypeMax);

  const defaultLayerName = getLayerName(dataUrl);

  // Create the scaffold for the Neuroglancer viewer state
  const state: any = {
    dimensions: {},
    layers: [],
    layout: '4panel-alt',
    selectedLayer: {
      visible: true,
      layer: defaultLayerName
    }
  };

  const scales = getResolvedScales(multiscale);

  // Set up Neuroglancer dimensions with the expected order
  const dimensionNames = ['x', 'y', 'z', 't'];
  const imageDimensions = new Set(Object.keys(axesMap));
  for (const name of dimensionNames) {
    if (axesMap[name]) {
      const axis = axesMap[name];
      const unit = translateUnitToNeuroglancer(axis.unit);
      state.dimensions[name] = [scales[axis.index], unit];
      imageDimensions.delete(name);
    } else {
      log.trace('Dimension not found in axes map: ', name);
    }
  }

  log.debug('Dimensions: ', state.dimensions);

  // Remove the channel dimension, which will be handled by layers
  imageDimensions.delete('c');
  // Log any unused dimensions
  if (imageDimensions.size > 0) {
    log.warn('Unused dimensions: ', Array.from(imageDimensions));
  }

  let colorIndex = 0;
  const channels = [];
  if (omero && omero.channels) {
    log.debug('Omero channels: ', omero.channels);
    for (let i = 0; i < omero.channels.length; i++) {
      const channelMeta = omero.channels[i];
      const window = channelMeta.window || {};
      channels.push({
        name: channelMeta.label || `Ch${i}`,
        color: channelMeta.color || COLORS[colorIndex++ % COLORS.length],
        pixel_intensity_min: window.min,
        pixel_intensity_max: window.max,
        contrast_limit_start: window.start,
        contrast_limit_end: window.end
      });
    }
  } else {
    // If there is no omero metadata, try to infer channels from the axes
    if ('c' in axesMap) {
      const channelAxis = axesMap['c'].index;
      const numChannels = arr.shape[channelAxis];
      for (let i = 0; i < numChannels; i++) {
        channels.push({
          name: `Ch${i}`,
          color: COLORS[colorIndex++ % COLORS.length],
          pixel_intensity_min: dtypeMin,
          pixel_intensity_max: dtypeMax,
          contrast_limit_start: dtypeMin,
          contrast_limit_end: dtypeMax
        });
      }
    }
  }

  if (channels.length === 0) {
    log.debug('No channels found in metadata, using default shader');
    const layer: Record<string, any> = {
      type: layerType,
      source: getNeuroglancerSource(dataUrl, zarrVersion),
      tab: 'rendering',
      opacity: 1,
      blend: 'additive',
      shaderControls: {
        normalized: {
          range: [dtypeMin, dtypeMax]
        }
      }
    };
    state.layers.push({
      name: defaultLayerName,
      ...layer
    });
  } else {
    // If there is only one channel, make it white
    if (channels.length === 1) {
      channels[0].color = 'white';
    }

    // Add layers for each channel
    channels.forEach((channel, i) => {
      const minValue = channel.pixel_intensity_min ?? dtypeMin;
      const maxValue = channel.pixel_intensity_max ?? dtypeMax;

      // Format color
      let color = channel.color;
      if (/^[\dA-F]{6}$/.test(color)) {
        // Bare hex color, add leading hash for rendering
        color = '#' + color;
      }

      const channelUnit = translateUnitToNeuroglancer(axesMap['c'].unit);
      const localDimensions = { "c'": [1, channelUnit] };
      const transform = { outputDimensions: localDimensions };

      const layer: Record<string, any> = {
        type: layerType,
        source: {
          url: getNeuroglancerSource(dataUrl, zarrVersion),
          transform
        },
        tab: 'rendering',
        opacity: 1,
        blend: 'additive',
        shader: getShader(color, minValue, maxValue),
        localDimensions: localDimensions,
        localPosition: [i]
      };

      // Add shader controls if contrast limits are defined
      const start = channel.contrast_limit_start ?? dtypeMin;
      const end = (channel.contrast_limit_end ?? dtypeMax) * 0.25;
      if (start !== null && end !== null) {
        layer.shaderControls = {
          normalized: {
            range: [start, end]
          }
        };
      }

      state.layers.push({
        name: channel.name,
        ...layer
      });
    });

    // Fix the selected layer name
    state.selectedLayer.layer = channels[0].name;
  }

  log.debug('Neuroglancer state: ', state);

  // Convert the state to a URL-friendly format
  const stateJson = JSON.stringify(state);
  return encodeURIComponent(stateJson);
}

async function getZarrArray(
  dataUrl: string,
  zarrVersion: 2 | 3
): Promise<zarr.Array<any>> {
  log.debug('Getting Zarr array for', dataUrl);
  const store = new zarr.FetchStore(dataUrl);
  return await omezarr.getArray(store, '/', zarrVersion);
}

/**
 * Process the given OME-Zarr array and return the metadata, thumbnail, and Neuroglancer link.
 */
async function getOmeZarrMetadata(dataUrl: string): Promise<Metadata> {
  log.debug('Getting OME-Zarr metadata for', dataUrl);
  const store = new zarr.FetchStore(dataUrl);
  const { arr, shapes, multiscale, omero, scales, zarr_version } =
    await omezarr.getMultiscaleWithArray(store, 0);
  log.debug('Array: ', arr);
  log.debug('Shapes: ', shapes);
  log.debug('Multiscale: ', multiscale);
  log.debug('Omero: ', omero);
  log.debug('Scales: ', scales);
  log.debug('Zarr version: ', zarr_version);

  const metadata: Metadata = {
    arr,
    shapes,
    scales,
    multiscale,
    omero,
    zarrVersion: zarr_version
  };

  return metadata;
}

type ThumbnailResult = [thumbnail: string | null, errorMessage: string | null];

async function getOmeZarrThumbnail(
  dataUrl: string,
  thumbnailSize: number = 300,
  maxThumbnailSize: number = 1024,
  autoBoost: boolean = true
): Promise<ThumbnailResult> {
  log.debug('Getting OME-Zarr thumbnail for', dataUrl);
  const store = new zarr.FetchStore(dataUrl);
  try {
    return [
      await omezarr.renderThumbnail(
        store,
        thumbnailSize,
        autoBoost,
        maxThumbnailSize
      ),
      null
    ];
  } catch (err: unknown) {
    let errorMessage: string | null = null;
    if (err instanceof Error) {
      errorMessage = err.message;
    } else {
      errorMessage = String(err);
    }
    return [null, errorMessage];
  }
}

/**
 * Generate random chunk coordinates for sampling.
 * @param metadata - The metadata object containing the zarr array
 * @param numSamples - The number of random chunk coordinates to generate
 * @returns Array of chunk coordinate strings
 */
function generateRandomChunkCoordinates(
  metadata: Metadata,
  numSamples: number
): string[] {
  const chunks = [];
  const shape = metadata.arr.shape;
  const chunkSizes = metadata.arr.chunks;

  // Calculate the number of chunks per dimension
  const chunksPerDim = shape.map((dim, i) => Math.ceil(dim / chunkSizes[i]));

  for (let i = 0; i < numSamples; i++) {
    // Generate random chunk indices for each dimension
    const chunkIndices = chunksPerDim.map(numChunks =>
      Math.floor(Math.random() * numChunks)
    );
    chunks.push(chunkIndices.join('/'));
  }

  return chunks;
}

/**
 * Get the compressed size of a specific chunk via a HEAD request.
 * @param url - The base URL of the zarr array
 * @param metadata - The metadata object containing the zarr array
 * @param chunkKey - The chunk key (e.g., "0/0/0")
 * @returns Promise<number> - The compressed size in bytes, or -1 if unable to determine
 */
async function getCompressedChunkSize(
  url: string,
  metadata: Metadata,
  chunkKey: string = ''
): Promise<number> {
  try {
    if (!metadata.multiscale) {
      throw new Error('No multiscale metadata');
    }

    // Use the first (full resolution) dataset
    const firstDataset = metadata.multiscale.datasets[0];
    const path = firstDataset.path || '0';

    // Use provided chunk key or default to first chunk
    const actualChunkKey =
      chunkKey || metadata.arr.shape.map(() => '0').join('/');
    const chunkUrl = `${url.replace(/\/$/, '')}/${path}/${actualChunkKey}`;

    log.debug('Getting compressed chunk size for:', chunkUrl);

    const response = await fetch(chunkUrl, { method: 'HEAD' });
    if (!response.ok) {
      log.warn(
        'Failed to get chunk HEAD response:',
        response.status,
        response.statusText
      );
      return -1;
    }

    const contentLength = response.headers.get('content-length');
    if (!contentLength) {
      log.warn('No content-length header in chunk response');
      return -1;
    }

    return parseInt(contentLength, 10);
  } catch (error) {
    log.error('Error getting compressed chunk size:', error);
    return -1;
  }
}

/**
 * Analyze compression ratio by sampling multiple chunks to determine if data is likely segmentation.
 * Uses the minimum compression ratio across samples to avoid bias from masked/empty areas.
 * @param url - The base URL of the zarr array
 * @param metadata - The metadata object containing the zarr array
 * @param numSamples - The number of chunks to sample (default: 5)
 * @returns Promise<LayerType | null> - Returns 'segmentation' if highly compressed, null if inconclusive
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function analyzeCompressionRatio(
  url: string,
  metadata: Metadata,
  numSamples: number = 5
): Promise<LayerType | null> {
  try {
    const startTime = Date.now();
    // Generate random chunk coordinates for sampling
    const chunkKeys = generateRandomChunkCoordinates(metadata, numSamples);
    const compressionRatios: number[] = [];

    // Calculate uncompressed size of a chunk (all chunks have same size)
    const chunkElements = metadata.arr.chunks.reduce((a, b) => a * b, 1);
    const dtypeSize = getDtypeSize(metadata.arr.dtype);
    const uncompressedSize = chunkElements * dtypeSize;

    log.debug(`Sampling ${numSamples} chunks for compression analysis`);

    // Sample each chunk and calculate its compression ratio
    for (const chunkKey of chunkKeys) {
      const compressedSize = await getCompressedChunkSize(
        url,
        metadata,
        chunkKey
      );
      if (compressedSize > 0) {
        const compressionRatio = uncompressedSize / compressedSize;
        compressionRatios.push(compressionRatio);
        log.debug(
          `Chunk ${chunkKey}: compression ratio ${compressionRatio.toFixed(2)} (compressed: ${compressedSize}, uncompressed: ${uncompressedSize})`
        );
      } else {
        log.warn(`Failed to get compressed size for chunk ${chunkKey}`);
      }
    }

    if (compressionRatios.length === 0) {
      log.debug('Could not determine compression ratios for any chunks');
      return null;
    }

    // Take the minimum compression ratio to avoid bias from masked/empty areas
    const minCompressionRatio = Math.min(...compressionRatios);
    log.debug(
      `Minimum compression ratio: ${minCompressionRatio.toFixed(2)} (from ${compressionRatios.length} samples)`
    );

    const elapsedTime = Date.now() - startTime;
    log.debug(`Elapsed time for compression ratio analysis: ${elapsedTime}ms`);

    // If even the least compressed chunk has high compression (ratio > 10), likely segmentation data
    if (minCompressionRatio > 10) {
      log.debug(
        `High minimum compression ratio (${minCompressionRatio.toFixed(2)} > 10) suggests segmentation data`
      );
      return 'segmentation';
    }

    return 'image';
  } catch (error) {
    log.error('Error in compression ratio analysis:', error);
    return null;
  }
}

/**
 * Fetches a center chunk from a zarr array and analyzes values
 * to compute the percentage of unique values.
 *
 * @param metadata - The metadata object containing the zarr array
 * @param cropSize - The number of values to sample from each spatial axis (default: 32)
 * @returns Promise<number> - The percentage of unique values in the sampled data
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getPercentUniqueValues(
  metadata: Metadata,
  url: string,
  cropSize: number = 32
): Promise<number> {
  const startTime = Date.now();
  try {
    if (!metadata.multiscale) {
      throw new Error('No multiscale metadata');
    }

    const store = new zarr.FetchStore(url);
    const paths: Array<string> = metadata.multiscale.datasets.map(d => d.path);
    const path = paths[0];
    const arr = await omezarr.getArray(store, path, metadata.zarrVersion);

    // Select a crop from the center of the array
    const axes = metadata.multiscale.axes;
    const cropSelection = arr.shape.map((dimSize, index) => {
      const axisName = axes?.[index].name;
      if (axisName === 'x' || axisName === 'y' || axisName === 'z') {
        const center = Math.floor(dimSize / 2);
        const cropStart = center - arr.chunks[index] / 2;
        return zarr.slice(cropStart, cropStart + cropSize);
      }
      // Skip non-spatial axes
      return 0;
    });

    log.debug('Crop selection: ', cropSelection);

    const cropChunk = await zarr.get(arr, cropSelection);
    if (!cropChunk || !cropChunk.data) {
      throw new Error('No data returned from crop chunk');
    }
    const data = cropChunk.data as any;
    const uniqueValues = new Set<number>();
    for (let i = 0; i < data.length; i++) {
      const value = Number(data[i]);
      if (!isNaN(value) && isFinite(value)) {
        uniqueValues.add(value);
      }
    }

    log.debug('Unique values: ', uniqueValues.size);
    log.debug('Data length: ', data.length);
    log.debug('Elapsed time: ', Date.now() - startTime);
    return uniqueValues.size / data.length;
  } catch (error) {
    log.error('Error in getPercentUniqueValues:', error);
    throw error;
  }
}

/**
 * Calculates the median of an array of numbers.
 * @param values - Array of numbers
 * @returns The median value
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateMedian(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Analyzes a thumbnail image by taking N random crops and calculating
 * the maximum unique value ratio across all crops.
 * @param thumbnailDataUrl - Base64 data URL of the thumbnail image
 * @param numSamples - Number of random crops to analyze (default: 20)
 * @param cropSize - Size of the random crops (default: 5)
 * @returns Promise<number> - The maximum ratio of unique values to total values
 */
async function analyzeThumbnailUniqueValues(
  thumbnailDataUrl: string,
  numSamples: number = 20,
  cropSize: number = 5
): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const ratios: number[] = [];

        // Ensure we have enough space for crops
        if (img.width < cropSize || img.height < cropSize) {
          log.warn(
            `Thumbnail too small (${img.width}x${img.height}) for ${cropSize}x${cropSize} crops, using full image`
          );
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;
          const uniqueValues = new Set<string>();

          for (let i = 0; i < data.length; i += 4) {
            const rgb = `${data[i]},${data[i + 1]},${data[i + 2]}`;
            uniqueValues.add(rgb);
          }

          const totalPixels = data.length / 4;
          const ratio = uniqueValues.size / totalPixels;
          resolve(ratio);
          return;
        }

        // Generate random crop positions and analyze each
        for (let sample = 0; sample < numSamples; sample++) {
          const x = Math.floor(Math.random() * (img.width - cropSize));
          const y = Math.floor(Math.random() * (img.height - cropSize));

          const cropData = ctx.getImageData(x, y, cropSize, cropSize);
          const data = cropData.data;
          const uniqueValues = new Set<string>();

          for (let i = 0; i < data.length; i += 4) {
            // Use RGB values (ignore alpha channel for uniqueness)
            const rgb = `${data[i]},${data[i + 1]},${data[i + 2]}`;
            uniqueValues.add(rgb);
          }

          const totalPixels = cropSize * cropSize;
          const ratio = uniqueValues.size / totalPixels;
          log.debug(
            'totalPixels: ',
            totalPixels,
            ', uniqueValues: ',
            uniqueValues.size,
            ', ratio: ',
            ratio
          );

          ratios.push(ratio);
        }

        const maxRatio = Math.max(...ratios);

        log.debug(
          `Thumbnail analysis: analyzed ${numSamples} random crops, max unique value ratio: ${maxRatio.toFixed(4)} (range: ${Math.min(...ratios).toFixed(4)}-${Math.max(...ratios).toFixed(4)})`
        );
        resolve(maxRatio);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load thumbnail image'));
    };

    img.src = thumbnailDataUrl;
  });
}

/**
 * Determines the layer type for the given OME-Zarr metadata.
 * If heuristical detection is disabled, returns "image".
 * First checks compression ratio by comparing compressed chunk size to uncompressed size.
 * If compression ratio indicates segmentation data, returns "segmentation" without further analysis.
 * Otherwise, analyzes unique values to determine if it's a segmentation or image.
 *
 * @param metadata - The metadata object containing the zarr array and multiscale info
 * @param useHeuristicalDetection - If true, skip heuristical detection and return "auto"
 * @param thumbnailDataUrl - Optional thumbnail data URL for additional analysis
 * @returns Promise<LayerType> - The determined layer type
 */
async function getLayerType(
  metadata: Metadata,
  url: string,
  useHeuristicalDetection = true,
  thumbnailDataUrl?: string | null
): Promise<LayerType> {
  try {
    if (!metadata.multiscale) {
      return 'image';
    }

    if (!useHeuristicalDetection) {
      log.debug('Heuristical layer type detection is disabled, assuming image');
      return 'image';
    }

    // First, check compression ratio
    // const compressionResult = await analyzeCompressionRatio(url, metadata);
    // if (compressionResult) {
    //   return compressionResult;
    // }

    // If thumbnail is available, analyze it first (faster and more reliable)
    if (thumbnailDataUrl) {
      try {
        const thumbnailUniqueRatio =
          await analyzeThumbnailUniqueValues(thumbnailDataUrl);
        log.debug('Thumbnail unique value ratio:', thumbnailUniqueRatio);

        // If thumbnail has very low unique value ratio, it's likely segmentation
        if (thumbnailUniqueRatio < 0.2) {
          const layerType = 'segmentation';
          log.debug(
            'Determined layer type based on thumbnail analysis:',
            layerType
          );
          return layerType;
        } else {
          const layerType = 'image';
          log.debug(
            'Determined layer type based on thumbnail analysis:',
            layerType
          );
          return layerType;
        }
      } catch (error) {
        log.warn(
          'Failed to analyze thumbnail, falling back to array analysis:',
          error
        );
      }
    } else {
      log.debug('No thumbnail available, returning image');
      return 'image';
    }

    // // Fall back to unique values analysis of array data
    // const uniqueValuePercent = await getPercentUniqueValues(metadata, url);
    // log.debug('Percentage unique values:', uniqueValuePercent);

    // const layerType = uniqueValuePercent < 0.001 ? 'segmentation' : 'image';
    // log.debug('Determined layer type based on unique values:', layerType);

    // return layerType;
  } catch (error) {
    log.error('Error determining layer type:', error);
    // Default to 'image' if we can't determine the type
  }
  log.debug('Returning image as default');
  return 'image';
}

export {
  getScaleTransform,
  getResolvedScales,
  getZarrArray,
  getOmeZarrMetadata,
  getOmeZarrThumbnail,
  generateNeuroglancerStateForDataURL,
  generateNeuroglancerStateForZarrArray,
  generateNeuroglancerStateForOmeZarr,
  translateUnitToNeuroglancer,
  getLayerType,
  analyzeThumbnailUniqueValues
};
