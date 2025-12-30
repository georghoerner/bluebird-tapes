// WebGPU-accelerated SSIM character matching

// SSIM compute shader
const ssimShaderCode = `
struct Params {
  numCells: u32,
  numTemplates: u32,
  pixelsPerCell: u32,
  k1: f32,
  k2: f32,
  L: f32,
}

@group(0) @binding(0) var<storage, read> cells: array<f32>;
@group(0) @binding(1) var<storage, read> templates: array<f32>;
@group(0) @binding(2) var<storage, read_write> results: array<u32>;
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let cellIdx = global_id.x;
  if (cellIdx >= params.numCells) {
    return;
  }

  let cellOffset = cellIdx * params.pixelsPerCell;
  let n = f32(params.pixelsPerCell);
  let c1 = (params.k1 * params.L) * (params.k1 * params.L);
  let c2 = (params.k2 * params.L) * (params.k2 * params.L);

  // Calculate cell mean
  var cellMean: f32 = 0.0;
  for (var i: u32 = 0u; i < params.pixelsPerCell; i++) {
    cellMean += cells[cellOffset + i];
  }
  cellMean /= n;

  // Calculate cell variance
  var cellVar: f32 = 0.0;
  for (var i: u32 = 0u; i < params.pixelsPerCell; i++) {
    let diff = cells[cellOffset + i] - cellMean;
    cellVar += diff * diff;
  }
  cellVar /= n;

  var bestSsim: f32 = -1.0;
  var bestTemplate: u32 = 0u;

  // Compare against all templates
  for (var t: u32 = 0u; t < params.numTemplates; t++) {
    let templateOffset = t * params.pixelsPerCell;

    // Calculate template mean
    var templateMean: f32 = 0.0;
    for (var i: u32 = 0u; i < params.pixelsPerCell; i++) {
      templateMean += templates[templateOffset + i];
    }
    templateMean /= n;

    // Calculate template variance and covariance
    var templateVar: f32 = 0.0;
    var covar: f32 = 0.0;
    for (var i: u32 = 0u; i < params.pixelsPerCell; i++) {
      let cellDiff = cells[cellOffset + i] - cellMean;
      let templateDiff = templates[templateOffset + i] - templateMean;
      templateVar += templateDiff * templateDiff;
      covar += cellDiff * templateDiff;
    }
    templateVar /= n;
    covar /= n;

    // SSIM formula
    let numerator = (2.0 * cellMean * templateMean + c1) * (2.0 * covar + c2);
    let denominator = (cellMean * cellMean + templateMean * templateMean + c1) * (cellVar + templateVar + c2);
    let ssim = numerator / denominator;

    if (ssim > bestSsim) {
      bestSsim = ssim;
      bestTemplate = t;
    }
  }

  results[cellIdx] = bestTemplate;
}
`;

export interface GpuSsimMatcher {
  match: (cells: Float32Array, pixelsPerCell: number) => Promise<Uint32Array>;
  destroy: () => void;
}

export interface GpuDiagnostics {
  hasNavigatorGpu: boolean;
  hasAdapter: boolean;
  hasDevice: boolean;
  adapterInfo?: GPUAdapterInfo;
  error?: string;
}

