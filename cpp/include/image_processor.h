#ifndef IMAGE_PROCESSOR_H
#define IMAGE_PROCESSOR_H

#include <napi.h>
#include <memory>
#include <vector>
#include <string>
#include <opencv2/opencv.hpp>
#include <immintrin.h>
#include <memory>
#include <unordered_map>

class ImageProcessor : public Napi::ObjectWrap<ImageProcessor> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    ImageProcessor(const Napi::CallbackInfo& info);

private:
    Napi::Value ProcessImage(const Napi::CallbackInfo& info);
    Napi::Value GetMetrics(const Napi::CallbackInfo& info);

    // Internal processing methods
    std::vector<uint8_t> processImageData(const std::vector<uint8_t>& input, const std::string& operation);
    void initializeProcessor();

    // Advanced image processing algorithms
    cv::Mat processHDR(const cv::Mat& input);
    cv::Mat applyToneMapping(const cv::Mat& hdrImage, const std::string& algorithm = "reinhard");
    cv::Mat applyExposureFusion(const std::vector<cv::Mat>& images);
    cv::Mat applyComputerVision(const cv::Mat& input, const std::string& operation);

    // SIMD optimized operations
    void applySIMDOptimization(cv::Mat& image);
    void vectorizedColorConversion(uint8_t* data, size_t size);
    void avxImageProcessing(cv::Mat& image);

    // Memory management
    class CustomAllocator {
    public:
        static void* allocate(size_t size);
        static void deallocate(void* ptr);
    };

    // Zero-copy operations
    cv::Mat createZeroCopyMat(const std::vector<uint8_t>& data, int width, int height, int channels);
    std::vector<uint8_t> extractDataFromMat(const cv::Mat& mat);

    // Utility methods
    cv::Mat bufferToMat(const std::vector<uint8_t>& buffer, int width, int height, int channels);
    std::vector<uint8_t> matToBuffer(const cv::Mat& mat);

    // Metrics
    struct Metrics {
        uint64_t total_processed = 0;
        double average_time = 0.0;
        // Advanced algorithm metrics
        std::unordered_map<std::string, uint64_t> operation_count;
        std::unordered_map<std::string, double> operation_avg_time;
        bool avx_used = false;
        uint64_t memory_allocated = 0;
    } metrics_;

    // Processor state
    bool initialized_ = false;

    // Advanced processing state
    bool avx_supported_ = false;
    std::unordered_map<std::string, cv::Ptr<cv::FeatureDetector>> feature_detectors_;
    std::unordered_map<std::string, cv::Ptr<cv::DescriptorExtractor>> descriptor_extractors_;

    // Memory pool for custom allocation
    std::vector<void*> memory_pool_;
};

#endif // IMAGE_PROCESSOR_H