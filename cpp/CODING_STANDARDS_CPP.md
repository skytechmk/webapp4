# C++ Coding Standards for Snapify Integration

This document outlines the comprehensive coding standards and best practices for the C++ components of the Snapify project. These standards ensure code consistency, maintainability, performance, and reliability across the C++ integration.

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [Code Structure and Organization](#code-structure-and-organization)
3. [Memory Management](#memory-management)
4. [Error Handling](#error-handling)
5. [Documentation](#documentation)
6. [Testing](#testing)
7. [Performance Optimization](#performance-optimization)
8. [Build and Tooling](#build-and-tooling)

## Naming Conventions

### General Rules

- Use descriptive, meaningful names that clearly indicate purpose
- Avoid abbreviations unless they are widely understood (e.g., `RGB`, `HTTP`)
- Use English language for all identifiers
- Be consistent with naming throughout the codebase

### Files and Directories

- **Header files**: `.h` extension, PascalCase for class names
  - `ImageProcessor.h`, `NetworkClient.h`
- **Source files**: `.cc` extension (consistent with Google C++ style)
  - `image_processor.cc`, `network_client.cc`
- **Directories**: lowercase with underscores
  - `image_processing/`, `network_utils/`

### Classes and Types

- **Classes**: PascalCase
  ```cpp
  class ImageProcessor { ... };
  class NetworkClient { ... };
  ```

- **Structs**: PascalCase (same as classes)
  ```cpp
  struct ProcessingMetrics { ... };
  ```

- **Enums**: PascalCase for type, UPPER_SNAKE_CASE for values
  ```cpp
  enum class ImageFormat {
      kJpeg,
      kPng,
      kWebp
  };
  ```

- **Type aliases**: PascalCase
  ```cpp
  using ImageBuffer = std::vector<uint8_t>;
  using ProcessingCallback = std::function<void(const ImageBuffer&)>;
  ```

### Functions and Methods

- **Functions**: camelCase
  ```cpp
  void processImage(const ImageBuffer& input);
  ImageBuffer convertFormat(const ImageBuffer& input, ImageFormat format);
  ```

- **Private member functions**: camelCase with trailing underscore
  ```cpp
  void initializeProcessor_();
  void validateInput_(const ImageBuffer& input);
  ```

- **Static functions**: PascalCase
  ```cpp
  static ImageProcessor* CreateFromConfig(const Config& config);
  ```

### Variables

- **Local variables**: camelCase
  ```cpp
  int imageWidth = 1920;
  std::string fileName = "image.jpg";
  ```

- **Member variables**: camelCase with trailing underscore
  ```cpp
  class ImageProcessor {
   private:
    int width_;
    std::string format_;
    std::unique_ptr<ProcessorImpl> impl_;
  };
  ```

- **Global variables**: g_camelCase (avoid when possible)
  ```cpp
  extern int g_threadPoolSize;
  ```

- **Constants**: kPascalCase
  ```cpp
  const int kMaxImageSize = 1920 * 1080 * 4;
  const std::string kDefaultFormat = "jpeg";
  ```

### Namespaces

- **Namespaces**: lowercase
  ```cpp
  namespace image_processing {
  namespace utils {
  // code here
  }  // namespace utils
  }  // namespace image_processing
  ```

## Code Structure and Organization

### File Organization

- **Header files (.h)**: Declarations only, minimal includes
- **Source files (.cc)**: Implementations, include corresponding header first
- **Include guards**: Use `#pragma once` for modern compilers
- **Forward declarations**: Use when possible to reduce include dependencies

### Class Organization

```cpp
class ImageProcessor : public Napi::ObjectWrap<ImageProcessor> {
 public:
  // Public types and constants
  using ImageBuffer = std::vector<uint8_t>;

  // Constructors and destructor
  explicit ImageProcessor(const Config& config);
  ~ImageProcessor() override;

  // Public methods
  ImageBuffer processImage(const ImageBuffer& input, const std::string& operation);

  // Static methods
  static std::unique_ptr<ImageProcessor> Create(const Config& config);

 private:
  // Private types
  struct ProcessingMetrics {
    uint64_t total_processed = 0;
    double average_time_ms = 0.0;
  };

  // Private methods
  void initialize_();
  ImageBuffer applyOperation_(const ImageBuffer& input, const std::string& operation);

  // Private member variables
  Config config_;
  ProcessingMetrics metrics_;
  std::unique_ptr<ProcessorImpl> impl_;
};
```

### Include Order

1. Related header file (e.g., `#include "image_processor.h"`)
2. C system headers
3. C++ standard library headers
4. Other library headers
5. Project headers

```cpp
#include "image_processor.h"

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

#include <napi.h>
#include <opencv2/opencv.hpp>

#include "config.h"
#include "utils/image_utils.h"
```

## Memory Management

### Smart Pointers

- **Use `std::unique_ptr`** for exclusive ownership
- **Use `std::shared_ptr`** only when shared ownership is required
- **Avoid raw pointers** for ownership (except in performance-critical sections)
- **Use `std::weak_ptr`** to break circular references

```cpp
class ImageProcessor {
 public:
  ImageProcessor() : impl_(std::make_unique<ProcessorImpl>()) {}

 private:
  std::unique_ptr<ProcessorImpl> impl_;
};
```

### RAII (Resource Acquisition Is Initialization)

- Always use RAII for resource management
- Custom classes should follow RAII principles
- Use standard library containers and smart pointers

```cpp
class FileHandler {
 public:
  explicit FileHandler(const std::string& path) : file_(path) {
    if (!file_.is_open()) {
      throw std::runtime_error("Failed to open file: " + path);
    }
  }

  ~FileHandler() {
    if (file_.is_open()) {
      file_.close();
    }
  }

  // ... methods to use file_

 private:
  std::ifstream file_;
};
```

### Memory Allocation

- Prefer stack allocation for small, short-lived objects
- Use containers (`std::vector`, `std::string`) instead of manual arrays
- Avoid `new`/`delete` in user code
- Use `std::make_unique` and `std::make_shared` for dynamic allocation

### Buffer Management

- Use `std::vector<uint8_t>` for binary data
- Avoid C-style arrays (`uint8_t*`)
- Use `std::string` for text data (UTF-8)
- Validate buffer sizes before processing

```cpp
std::vector<uint8_t> processImageData(const std::vector<uint8_t>& input) {
  if (input.empty()) {
    throw std::invalid_argument("Input buffer cannot be empty");
  }

  std::vector<uint8_t> output = input;  // Copy for processing
  // ... processing logic
  return output;
}
```

## Error Handling

### Exception Safety

- Use exceptions for error conditions that cannot be handled locally
- Provide strong exception safety guarantees where possible
- Document exception specifications

```cpp
class ImageProcessor {
 public:
  /**
   * @brief Processes an image with the specified operation.
   * @param input The input image buffer.
   * @param operation The operation to apply.
   * @return The processed image buffer.
   * @throws std::invalid_argument If input is empty or operation is unknown.
   * @throws std::runtime_error If processing fails.
   */
  std::vector<uint8_t> processImage(const std::vector<uint8_t>& input,
                                   const std::string& operation);
};
```

### Error Types

- Use standard library exceptions where appropriate
- Create custom exception types for domain-specific errors
- Provide meaningful error messages

```cpp
class ImageProcessingError : public std::runtime_error {
 public:
  explicit ImageProcessingError(const std::string& message)
      : std::runtime_error(message) {}
};

class UnsupportedFormatError : public ImageProcessingError {
 public:
  explicit UnsupportedFormatError(const std::string& format)
      : ImageProcessingError("Unsupported image format: " + format) {}
};
```

### N-API Error Handling

- Use `Napi::Error::New()` for JavaScript exceptions
- Check input parameters and throw appropriate errors
- Return `env.Null()` or appropriate values on error

```cpp
Napi::Value ProcessImage(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  try {
    // ... processing logic
    return Napi::Buffer<uint8_t>::Copy(env, result.data(), result.size());
  } catch (const std::exception& e) {
    Napi::Error::New(env, e.what()).ThrowAsJavaScriptException();
    return env.Null();
  }
}
```

## Documentation

### Doxygen Comments

- Use Doxygen format for all public APIs
- Document classes, methods, parameters, return values, and exceptions
- Keep comments concise but informative

```cpp
/**
 * @brief High-performance image processing class.
 *
 * This class provides optimized image processing operations using native C++
 * implementations for maximum performance.
 */
class ImageProcessor {
 public:
  /**
   * @brief Processes an image with the specified operation.
   *
   * @param input The input image buffer as raw bytes.
   * @param operation The operation to apply (e.g., "invert", "grayscale").
   * @return The processed image buffer.
   *
   * @throws std::invalid_argument If operation is not supported.
   * @throws std::runtime_error If processing fails.
   */
  std::vector<uint8_t> processImage(const std::vector<uint8_t>& input,
                                   const std::string& operation);
};
```

### Code Comments

- Comment complex algorithms and business logic
- Explain why, not just what
- Keep comments up-to-date with code changes

```cpp
// Use a sliding window approach for efficient edge detection
// This avoids redundant calculations by reusing computed values
void applyEdgeDetection(std::vector<uint8_t>& image, int width, int height) {
  // Implementation...
}
```

### README and Documentation

- Maintain comprehensive README files
- Document build and deployment procedures
- Include performance characteristics and limitations

## Testing

### Unit Testing

- Write unit tests for all public APIs
- Use Google Test framework (gtest)
- Test both success and failure cases
- Mock external dependencies

```cpp
TEST(ImageProcessorTest, ProcessImage_Invert) {
  ImageProcessor processor;
  std::vector<uint8_t> input = {255, 128, 64};
  std::vector<uint8_t> expected = {0, 127, 191};

  auto result = processor.processImage(input, "invert");

  EXPECT_EQ(result, expected);
}

TEST(ImageProcessorTest, ProcessImage_InvalidOperation) {
  ImageProcessor processor;
  std::vector<uint8_t> input = {255, 128, 64};

  EXPECT_THROW(processor.processImage(input, "invalid"), std::invalid_argument);
}
```

### Integration Testing

- Test N-API bindings with Node.js
- Test gRPC service endpoints
- Verify memory usage and performance
- Test error conditions and edge cases

### Test Organization

- Place test files in `test/` directory
- Mirror source directory structure
- Use descriptive test names
- Include performance benchmarks

### Continuous Integration

- Run tests on every commit
- Include memory leak detection (Valgrind, AddressSanitizer)
- Check code coverage targets
- Automate performance regression testing

## Performance Optimization

### Profiling and Measurement

- Use performance profiling tools (perf, VTune, gprof)
- Measure actual performance, not just theoretical improvements
- Establish performance baselines and regression tests

### Memory Optimization

- Minimize memory allocations in hot paths
- Use object pools for frequently allocated objects
- Prefer stack allocation over heap allocation
- Use memory-mapped files for large data

### Algorithm Optimization

- Choose appropriate algorithms for data size and access patterns
- Use SIMD instructions where beneficial (SSE, AVX)
- Consider cache-friendly data structures and access patterns
- Profile-guided optimization (PGO) for critical paths

### Concurrency

- Use thread pools for CPU-bound operations
- Avoid false sharing in multi-threaded code
- Use lock-free data structures where appropriate
- Profile contention and optimize critical sections

```cpp
class ThreadPool {
 public:
  explicit ThreadPool(size_t num_threads);
  ~ThreadPool();

  template<class F, class... Args>
  auto enqueue(F&& f, Args&&... args)
      -> std::future<typename std::result_of<F(Args...)>::type>;

 private:
  std::vector<std::thread> workers_;
  std::queue<std::function<void()>> tasks_;
  std::mutex queue_mutex_;
  std::condition_variable condition_;
  bool stop_;
};
```

### Compiler Optimizations

- Use appropriate compiler flags (`-O3`, `-march=native`)
- Enable link-time optimization (LTO)
- Use profile-guided optimization (PGO)
- Regularly update compilers for better optimizations

## Build and Tooling

### Build System

- Use CMake for cross-platform builds
- Support both Debug and Release configurations
- Enable warnings and treat them as errors
- Use modern CMake features (3.16+)

### Code Formatting

- Use clang-format for consistent code formatting
- Integrate formatting into build process
- Configure format rules in `.clang-format` file

### Static Analysis

- Use clang-tidy for static analysis
- Configure rules in `.clang-tidy` file
- Run analysis in CI/CD pipeline
- Fix or suppress legitimate warnings

### Sanitizers

- Use AddressSanitizer for memory error detection
- Use ThreadSanitizer for race condition detection
- Use UndefinedBehaviorSanitizer for undefined behavior
- Enable sanitizers in Debug builds

### Dependencies

- Use package managers (vcpkg, Conan) for dependencies
- Pin dependency versions for reproducible builds
- Regularly update dependencies for security and performance
- Minimize external dependencies

## Tool Configuration Files

### .clang-format

```yaml
BasedOnStyle: Google
IndentWidth: 2
ColumnLimit: 100
```

### .clang-tidy

```yaml
Checks: >
  -*,
  bugprone-*,
  clang-analyzer-*,
  cppcoreguidelines-*,
  modernize-*,
  performance-*,
  readability-*

CheckOptions:
  - key: readability-identifier-naming.ClassCase
    value: CamelCase
  - key: readability-identifier-naming.FunctionCase
    value: camelCase
  - key: readability-identifier-naming.VariableCase
    value: camelCase
  - key: readability-identifier-naming.PrivateMemberSuffix
    value: _
```

## Enforcement

- Code reviews must check compliance with these standards
- Automated tools (formatters, linters) enforce mechanical rules
- CI/CD pipeline fails on style violations
- Regular audits ensure ongoing compliance

## References

- [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [Effective Modern C++](https://www.amazon.com/Effective-Modern-Specific-Ways-Improve/dp/1491903996)