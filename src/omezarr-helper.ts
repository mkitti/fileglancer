import * as zarr from "zarrita";
import * as omezarr from "ome-zarr.js";

// Copied since ome-zarr.js doesn't export the types
// TODO: use the types from ome-zarr.js when they become available
export interface Multiscale {
  axes: Axis[];
  /**
   * @minItems 1
   */
  datasets: [Dataset, ...Dataset[]];
  version?: "0.4" | null;
  coordinateTransformations?: [unknown] | [unknown, unknown] | null;
  metadata?: {
    [k: string]: unknown;
  };
  name?: unknown;
  type?: {
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * Model for an element of `Multiscale.axes`.
 *
 * See https://ngff.openmicroscopy.org/0.4/#axes-md.
 */
export interface Axis {
  name: string;
  type?: string | null;
  unit?: unknown;
  [k: string]: unknown;
}
/**
 * An element of Multiscale.datasets.
 */
export interface Dataset {
  path: string;
  coordinateTransformations: [unknown] | [unknown, unknown];
  [k: string]: unknown;
}
/**
 * omero model.
 */
export interface Omero {
  channels: Channel[];
  rdefs: {
    defaultT: number;
    defaultZ: number;
    model: "greyscale" | "color";
  };
  [k: string]: unknown;
}
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

const unitMap: Record<string, string> = {
  "micron": "um",       // Micron is not a valid UDUNITS-2, but some data still uses it
  "micrometer": "um",
  "millimeter": "mm",
  "nanometer": "nm",
  "centimeter": "cm",
  "meter": "m",
  "second": "s",
  "millisecond": "ms",
  "microsecond": "us",
  "nanosecond": "ns"
};

/**
 * Convert UDUNITS-2 units to Neuroglancer SI units.
 */
function translateUnitToNeuroglancer(unit: string): string {
  if (unit === null || unit === undefined) {
    return '';
  }
  if (unitMap[unit]) {
    return unitMap[unit];
  }
  return unit;
}

/**
 * Get the min and max values for a given Zarr array, based on the dtype:
 * https://zarr-specs.readthedocs.io/en/latest/v2/v2.0.html#data-type-encoding
 */
function getMinMaxValues(arr: zarr.Array<any>): { min: number, max: number } {

  // Default values
  let dtypeMin = 0;
  let dtypeMax = 65535;
  
  if (arr.dtype) {
    const dtype = arr.dtype;
    console.log("Parsing dtype:", dtype);
    // Parse numpy-style dtype strings (int8, int16, uint8, etc.)
    if (dtype.includes('int') || dtype.includes('uint')) {
      // Extract the numeric part for bit depth
      const bitMatch = dtype.match(/\d+/);
      if (bitMatch) {
        const bitCount = parseInt(bitMatch[0]);
        if (dtype.startsWith('u')) {
          // Unsigned integer (uint8, uint16, etc.)
          console.log("Unsigned integer");
          dtypeMin = 0;
          dtypeMax = 2 ** bitCount - 1;
        } else {
          // Signed integer (int8, int16, etc.)
          console.log("Signed integer");
          dtypeMin = -(2 ** (bitCount - 1));
          dtypeMax = 2 ** (bitCount - 1) - 1;
        }
      } 
      else {
        // Try explicit endianness format: <byteorder><type><bytes>
        const oldFormatMatch = dtype.match(/^[<>|]([iuf])(\d+)$/);
        if (oldFormatMatch) {
          const typeCode = oldFormatMatch[1];
          const bytes = parseInt(oldFormatMatch[2], 10);
          const bitCount = bytes * 8;
          if (typeCode === 'i') {
            // Signed integer
            console.log("Signed integer");
            dtypeMin = -(2 ** (bitCount - 1));
            dtypeMax = 2 ** (bitCount - 1) - 1;
          } else if (typeCode === 'u') {
            // Unsigned integer
            console.log("Unsigned integer");
            dtypeMin = 0;
            dtypeMax = 2 ** bitCount - 1;
          }
        } else {
          console.warn("Could not determine min/max values for dtype: ", dtype);
        }
      }
    }
    else {
      console.warn("Unrecognized dtype format: ", dtype);
    }
  }

  return { min: dtypeMin, max: dtypeMax };
}

/**
 * Generate a Neuroglancer state for a given Zarr array.
 */
function generateNeuroglancerState(dataUrl: string, multiscale: Multiscale, arr: zarr.Array<any>, omero?: Omero): string | null {
  console.log("Generating Neuroglancer state for", dataUrl);

  // Convert axes array to a map for easier access
  const axesMap: Record<string, any> = {};
  const axes = multiscale.axes;
  if (axes) {
    axes.forEach((axis, i) => {
      axesMap[axis.name] = { ...axis, index: i };
    });
    console.log("Axes map: ", axesMap);
  } else {
    console.error("No axes found in multiscale metadata");
    return null;
  }

  const { min: dtypeMin, max: dtypeMax } = getMinMaxValues(arr);
  console.log("Inferring min/max values:", dtypeMin, dtypeMax);

  // Create the scaffold for theNeuroglancer viewer state
  const state: any = {
    dimensions: {},
    position: [],
    layers: [],
    layout: '4panel'
  };

  const fullres = multiscale.datasets[0];
  // TODO: handle multiple scale transformations
  const scaleTransform: any = fullres.coordinateTransformations?.find((t: any) => t.type === 'scale');
  if (!scaleTransform) {
    console.error("No scale transformation found in the full scale dataset");
    return null;
  }
  const scale = scaleTransform.scale;

  // Set up Neuroglancer dimensions with the expected order
  const imageDimensions = new Set(Object.keys(axesMap));
  const dimensionNames = ['x', 'y', 'z', 't'];
  for (const name of dimensionNames) {
    if (axesMap[name]) {
      const axis = axesMap[name];
      const unit = translateUnitToNeuroglancer(axis.unit)

      state.dimensions[name] = [
        scale[axis.index],
        unit
      ]
      // Center the image in the viewer
      const extent = arr.shape[axis.index];
      console.log("Extent: ", extent);
      state.position.push(Math.floor(extent / 2));
      imageDimensions.delete(name);
    }
    else {
      console.warn("Dimension not found in axes map: ", name);
    }
  }

  console.log("State dimensions: ", state.dimensions);
  console.log("State position: ", state.position);

  // Remove the channel dimension, which will be handled by layers
  imageDimensions.delete('c');
  // Log any unused dimensions
  if (imageDimensions.size > 0) {
    console.warn("Unused dimensions: ", Array.from(imageDimensions));
  }
  
  // Set up the zoom
  // TODO: how do we determine the best zoom from the metadata?
  state.crossSectionScale = 4.5;
  state.projectionScale = 2048;


  const colors = ['magenta', 'green', 'cyan', 'white', 'red', 'green', 'blue'];
  let colorIndex = 0;
  
  const channels = [];
  if (omero) {
    if (omero.channels) {
      for (let i = 0; i < omero.channels.length; i++) {
        const channelMeta = omero.channels[i];
        const window = channelMeta.window || {};
        channels.push({
          name: channelMeta.label || `Ch${i}`,
          color: channelMeta.color || colors[colorIndex++ % colors.length],
          pixel_intensity_min: window.min,
          pixel_intensity_max: window.max,
          contrast_limit_start: window.start,
          contrast_limit_end: window.end
        });
      }
    } else {
      // If there is no omero metadata, we do the best we can
      const channelAxis = axesMap['c'].index;
      const numChannels = arr.shape[channelAxis];
      for (let i = 0; i < numChannels; i++) {
        channels.push({ 
          name: `Ch${i}`, 
          color: colors[colorIndex++ % colors.length],
          pixel_intensity_min: dtypeMin,
          pixel_intensity_max: dtypeMax,
          contrast_limit_start: dtypeMin,
          contrast_limit_end: dtypeMax
        });
      }
    }
  }

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

    const layer: Record<string, any> = {
      type: 'image',
      source: 'zarr://' + dataUrl,
      tab: 'rendering',
      opacity: 1,
      blend: 'additive',
      shader: `#uicontrol vec3 hue color(default="${color}")
#uicontrol invlerp normalized(range=[${minValue},${maxValue}])
void main(){emitRGBA(vec4(hue*normalized(),1));}`,
      localDimensions: { "c'": [1, ''] },
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

  // Convert the state to a URL-friendly format
  const stateJson = JSON.stringify(state);
  console.log("Neuroglancer state: ", stateJson);

  return encodeURIComponent(stateJson);
}

/**
 * Process the given OME-Zarr array and return the metadata, thumbnail, and Neuroglancer link.
 */
async function getOmeZarrMetadata(dataUrl: string, thumbnailSize: number = 300, maxThumbnailSize: number = 1024, autoBoost: boolean = true): Promise<{
  arr: zarr.Array<any>;
  shapes: number[][] | undefined; 
  multiscale: Multiscale;
  omero: Omero | null | undefined;
  scales: number[][];
  zarr_version: 2 | 3;
  neuroglancerState: string | null;
  thumbnail: string | null;
}> {
  const store = new zarr.FetchStore(dataUrl);
  let { arr, shapes, multiscale, omero, scales, zarr_version } = await omezarr.getMultiscaleWithArray(store, 0);
  const neuroglancerState = generateNeuroglancerState(dataUrl, multiscale as Multiscale, arr, omero as Omero);
  const thumbnail = await omezarr.renderThumbnail(store, thumbnailSize, autoBoost, maxThumbnailSize);

  console.log("Zarr version: ", zarr_version);
  console.log("Multiscale: ", multiscale);
  console.log("Omero: ", omero);
  console.log("Arr: ", arr);
  console.log("Shapes: ", shapes);

  return { arr, shapes, multiscale, omero, scales, zarr_version, neuroglancerState, thumbnail };
}


export { 
  getOmeZarrMetadata
}; 
