{
  "targets": [
    {
      "target_name": "image_processor",
      "sources": [
        "src/binding.cc",
        "src/image_processor.cc"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "include",
        "<!@(pkg-config --cflags-only-I opencv4 | sed s/-I//g)"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NODE_ADDON_API_CPP_EXCEPTIONS"
      ],
      "libraries": [
        "<!@(pkg-config --libs opencv4)"
      ],
      "cflags_cc": [
        "-std=c++17",
        "-mavx",
        "-mavx2",
        "-mfma",
        "-frtti",
        "-fexceptions"
      ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "GCC_ENABLE_CPP_RTTI": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.7",
        "OTHER_CPLUSPLUSFLAGS": [
          "-std=c++17",
          "-mavx",
          "-mavx2",
          "-mfma"
        ]
      },
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "RuntimeTypeInfo": "true"
        }
      }
    }
  ]
}