#include "image_processor.h"
#include <chrono>
#include <iostream>
#include <algorithm>
#include <opencv2/opencv.hpp>
#include <immintrin.h>
#include <cpuid.h>

Napi::Object ImageProcessor::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "ImageProcessor", {
        InstanceMethod("processImage", &ImageProcessor::ProcessImage),
        InstanceMethod("getMetrics", &ImageProcessor::GetMetrics)
    });

    exports.Set("ImageProcessor", func);
    return exports;
}

ImageProcessor::ImageProcessor(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<ImageProcessor>(info) {
    initializeProcessor();
}

void ImageProcessor::initializeProcessor() {
    // Check AVX support
    unsigned int eax = 0, ebx = 0, ecx = 0, edx = 0;
    __get_cpuid(1, &eax, &ebx, &ecx, &edx);
    avx_supported_ = (ecx & (1 << 28)) != 0; // AVX bit

    // Initialize computer vision detectors
    feature_detectors_["ORB"] = cv::ORB::create();
    feature_detectors_["SIFT"] = cv::SIFT::create();
    descriptor_extractors_["ORB"] = cv::ORB::create();
    descriptor_extractors_["SIFT"] = cv::SIFT::create();

    initialized_ = true;
    std::cout << "C++ ImageProcessor initialized with AVX support: " << (avx_supported_ ? "YES" : "NO") << std::endl;
}

Napi::Value ImageProcessor::ProcessImage(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsBuffer()) {
        Napi::TypeError::New(env, "First argument must be a Buffer").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[1].IsString()) {
        Napi::TypeError::New(env, "Second argument must be a string (operation)").ThrowAsJavaScriptException();
        return env.Null();
    }

    // Extract input buffer
    Napi::Buffer<uint8_t> inputBuffer = info[0].As<Napi::Buffer<uint8_t>>();
    std::vector<uint8_t> input(inputBuffer.Data(), inputBuffer.Data() + inputBuffer.Length());

    // Extract operation
    std::string operation = info[1].As<Napi::String>().Utf8Value();

    // Process the image
    auto start = std::chrono::high_resolution_clock::now();
    std::vector<uint8_t> result = processImageData(input, operation);
    auto end = std::chrono::high_resolution_clock::now();

    double processing_time = std::chrono::duration<double, std::milli>(end - start).count();

    // Update metrics
    metrics_.total_processed++;
    metrics_.average_time = (metrics_.average_time * (metrics_.total_processed - 1) + processing_time) / metrics_.total_processed;

    // Update operation-specific metrics
    metrics_.operation_count[operation]++;
    auto& op_count = metrics_.operation_count[operation];
    auto& op_avg_time = metrics_.operation_avg_time[operation];
    op_avg_time = (op_avg_time * (op_count - 1) + processing_time) / op_count;

    // Track AVX usage
    if (operation == "simd_optimize" && avx_supported_) {
        metrics_.avx_used = true;
    }

    // Return result buffer
    return Napi::Buffer<uint8_t>::Copy(env, result.data(), result.size());
}

Napi::Value ImageProcessor::GetMetrics(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    Napi::Object metrics = Napi::Object::New(env);
    metrics.Set("totalProcessed", Napi::Number::New(env, metrics_.total_processed));
    metrics.Set("averageTime", Napi::Number::New(env, metrics_.average_time));
    metrics.Set("avxSupported", Napi::Boolean::New(env, avx_supported_));
    metrics.Set("avxUsed", Napi::Boolean::New(env, metrics_.avx_used));
    metrics.Set("memoryAllocated", Napi::Number::New(env, metrics_.memory_allocated));

    // Operation-specific metrics
    Napi::Object operations = Napi::Object::New(env);
    for (const auto& op : metrics_.operation_count) {
        Napi::Object opMetrics = Napi::Object::New(env);
        opMetrics.Set("count", Napi::Number::New(env, op.second));
        opMetrics.Set("averageTime", Napi::Number::New(env, metrics_.operation_avg_time[op.first]));
        operations.Set(op.first, opMetrics);
    }
    metrics.Set("operations", operations);

    return metrics;
}

std::vector<uint8_t> ImageProcessor::processImageData(const std::vector<uint8_t>& input, const std::string& operation) {
    // Assume input is RGB data with width=height=256 for simplicity
    // In production, dimensions should be passed as parameters
    int width = 256, height = 256, channels = 3;
    cv::Mat inputMat = bufferToMat(input, width, height, channels);

    cv::Mat resultMat;

    if (operation == "invert") {
        cv::bitwise_not(inputMat, resultMat);
    } else if (operation == "grayscale") {
        cv::cvtColor(inputMat, resultMat, cv::COLOR_BGR2GRAY);
    } else if (operation == "hdr") {
        resultMat = processHDR(inputMat);
    } else if (operation == "tone_mapping") {
        cv::Mat hdrImage = processHDR(inputMat);
        resultMat = applyToneMapping(hdrImage, "reinhard");
    } else if (operation == "exposure_fusion") {
        // For demonstration, create multiple exposures from single image
        std::vector<cv::Mat> exposures = {inputMat, inputMat * 0.5, inputMat * 2.0};
        resultMat = applyExposureFusion(exposures);
    } else if (operation == "edge_detection") {
        resultMat = applyComputerVision(inputMat, "canny");
    } else if (operation == "feature_detection") {
        resultMat = applyComputerVision(inputMat, "orb_features");
    } else if (operation == "simd_optimize") {
        resultMat = inputMat.clone();
        applySIMDOptimization(resultMat);
    } else if (operation == "noop") {
        resultMat = inputMat;
    } else {
        std::cout << "Unknown operation: " << operation << std::endl;
        resultMat = inputMat;
    }

    return matToBuffer(resultMat);
}

