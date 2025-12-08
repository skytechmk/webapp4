use neon::prelude::*;
use neon::types::buffer::TypedArray;
use cudarc::driver::CudaDevice;
use cudarc::driver::DevicePtr;
use cudarc::nvrtc::Ptx;
use std::sync::Arc;
use lazy_static::lazy_static;
use std::println;

lazy_static! {
    static ref CUDA_DEVICE: Option<Arc<CudaDevice>> = {
        CudaDevice::new(0).ok()
    };
}

fn gpu_processor_get_device_count(mut cx: FunctionContext) -> JsResult<JsNumber> {
    match CUDA_DEVICE.as_ref() {
        Some(_) => Ok(cx.number(1.0)),
        None => Ok(cx.number(0.0)),
    }
}

fn gpu_processor_resize_image(mut cx: FunctionContext) -> JsResult<JsNumber> {
    let input_data = cx.argument::<JsBuffer>(0)?;
    let input_width = cx.argument::<JsNumber>(1)?.value(&mut cx) as usize;
    let input_height = cx.argument::<JsNumber>(2)?.value(&mut cx) as usize;
    let output_width = cx.argument::<JsNumber>(3)?.value(&mut cx) as usize;
    let output_height = cx.argument::<JsNumber>(4)?.value(&mut cx) as usize;
    let output_buffer = cx.argument::<JsBuffer>(5)?;

    println!(
        "GPU processor resize_image called with input: {}x{}, output: {}x{}",
        input_width, input_height, output_width, output_height
    );

    let device = match CUDA_DEVICE.as_ref() {
        Some(dev) => dev,
        None => return Ok(cx.number(-1.0)), // No GPU available
    };

    // Get input data
    let input_slice = input_data.as_slice(&cx);
    let input_vec = input_slice.to_vec();
    let input_size = input_width * input_height * 4; // RGBA

    if input_vec.len() != input_size {
        return Ok(cx.number(-2.0)); // Invalid input size
    }

    let output_size = output_width * output_height * 4;

    // Allocate device memory
    let dev_input = match device.htod_copy(input_vec) {
        Ok(mem) => mem,
        Err(_) => return Ok(cx.number(-3.0)), // Memory allocation failed
    };

    let dev_output = match device.alloc_zeros::<u8>(output_size) {
        Ok(mem) => mem,
        Err(_) => return Ok(cx.number(-4.0)), // Output allocation failed
    };

    // Load and compile kernel
    let ptx = Ptx::from_src(BILINEAR_RESIZE_KERNEL);
    let module = match device.load_ptx(ptx, "resize_module", &["bilinear_resize"]) {
        Ok(m) => m,
        Err(_) => return Ok(cx.number(-5.0)), // Module loading failed
    };
    let kernel = match module.function("bilinear_resize") {
        Ok(k) => k,
        Err(_) => return Ok(cx.number(-6.0)), // Function loading failed
    };

    // Launch kernel
    let cfg = cudarc::driver::LaunchConfig {
        grid_dim: ((output_width as u32 + 15) / 16, (output_height as u32 + 15) / 16, 1),
        block_dim: (16, 16, 1),
        shared_mem_bytes: 0,
    };

    let params = (
        dev_input.device_ptr(),
        input_width as i32,
        input_height as i32,
        dev_output.device_ptr(),
        output_width as i32,
        output_height as i32,
    );

    if let Err(_) = kernel.launch(cfg, &params) {
        return Ok(cx.number(-8.0)); // Kernel launch failed
    }

    // Copy result back to host
    let mut output_vec = vec![0u8; output_size];
    if let Err(_) = device.dtoh_sync_copy_into(&dev_output, &mut output_vec) {
        return Ok(cx.number(-9.0)); // Copy back failed
    }

    // Write to output buffer
    let output_slice = output_buffer.as_mut_slice(&mut cx);
    output_slice.copy_from_slice(&output_vec);

    Ok(cx.number(0.0)) // Success
}

fn gpu_processor_init(mut cx: FunctionContext) -> JsResult<JsString> {
    let status = match CUDA_DEVICE.as_ref() {
        Some(_) => "GPU processor initialized successfully",
        None => "GPU processor initialized (no GPU available)",
    };
    Ok(cx.string(status))
}

const BILINEAR_RESIZE_KERNEL: &str = r#"
__device__ __forceinline__ float clamp(float val, float min_val, float max_val) {
    return fmaxf(min_val, fminf(max_val, val));
}

extern "C" __global__ void bilinear_resize(
    const unsigned char* input,
    int input_width,
    int input_height,
    unsigned char* output,
    int output_width,
    int output_height
) {
    int x = blockIdx.x * blockDim.x + threadIdx.x;
    int y = blockIdx.y * blockDim.y + threadIdx.y;

    if (x >= output_width || y >= output_height) return;

    // Calculate source coordinates
    float src_x = (float)x * (float)input_width / (float)output_width;
    float src_y = (float)y * (float)input_height / (float)output_height;

    int x1 = (int)src_x;
    int y1 = (int)src_y;
    int x2 = min(x1 + 1, input_width - 1);
    int y2 = min(y1 + 1, input_height - 1);

    float dx = src_x - (float)x1;
    float dy = src_y - (float)y1;

    // Interpolate for each channel (RGBA)
    for (int c = 0; c < 4; c++) {
        float val11 = (float)input[(y1 * input_width + x1) * 4 + c];
        float val12 = (float)input[(y1 * input_width + x2) * 4 + c];
        float val21 = (float)input[(y2 * input_width + x1) * 4 + c];
        float val22 = (float)input[(y2 * input_width + x2) * 4 + c];

        float val1 = val11 * (1.0f - dx) + val12 * dx;
        float val2 = val21 * (1.0f - dx) + val22 * dx;
        float final_val = val1 * (1.0f - dy) + val2 * dy;

        output[(y * output_width + x) * 4 + c] = (unsigned char)clamp(final_val, 0.0f, 255.0f);
    }
}
"#;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("gpu_processor_init", gpu_processor_init)?;
    cx.export_function("gpu_processor_get_device_count", gpu_processor_get_device_count)?;
    cx.export_function("gpu_processor_resize_image", gpu_processor_resize_image)?;
    Ok(())
}
