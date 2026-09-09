#include "FirmwareIdentity.h"

#ifndef INKADEMIC_FIRMWARE_DEVICE_TYPE
#define INKADEMIC_FIRMWARE_DEVICE_TYPE "unknown"
#endif

#ifndef INKADEMIC_VERSION
#define INKADEMIC_VERSION "unknown"
#endif

namespace firmware_identity {

namespace {
// Referenced by marker(), which keeps this exact build identity in every
// application image. The trailing separator makes parsing unambiguous even
// when a version contains a build suffix.
constexpr char kMarker[] = "INKADEMIC_FW_ID|device=" INKADEMIC_FIRMWARE_DEVICE_TYPE "|version=" INKADEMIC_VERSION "|";
}

const char* deviceType() { return INKADEMIC_FIRMWARE_DEVICE_TYPE; }
const char* version() { return INKADEMIC_VERSION; }
const char* marker() { return kMarker; }

}  // namespace firmware_identity
