
import * as zarr from "zarrita";
import { fetchFileAsJson } from "./utils";


async function processImage(zattrUrl: string): Promise<object | null> {
    // Fetch the image data
    const zattrsContent = await fetchFileAsJson(zattrUrl);

    if (!zattrsContent || !('multiscales' in zattrsContent)) {
      console.error("No multiscales metadata found in ", zattrUrl);
      return null;
    }

    const multiscales = zattrsContent.multiscales as any[];
    if (multiscales.length === 0) {
      console.error("Empty multiscales found in ", zattrUrl);
      return null;
    }

    if (multiscales.length > 1) {
      console.error("Using first multiscale found in ", zattrUrl);
    }

    const multiscale = multiscales[0];
    const version = multiscale.version;
    if (version !== '0.4') {
      console.error("Unsupported OME-Zarr version: ", version);
      return null;
    }
    
    // Use highest resolution
    const fullres = multiscale.datasets[0];
    const fullresPath = fullres.path;

    const zarrayContent = await fetchFileAsJson(zattrUrl.replace('.zattrs', fullresPath + '/.zarray'));
    


    
    // Get the array metadata
    const arrayAttrsPath = `${fullresPath}/.zarray`;
    const arrayAttrsData = await store.getItem(arrayAttrsPath);
    if (!arrayAttrsData) {
      throw new Error(`Dataset with path ${fullresPath} does not exist`);
    }
    
    const arrayAttrs = JSON.parse(new TextDecoder().decode(arrayAttrsData));
    const shape = arrayAttrs.shape;
    const chunks = arrayAttrs.chunks;
    const dtype = arrayAttrs.dtype;
    const compressor = arrayAttrs.compressor ? arrayAttrs.compressor.id : 'none';
    
    // Get scale transformation
    const scaleTransform = fullres.coordinateTransformations?.find((t: any) => t.type === 'scale');
    if (!scaleTransform) {
      throw new Error("No scale transformation found in the full scale dataset");
    }
    
    const scales = scaleTransform.scale;
    
    const axesMap: Record<string, any> = {};
    const axesNames: string[] = [];
    const dimensionsVoxels: string[] = [];
    const voxelSizes: string[] = [];
    const dimensions: string[] = [];
    const chunksArray: string[] = [];
    let numChannels = 1;
    let numTimepoints = 1;
    for (let i = 0; i < multiscale.axes.length; i++) {
      const axis = multiscale.axes[i];
      const name = axis.name;
      axesNames.push(name);
      const extent = shape[i];
      const chunk = chunks[i];
      const scale = scales[i];
      let unit = '';
      
      if (axis.type === 'space') {
        unit = axis.unit;
        // Unit translation
        if (unit === 'micrometer' || unit === 'micron') unit = 'um';
        if (unit === 'nanometer') unit = 'nm';
        let printUnit = unit;
        if (unit === 'um') printUnit = "μm";
        voxelSizes.push(`${scale.toFixed(2)} ${printUnit}`);
        dimensions.push(`${(extent * scale).toFixed(2)} ${printUnit}`);
      } else if (axis.type === 'channel') {
        numChannels = extent;
        voxelSizes.push(`${scale}`);
        dimensions.push(`${extent * scale}`);
      } else if (axis.type === 'time') {
        numTimepoints = extent;
        voxelSizes.push(`${scale}`);
        dimensions.push(`${extent * scale}`);
      }
      
      dimensionsVoxels.push(`${extent}`);
      chunksArray.push(`${chunk}`);
      axesMap[name] = {
        name,
        scale,
        unit,
        extent,
        chunk
      };
    }
    
    // Get OMERO metadata for channels
    
    const channels: Channel[] = [];
    
    
    
    const image: Image = {
      group_path: '/',
      num_channels: numChannels,
      num_timepoints: numTimepoints,
      voxel_sizes: voxelSizes,
      dimensions: dimensions,
      dimensions_voxels: dimensionsVoxels,
      chunk_size: chunksArray,
      dtype: dtype,
      compression: compressor,
      channels: channels,
      axes_order: axesNames.join(''),
      axes: axesMap
    };
    
    return image;
  }


  /**
   * Generates a Neuroglancer viewer state for an OME-Zarr image
   * @param image The OME-Zarr image metadata
   * @param url The URL to the zarr data
   * @returns A Neuroglancer viewer state as a JSON object
   */
  function generateNeuroglancerLink(zattrsContent: any, zarrayContent: any): object | null {

    const multiscales = zattrsContent.multiscales as any[];
    if (multiscales.length === 0) {
      console.error("Empty multiscales found in ", zattrUrl);
      return null;
    }

    if (multiscales.length > 1) {
      console.error("Using first multiscale found in ", zattrUrl);
    }

    const multiscale = multiscales[0];

    // Create the basic viewer state
    const state: any = {
      dimensions: {
        names: [],
        scales: [],
        units: []
      },
      position: [],
      layers: [],
      layout: '4panel'
    };

    // Convert axes array to a map for easier access
    const axesMap: Record<string, any> = {};
    if (multiscale.axes && Array.isArray(multiscale.axes)) {
      for (let i = 0; i < multiscale.axes.length; i++) {
        const axis = multiscale.axes[i];
        if (axis.name) {
          axesMap[axis.name] = axis;
          axesMap[axis.name].index = i;
        }
      }
    } else {
      console.error("No axes found in multiscale metadata");
      return null;
    }

    // Set up Neuroglancer dimensions with the expected order
    const imageDimensions = new Set(axesMap.keys());
    const dimensionNames = ['x', 'y', 'z', 't'];
    for (const name of dimensionNames) {
      if (axesMap[name]) {
        const axis = axesMap[name];
        state.dimensions.names.push(name);
        state.dimensions.scales.push(axis.scale);
        state.dimensions.units.push(axis.unit);
        // Center the image in the viewer
        state.position.push(Math.floor(axis.extent / 2));
        imageDimensions.delete(name);
      }
    }

    // Add any remaining dimensions
    if (imageDimensions.size > 0) {
      console.error("Remaining dimensions not found in axes map: ", Array.from(imageDimensions));
    }
    
    if (state.dimensions.names.length === 0) {
      console.error("No XYZT dimensions could be determined from the axes metadata");
      return null;
    }

    // Set up the zoom
    // TODO: how do we determine the best zoom from the metadata?
    state.crossSectionScale = 4.5;
    state.projectionScale = 2048;

    // Extract min/max values based on data type encoding spec
    // https://zarr-specs.readthedocs.io/en/latest/v2/v2.0.html#data-type-encoding
    let dtypeMin = 0;
    let dtypeMax = 65535; // Default fallback
    
    if (zattrsContent.dtype) {
      const dtype = zattrsContent.dtype;
      // Parse the dtype format: <byteorder><type><bytes>
      const match = dtype.match(/^[<>|]([iuf])(\d+)$/);
      
      if (match) {
        const typeCode = match[1];
        const bytes = parseInt(match[2], 10);
        const bitCount = bytes * 8;
        if (typeCode === 'i') {
          // Signed integer
          dtypeMin = -(2 ** (bitCount - 1));
          dtypeMax = 2 ** (bitCount - 1) - 1;
        } else if (typeCode === 'u') {
          // Unsigned integer
          dtypeMin = 0;
          dtypeMax = 2 ** bitCount - 1;
        }
        else {
          console.error("Cannot determine min/max values for dtype: ", dtype);
        }
      }
    }

    const colors = ['magenta', 'green', 'cyan', 'white', 'red', 'green', 'blue'];
    let colorIndex = 0;
    
    const channels = [];
    if ('omero' in zattrsContent && zattrsContent.omero) {
      if ('channels' in zattrsContent.omero && zattrsContent.omero.channels) {
      for (let i = 0; i < zattrsContent.omero.channels.length; i++) {
        const channelMeta = zattrsContent.omero.channels[i];
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
      const channelAxis = axesMap['c'].index;
      const numChannels = zarrayContent.shape[channelAxis];
      // If there is no omero metadata, we do the best we can
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

    // If there is only one channel, make it white
    if (channels.length === 1) {
      channels[0].color = 'white';
    }

    // Add layers for each channel
    image.channels.forEach((channel, i) => {
      const minValue = channel.pixel_intensity_min ?? dtypeMin;
      const maxValue = channel.pixel_intensity_max ?? dtypeMax;

      // Format color
      let color = channel.color;
      if (/^[\dA-F]{6}$/.test(color)) {
        // Bare hex color, add leading hash for rendering
        color = '#' + color;
      }

      const layer = {
        type: 'image',
        source: 'zarr://' + url,
        tab: 'rendering',
        opacity: 1,
        blend: 'additive',
        shader: `#uicontrol vec3 hue color(default="${color}")
#uicontrol invlerp normalized(range=[${minValue},${maxValue}])
void main(){emitRGBA(vec4(hue*normalized(),1));}`,
        layerDimensions: {
          names: ["c'"],
          scales: [1],
          units: ['']
        },
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

    return state;
  }


  
  
  export { processImage };