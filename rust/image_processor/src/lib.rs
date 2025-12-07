use wasm_bindgen::prelude::*;
use image::{ImageFormat, ColorType};
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::codecs::webp::WebPEncoder;
use std::io::Cursor;
use web_sys::console;

// This is like the `main` function, except for JavaScript.
#[wasm_bindgen(start)]
pub fn main() {
    // This provides better error messages in debug mode.
    // It's disabled in release mode so it doesn't bloat up the file size.
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    console::log_1(&"Rust Image Processor WASM module initialized".into());
}

#[wasm_bindgen]
pub struct ImageProcessor;

#[wasm_bindgen]
impl ImageProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ImageProcessor {
        ImageProcessor
    }

    #[wasm_bindgen]
    pub fn resize_image(&self, image_data: &[u8], width: u32, height: u32, quality: u8) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;

        let resized = img.resize(width, height, image::imageops::FilterType::Lanczos3);

        let mut buffer = Cursor::new(Vec::new());
        resized.write_to(&mut buffer, ImageFormat::Jpeg)
            .map_err(|e| JsValue::from_str(&format!("Failed to save image: {}", e)))?;

        Ok(buffer.into_inner())
    }

    #[wasm_bindgen]
    pub fn convert_format(&self, image_data: &[u8], format: &str, quality: u8) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;

        let image_format = match format.to_lowercase().as_str() {
            "jpeg" | "jpg" => ImageFormat::Jpeg,
            "png" => ImageFormat::Png,
            "webp" => ImageFormat::WebP,
            _ => return Err(JsValue::from_str("Unsupported format")),
        };

        let mut buffer = Cursor::new(Vec::new());
        img.write_to(&mut buffer, image_format)
            .map_err(|e| JsValue::from_str(&format!("Failed to save image: {}", e)))?;

        Ok(buffer.into_inner())
    }

    #[wasm_bindgen]
    pub fn optimize_image(&self, image_data: &[u8], quality: u8) -> Result<Vec<u8>, JsValue> {
        let img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to save image: {}", e)))?;

        let mut buffer = Cursor::new(Vec::new());
        img.write_to(&mut buffer, ImageFormat::Jpeg)
            .map_err(|e| JsValue::from_str(&format!("Failed to save image: {}", e)))?;

        Ok(buffer.into_inner())
    }

    #[wasm_bindgen]
    pub fn process_image(&self, image_data: &[u8], width: u32, height: u32, format: &str, quality: u8) -> Result<Vec<u8>, JsValue> {
        console::log_1(&format!("process_image called with width: {}, height: {}, format: {}, quality: {}", width, height, format, quality).into());
        let mut img = image::load_from_memory(image_data)
            .map_err(|e| JsValue::from_str(&format!("Failed to load image: {}", e)))?;

        // Resize if dimensions provided
        if width > 0 && height > 0 {
            img = img.resize(width, height, image::imageops::FilterType::CatmullRom);
        }

        let image_format = match format.to_lowercase().as_str() {
            "jpeg" | "jpg" => ImageFormat::Jpeg,
            "png" => ImageFormat::Png,
            "webp" => ImageFormat::WebP,
            _ => return Err(JsValue::from_str("Unsupported format")),
        };

        let rgb_img = img.to_rgb8();
        let mut buffer = Vec::with_capacity((img.width() * img.height() * 3) as usize);

        match image_format {
            ImageFormat::Jpeg => {
                let mut encoder = JpegEncoder::new_with_quality(&mut buffer, quality);
                encoder.encode(rgb_img.as_raw(), img.width(), img.height(), ColorType::Rgb8)
                    .map_err(|e| JsValue::from_str(&format!("Failed to encode JPEG: {}", e)))?;
            }
            ImageFormat::Png => {
                let encoder = PngEncoder::new(&mut buffer);
                encoder.encode(rgb_img.as_raw(), img.width(), img.height(), ColorType::Rgb8)
                    .map_err(|e| JsValue::from_str(&format!("Failed to encode PNG: {}", e)))?;
            }
            ImageFormat::WebP => {
                let encoder = WebPEncoder::new_lossless(&mut buffer);
                encoder.encode(rgb_img.as_raw(), img.width(), img.height(), ColorType::Rgb8)
                    .map_err(|e| JsValue::from_str(&format!("Failed to encode WebP: {}", e)))?;
            }
            _ => return Err(JsValue::from_str("Unsupported format")),
        }

        Ok(buffer)
    }
}
