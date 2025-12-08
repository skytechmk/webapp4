# Snapify C++ Integration

This directory contains the C++ components for Snapify's high-performance image processing capabilities.

## Architecture

The C++ integration provides two main components:

1. **N-API Native Module** (`image_processor`): Direct integration with Node.js for fast, synchronous image processing
2. **gRPC Service** (`image_service`): Scalable microservice for batch processing and distributed workloads

## Directory Structure

```
cpp/
├── CMakeLists.txt          # CMake build configuration
├── binding.gyp             # node-gyp configuration for N-API
├── README.md               # This file
├── include/                # C++ header files
│   └── image_processor.h
├── src/                    # C++ source files
│   ├── binding.cc          # N-API module initialization
│   ├── image_processor.cc  # N-API wrapper implementation
│   └── image_service.cc    # gRPC service implementation
├── proto/                  # Protocol buffer definitions
│   └── image_service.proto
└── build/                  # Build artifacts (generated)
```

## Building

### Prerequisites

System dependencies (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install -y cmake build-essential protobuf-compiler libgrpc-dev libgrpc++-dev libprotobuf-dev
```

NPM dependencies are already included in the main package.json.

### Build Commands

```bash
# Build everything (N-API addon + gRPC service)
npm run build:cpp

# Build only N-API addon
npm run build:cpp-addon

# Build only gRPC service
npm run build:cpp-service

# Clean build artifacts
npm run clean:cpp
```

## Usage

### N-API Module

```javascript
const { ImageProcessor } = require('./cpp/build/Release/image_processor.node');

const processor = new ImageProcessor();

// Process image data
const inputBuffer = Buffer.from(imageData);
const resultBuffer = processor.processImage(inputBuffer, 'invert');

// Get metrics
const metrics = processor.getMetrics();
console.log(`Processed ${metrics.totalProcessed} images, avg time: ${metrics.averageTime}ms`);
```

### gRPC Service

Start the service:
```bash
./cpp/build/image_service
```

Client usage (Node.js):
```javascript
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync('./cpp/proto/image_service.proto');
const imageService = grpc.loadPackageDefinition(packageDefinition).snapify.ImageService;

const client = new imageService('localhost:50051', grpc.credentials.createInsecure());

client.ProcessImage({
  image_data: Buffer.from(imageData),
  operation: 'grayscale'
}, (error, response) => {
  if (!error) {
    console.log('Processed image:', response.processed_data);
    console.log('Processing time:', response.processing_time, 'ms');
  }
});
```

## Supported Operations

- `invert`: Color inversion
- `grayscale`: Convert to grayscale
- `noop`: No operation (passthrough)

## Development

### Adding New Operations

1. Update the `processImageData` method in both `image_processor.cc` and `image_service.cc`
2. Add the operation name to the protobuf definition if needed
3. Update this README

### Performance Considerations

- N-API provides direct memory access with minimal overhead
- gRPC adds serialization overhead but enables distributed processing
- Use N-API for small, frequent operations
- Use gRPC for large images or batch processing

## Testing

Basic functionality can be tested by building and running the components. Integration tests should be added to verify:

- N-API module loads correctly
- gRPC service starts and responds
- Image processing operations work as expected
- Memory usage and performance metrics

## Troubleshooting

### Build Issues

- Ensure all system dependencies are installed
- Check that Node.js version is compatible with N-API
- Verify CMake version is 3.16 or higher

### Runtime Issues

- N-API: Check that the .node file is in the correct path
- gRPC: Ensure the service is running on the expected port
- Memory: Monitor for leaks in long-running processes

## Future Enhancements

- Advanced image processing algorithms (HDR, AI/ML inference)
- GPU acceleration integration
- Multi-threading support
- Performance benchmarking suite
- Production deployment configuration