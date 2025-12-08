cmake_minimum_required(VERSION 3.16)
project(snapify_cpp VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Enable AVX optimizations
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -mavx -mavx2 -mfma")

# Find packages
find_package(Protobuf REQUIRED)
find_package(gRPC REQUIRED)
find_package(OpenCV REQUIRED)

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)
include_directories(${Protobuf_INCLUDE_DIRS})
include_directories(${gRPC_INCLUDE_DIRS})
include_directories(${OpenCV_INCLUDE_DIRS})

# Generate protobuf files
set(PROTO_FILES
    ${CMAKE_CURRENT_SOURCE_DIR}/proto/image_service.proto
)

protobuf_generate_cpp(PROTO_SRCS PROTO_HDRS ${PROTO_FILES})
grpc_generate_cpp(GRPC_SRCS GRPC_HDRS ${CMAKE_CURRENT_SOURCE_DIR} ${PROTO_FILES})

# Add executable for gRPC service
add_executable(image_service
    ${CMAKE_CURRENT_SOURCE_DIR}/src/image_service.cc
    ${PROTO_SRCS}
    ${GRPC_SRCS}
)

target_link_libraries(image_service
    gRPC::grpc++
    protobuf::libprotobuf
    ${OpenCV_LIBS}
)

# Add shared library for N-API addon
add_library(image_processor SHARED
    ${CMAKE_CURRENT_SOURCE_DIR}/src/image_processor.cc
    ${CMAKE_CURRENT_SOURCE_DIR}/src/binding.cc
)

target_link_libraries(image_processor
    ${CMAKE_JS_LIB}
    ${OpenCV_LIBS}
)

# Set output directories
set_target_properties(image_service PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/build
)

set_target_properties(image_processor PROPERTIES
    LIBRARY_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/build
    PREFIX ""
    SUFFIX ".node"
)

# Installation (optional)
install(TARGETS image_service image_processor
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
)