#include <napi.h>
#include "image_processor.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return ImageProcessor::Init(env, exports);
}

NODE_API_MODULE(image_processor, Init)