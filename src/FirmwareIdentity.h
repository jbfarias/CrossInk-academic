#pragma once

// Build metadata exposed both to the UI and to the browser updater. The
// marker is deliberately plain ASCII so the image validator can find it in a
// streamed ESP image without allocating the whole binary.
namespace firmware_identity {

const char* deviceType();
const char* version();
const char* marker();

}  // namespace firmware_identity
