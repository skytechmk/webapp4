import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.join(__dirname, 'index.node'),
  path.join(__dirname, 'target', 'release', 'libgpu_processor.node'),
  path.join(__dirname, 'target', 'release', 'libgpu_processor.so'),
  path.join(__dirname, 'target', 'debug', 'libgpu_processor.node'),
  path.join(__dirname, 'target', 'debug', 'libgpu_processor.so')
];

function loadNativeModule() {
  for (const candidate of candidatePaths) {
    if (!fs.existsSync(candidate)) continue;

    try {
      if (candidate.endsWith('.so')) {
        const moduleShim = { exports: {} };
        process.dlopen(moduleShim, candidate);
        return moduleShim.exports;
      }

      return require(candidate);
    } catch (error) {
      console.warn(`GPU native module failed to load from ${candidate}:`, error);
    }
  }

  const attempted = candidatePaths.filter(fs.existsSync);
  throw new Error(
    `GPU native module not found or failed to load. Tried: ${
      attempted.length ? attempted.join(', ') : candidatePaths.join(', ')
    }`
  );
}

const native = loadNativeModule();

export const gpu_processor_init = native.gpu_processor_init;
export const gpu_processor_get_device_count = native.gpu_processor_get_device_count;
export const gpu_processor_resize_image = native.gpu_processor_resize_image;
export default native;
