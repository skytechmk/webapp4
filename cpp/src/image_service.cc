#include <grpcpp/grpcpp.h>
#include <iostream>
#include <chrono>
#include <algorithm>
#include "image_service.grpc.pb.h"

using grpc::Server;
using grpc::ServerBuilder;
using grpc::ServerContext;
using grpc::Status;
using snapify::ImageService;
using snapify::ImageRequest;
using snapify::ImageResponse;
using snapify::BatchRequest;
using snapify::BatchResponse;
using snapify::MetricsRequest;
using snapify::MetricsResponse;

class ImageServiceImpl final : public ImageService::Service {
private:
    // Metrics tracking
    struct ServiceMetrics {
        uint64_t total_processed = 0;
        double average_processing_time = 0.0;
        uint64_t active_connections = 0;
        std::map<std::string, uint64_t> operation_counts;
    } metrics_;

    // Mutex for thread safety
    std::mutex metrics_mutex_;

    // Image processing logic (same as N-API version)
    std::vector<uint8_t> processImageData(const std::vector<uint8_t>& input, const std::string& operation) {
        std::vector<uint8_t> output = input;

        if (operation == "invert") {
            for (size_t i = 0; i < output.size(); ++i) {
                output[i] = 255 - output[i];
            }
        } else if (operation == "grayscale") {
            for (size_t i = 0; i < output.size(); i += 3) {
                if (i + 2 < output.size()) {
                    uint8_t gray = (output[i] + output[i + 1] + output[i + 2]) / 3;
                    output[i] = output[i + 1] = output[i + 2] = gray;
                }
            }
        } else if (operation == "noop") {
            // No operation
        } else {
            std::cout << "Unknown operation: " << operation << std::endl;
        }

        return output;
    }

public:
    Status ProcessImage(ServerContext* context, const ImageRequest* request, ImageResponse* response) override {
        auto start = std::chrono::high_resolution_clock::now();

        // Extract image data
        std::vector<uint8_t> input(request->image_data().begin(), request->image_data().end());
        std::string operation = request->operation();

        // Process the image
        std::vector<uint8_t> result = processImageData(input, operation);

        // Set response
        response->set_processed_data(result.data(), result.size());
        response->set_status("success");

        auto end = std::chrono::high_resolution_clock::now();
        double processing_time = std::chrono::duration<double, std::milli>(end - start).count();
        response->set_processing_time(processing_time);

        // Update metrics
        {
            std::lock_guard<std::mutex> lock(metrics_mutex_);
            metrics_.total_processed++;
            metrics_.average_processing_time =
                (metrics_.average_processing_time * (metrics_.total_processed - 1) + processing_time) / metrics_.total_processed;
            metrics_.operation_counts[operation]++;
        }

        return Status::OK;
    }

    Status BatchProcess(ServerContext* context, const BatchRequest* request, BatchResponse* response) override {
        auto start = std::chrono::high_resolution_clock::now();

        for (const auto& image_request : request->requests()) {
            ImageResponse* image_response = response->add_responses();

            // Process each image
            std::vector<uint8_t> input(image_request.image_data().begin(), image_request.image_data().end());
            std::string operation = image_request.operation();

            auto image_start = std::chrono::high_resolution_clock::now();
            std::vector<uint8_t> result = processImageData(input, operation);
            auto image_end = std::chrono::high_resolution_clock::now();

            double processing_time = std::chrono::duration<double, std::milli>(image_end - image_start).count();

            image_response->set_processed_data(result.data(), result.size());
            image_response->set_processing_time(processing_time);
            image_response->set_status("success");

            // Update metrics
            {
                std::lock_guard<std::mutex> lock(metrics_mutex_);
                metrics_.total_processed++;
                metrics_.average_processing_time =
                    (metrics_.average_processing_time * (metrics_.total_processed - 1) + processing_time) / metrics_.total_processed;
                metrics_.operation_counts[operation]++;
            }
        }

        auto end = std::chrono::high_resolution_clock::now();
        double total_time = std::chrono::duration<double, std::milli>(end - start).count();
        response->set_total_time(total_time);

        return Status::OK;
    }

    Status GetMetrics(ServerContext* context, const MetricsRequest* request, MetricsResponse* response) override {
        std::lock_guard<std::mutex> lock(metrics_mutex_);

        response->set_total_processed(metrics_.total_processed);
        response->set_average_processing_time(metrics_.average_processing_time);
        response->set_active_connections(metrics_.active_connections);

        for (const auto& pair : metrics_.operation_counts) {
            (*response->mutable_operation_counts())[pair.first] = pair.second;
        }

        return Status::OK;
    }
};

void RunServer() {
    std::string server_address("0.0.0.0:50051");
    ImageServiceImpl service;

    ServerBuilder builder;
    builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);

    std::unique_ptr<Server> server(builder.BuildAndStart());
    std::cout << "C++ gRPC Image Service listening on " << server_address << std::endl;

    server->Wait();
}

int main(int argc, char** argv) {
    RunServer();
    return 0;
}