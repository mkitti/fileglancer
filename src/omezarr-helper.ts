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

async function getZarrArray(dataUrl: string): Promise<zarr.Array<any>> {
  log.debug('Getting Zarr array for', dataUrl);
  const zarrVersion = 2;
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
 * Fetches a chunk-aligned crop from a zarr array and analyzes all values
 * in the crop to compute the percentage of unique values. If the crop size
 * is smaller than the chunk size, only a single chunk is fetched.
 *
 * @param metadata - The metadata object containing the zarr array
 * @param cropSize - The size of the crop to take (default: 64)
 * @returns Promise<number> - The percentage of unique values in the cropped data
 */
async function getPercentUniqueValues(
  metadata: Metadata,
  cropSize: number = 32
): Promise<number> {
  try {
    const arr = metadata.arr;
    const arrayShape = arr.shape;
    const chunks = arr.chunks;

    log.debug('Array shape:', arrayShape);
    log.debug('Chunk sizes:', chunks);

    // Calculate the center point of the array
    const centerPoint = arrayShape.map(dimSize => Math.floor(dimSize / 2));

    // Align crop to chunk boundaries
    const startIndices: number[] = [];
    const endIndices: number[] = [];

    for (let i = 0; i < arrayShape.length; i++) {
      const chunkSize = chunks[i];
      const center = centerPoint[i];

      // Find which chunk contains the center point
      const centerChunkIndex = Math.floor(center / chunkSize);

      // Calculate the start and end indices
      startIndices[i] = centerChunkIndex * cropSize;
      endIndices[i] = startIndices[i] + cropSize;
    }

    // Create selection slice for the crop
    const selection = startIndices.map((start, i) => [start, endIndices[i]]);

    log.debug(
      'Crop dimensions:',
      selection.map(([start, end]) => end - start)
    );

    // Fetch the crop data using zarrita's get API
    const cropSelection = selection.map(([start, end]) =>
      zarr.slice(start, end)
    );
    const cropData = await zarr.get(arr, cropSelection);

    // Convert to typed array for easier processing
    let flatData: ArrayLike<number>;
    if (
      cropData.data instanceof ArrayBuffer ||
      ArrayBuffer.isView(cropData.data)
    ) {
      flatData = new Float32Array(cropData.data as ArrayBuffer);
    } else if (Array.isArray(cropData.data)) {
      flatData = cropData.data as number[];
    } else {
      // Handle TypedArray case
      flatData = cropData.data as ArrayLike<number>;
    }
    const totalValues = flatData.length;

    log.debug('Total values in chunk-aligned crop:', totalValues);

    // Analyze all values in the crop
    const uniqueValues = new Set<number>();
    for (let i = 0; i < totalValues; i++) {
      const value = flatData[i];
      if (!isNaN(value)) {
        uniqueValues.add(value);
      }
    }

    const uniqueCount = uniqueValues.size;
    log.debug(
      `Analyzed ${totalValues} values, found ${uniqueCount} unique values`
    );

    return uniqueCount / totalValues;
  } catch (error) {
    log.error(
      'Error fetching chunk-aligned crop for unique value analysis:',
      error
    );
    throw error;
  }
}

/**
 * Determines the layer type for the given metadata.
 * If heuristical detection is disabled, returns "image".
 * If the image has multiple timepoints or multiple channels,
 * returns "image" without counting unique values.
 *
 * Otherwise, analyzes unique values to determine if it's a segmentation or image.
 *
 * @param metadata - The metadata object containing the zarr array and multiscale info
 * @param useHeuristicalDetection - If true, skip heuristical detection and return "auto"
 * @returns Promise<LayerType> - The determined layer type
 */
async function getLayerType(
  metadata: Metadata,
  useHeuristicalDetection = true
): Promise<LayerType> {
  try {
    // If heuristical detection is disabled, return "auto"
    if (!useHeuristicalDetection) {
      log.debug('Heuristical layer type detection is disabled, assuming image');
      return 'image';
    }

    // If no multiple timepoints or channels, analyze unique values
    const uniqueValuePercent = await getPercentUniqueValues(metadata);
    log.debug('Percentage unique values:', uniqueValuePercent);

    const layerType = uniqueValuePercent < 0.001 ? 'segmentation' : 'image';
    log.debug('Determined layer type based on unique values:', layerType);

    return layerType;
  } catch (error) {
    log.error('Error determining layer type:', error);
    // Default to 'image' if we can't determine the type
    return 'image';
  }
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
  getLayerType
};