export async function checkWebGpuSupport(): Promise<GpuDiagnostics> {
  const diagnostics: GpuDiagnostics = {
    hasNavigatorGpu: false,
    hasAdapter: false,
    hasDevice: false,
  };

  // Debug: log secure context and origin info
  console.log('WebGPU Debug:', {
    isSecureContext: window.isSecureContext,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    hasNavigatorGpu: 'gpu' in navigator,
    navigatorGpuType: typeof navigator.gpu,
  });

  if (!navigator.gpu) {
    if (!window.isSecureContext) {
      diagnostics.error = 'Not a secure context. Access via https:// or localhost (not 127.0.0.1 or IP address)';
    } else {
      diagnostics.error = 'navigator.gpu not available despite secure context. Check browser flags or try a different browser.';
    }
    return diagnostics;
  }
  diagnostics.hasNavigatorGpu = true;

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      diagnostics.error = 'No GPU adapter found. Check GPU drivers and browser flags.';
      return diagnostics;
    }
    diagnostics.hasAdapter = true;
    diagnostics.adapterInfo = adapter.info;

    const device = await adapter.requestDevice();
    if (!device) {
      diagnostics.error = 'Failed to create GPU device';
      return diagnostics;
    }
    diagnostics.hasDevice = true;
    device.destroy();
  } catch (e) {
    diagnostics.error = `WebGPU error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return diagnostics;
}

export async function createGpuSsimMatcher(
  templates: Float32Array,
  numTemplates: number,
  templatePixelsPerCell: number
): Promise<GpuSsimMatcher | null> {
  // Check for WebGPU support
  if (!navigator.gpu) {
    console.warn('WebGPU not supported: navigator.gpu is undefined');
    console.warn('On Linux, try launching Chrome with: --enable-unsafe-webgpu --enable-features=Vulkan');
    return null;
  }

  let adapter: GPUAdapter | null;
  try {
    adapter = await navigator.gpu.requestAdapter();
  } catch (e) {
    console.warn('Failed to request GPU adapter:', e);
    return null;
  }

  if (!adapter) {
    console.warn('No WebGPU adapter found');
    return null;
  }

  // Log adapter info for debugging
  try {
    const info = adapter.info;
    console.log('GPU Adapter:', info.vendor, info.architecture, info.device);
  } catch (e) {
    console.log('Could not get adapter info:', e);
  }

  let device: GPUDevice;
  try {
    device = await adapter.requestDevice();
  } catch (e) {
    console.warn('Failed to create GPU device:', e);
    return null;
  }

  // Create shader module
  const shaderModule = device.createShaderModule({
    code: ssimShaderCode,
  });

  // Create pipeline
  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  });

  // Create template buffer (static)
  const templateBuffer = device.createBuffer({
    size: templates.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(templateBuffer, 0, templates.buffer);

  // Create params buffer
  const paramsBuffer = device.createBuffer({
    size: 24, // 6 x f32/u32
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  return {
    async match(cells: Float32Array, cellPixels: number): Promise<Uint32Array> {
      if (cellPixels !== templatePixelsPerCell) {
        throw new Error(`Cell pixels (${cellPixels}) must match template pixels (${templatePixelsPerCell})`);
      }
      const numCells = cells.length / cellPixels;

      // Create cell buffer
      const cellBuffer = device.createBuffer({
        size: cells.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(cellBuffer, 0, cells.buffer);

      // Create result buffer
      const resultBuffer = device.createBuffer({
        size: numCells * 4, // u32 per cell
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      // Create staging buffer for reading results
      const stagingBuffer = device.createBuffer({
        size: numCells * 4,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });

      // Update params
      const params = new ArrayBuffer(24);
      const paramsView = new DataView(params);
      paramsView.setUint32(0, numCells, true);
      paramsView.setUint32(4, numTemplates, true);
      paramsView.setUint32(8, cellPixels, true);
      paramsView.setFloat32(12, 0.01, true); // k1
      paramsView.setFloat32(16, 0.03, true); // k2
      paramsView.setFloat32(20, 255, true);  // L
      device.queue.writeBuffer(paramsBuffer, 0, params);

      // Create bind group
      const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: cellBuffer } },
          { binding: 1, resource: { buffer: templateBuffer } },
          { binding: 2, resource: { buffer: resultBuffer } },
          { binding: 3, resource: { buffer: paramsBuffer } },
        ],
      });

      // Dispatch compute
      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(numCells / 64));
      passEncoder.end();

      // Copy results to staging buffer
      commandEncoder.copyBufferToBuffer(resultBuffer, 0, stagingBuffer, 0, numCells * 4);

      device.queue.submit([commandEncoder.finish()]);

      // Read results
      await stagingBuffer.mapAsync(GPUMapMode.READ);
      const resultData = new Uint32Array(stagingBuffer.getMappedRange().slice(0));
      stagingBuffer.unmap();

      // Cleanup per-call buffers
      cellBuffer.destroy();
      resultBuffer.destroy();
      stagingBuffer.destroy();

      return resultData;
    },

    destroy() {
      templateBuffer.destroy();
      paramsBuffer.destroy();
      device.destroy();
    },
  };
}