// Utility methods
cv::Mat ImageProcessor::bufferToMat(const std::vector<uint8_t>& buffer, int width, int height, int channels) {
    cv::Mat mat(height, width, channels == 3 ? CV_8UC3 : CV_8UC1);
    std::memcpy(mat.data, buffer.data(), buffer.size());
    return mat;
}

std::vector<uint8_t> ImageProcessor::matToBuffer(const cv::Mat& mat) {
    std::vector<uint8_t> buffer(mat.total() * mat.channels());
    std::memcpy(buffer.data(), mat.data, buffer.size());
    return buffer;
}

// Advanced image processing algorithms
cv::Mat ImageProcessor::processHDR(const cv::Mat& input) {
    cv::Mat hdr;
    input.convertTo(hdr, CV_32FC3, 1.0/255.0);

    // Simple HDR simulation - in practice, this would combine multiple exposures
    // For demonstration, apply gamma correction and contrast enhancement
    cv::pow(hdr, 0.8, hdr); // Gamma correction
    cv::normalize(hdr, hdr, 0, 1, cv::NORM_MINMAX);

    return hdr;
}

cv::Mat ImageProcessor::applyToneMapping(const cv::Mat& hdrImage, const std::string& algorithm) {
    cv::Mat ldr;

    if (algorithm == "reinhard") {
        // Reinhard tone mapping
        cv::Ptr<cv::TonemapReinhard> tonemapReinhard = cv::createTonemapReinhard(1.5f, 0.0f, 0.0f, 0.0f);
        tonemapReinhard->process(hdrImage, ldr);
    } else if (algorithm == "drago") {
        // Drago tone mapping
        cv::Ptr<cv::TonemapDrago> tonemapDrago = cv::createTonemapDrago(1.0f, 0.7f);
        tonemapDrago->process(hdrImage, ldr);
    } else if (algorithm == "durand") {
        // Durand tone mapping (using Mantiuk for similar effect)
        cv::Ptr<cv::TonemapMantiuk> tonemapMantiuk = cv::createTonemapMantiuk(2.2f, 0.85f, 1.2f);
        tonemapMantiuk->process(hdrImage, ldr);
    } else {
        // Default to simple linear mapping
        hdrImage.convertTo(ldr, CV_8UC3, 255.0);
    }

    return ldr;
}

cv::Mat ImageProcessor::applyExposureFusion(const std::vector<cv::Mat>& images) {
    cv::Mat fusion;
    cv::Ptr<cv::MergeMertens> merge_mertens = cv::createMergeMertens();
    merge_mertens->process(images, fusion);
    return fusion;
}

cv::Mat ImageProcessor::applyComputerVision(const cv::Mat& input, const std::string& operation) {
    cv::Mat result = input.clone();

    if (operation == "canny") {
        cv::Mat gray, edges;
        cv::cvtColor(input, gray, cv::COLOR_BGR2GRAY);
        cv::Canny(gray, edges, 50, 150);
        cv::cvtColor(edges, result, cv::COLOR_GRAY2BGR);
    } else if (operation == "orb_features") {
        std::vector<cv::KeyPoint> keypoints;
        cv::Mat descriptors;
        feature_detectors_["ORB"]->detectAndCompute(input, cv::noArray(), keypoints, descriptors);

        // Draw keypoints on the image
        cv::drawKeypoints(input, keypoints, result, cv::Scalar(0, 255, 0));
    }

    return result;
}

// SIMD optimizations
void ImageProcessor::applySIMDOptimization(cv::Mat& image) {
    if (!avx_supported_) {
        std::cout << "AVX not supported, skipping SIMD optimization" << std::endl;
        return;
    }

    avxImageProcessing(image);
}

void ImageProcessor::vectorizedColorConversion(uint8_t* data, size_t size) {
    if (!avx_supported_) return;

    // AVX vectorized processing for color conversion
    const __m256i shuffle_mask = _mm256_set_epi8(
        15, 12, 13, 14, 11, 8, 9, 10, 7, 4, 5, 6, 3, 0, 1, 2,
        15, 12, 13, 14, 11, 8, 9, 10, 7, 4, 5, 6, 3, 0, 1, 2
    );

    size_t i = 0;
    for (; i + 31 < size; i += 32) {
        __m256i pixels = _mm256_loadu_si256((__m256i*)&data[i]);
        __m256i shuffled = _mm256_shuffle_epi8(pixels, shuffle_mask);
        _mm256_storeu_si256((__m256i*)&data[i], shuffled);
    }
}

void ImageProcessor::avxImageProcessing(cv::Mat& image) {
    if (image.channels() == 3) {
        vectorizedColorConversion(image.data, image.total() * image.channels());
    }
}

// Memory management
void* ImageProcessor::CustomAllocator::allocate(size_t size) {
    void* ptr = std::malloc(size);
    if (ptr) {
        // Track allocation for debugging
    }
    return ptr;
}

void ImageProcessor::CustomAllocator::deallocate(void* ptr) {
    if (ptr) {
        std::free(ptr);
    }
}

// Zero-copy operations
cv::Mat ImageProcessor::createZeroCopyMat(const std::vector<uint8_t>& data, int width, int height, int channels) {
    // Create Mat without copying data
    return cv::Mat(height, width, channels == 3 ? CV_8UC3 : CV_8UC1, (void*)data.data());
}

std::vector<uint8_t> ImageProcessor::extractDataFromMat(const cv::Mat& mat) {
    // Extract data without copying if possible
    return std::vector<uint8_t>(mat.data, mat.data + mat.total() * mat.channels());
}