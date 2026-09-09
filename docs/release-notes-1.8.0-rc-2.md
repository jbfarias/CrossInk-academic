# INKademic v1.8.0-rc-2

This is the next release candidate after `v1.8.0-rc`. It is built for X3, X4,
X4 Pro, and Sticky, with the same academic reading and annotation features on
all supported models.

## Main changes

- Fixed OTA and browser-update version ordering for the exact version
  `1.8.0-rc-2`.
- Classified the release catalog entry as `rc` so stable clients do not select
  it as a production release.
- Enabled restoration of the saved frontlight on wake by default on new or
  migrated X4 Pro settings. An explicit saved `off` choice is preserved.
- Retained the watchdog-safe signed A/B update path, including Ed25519
  verification, model identity checks, heap protection, and rollback.
- Retained academic notes, highlights, markings, tags, EPUB export, statistics,
  and the browser file/firmware interface in every target build.

## Important upgrade note

The firmware image must match the device:

| Device | Artifact |
| --- | --- |
| X3 / X4 | `firmware-x3-x4-v1.8.0-rc-2.bin` |
| X4 Pro | `firmware-x4-pro-v1.8.0-rc-2.bin` |
| Sticky | `firmware-sticky-v1.8.0-rc-2.bin` |

Each binary is accompanied by a `.sig` file. The private signing key is not
stored in this repository. Installation must use a matching signed pair from
the official GitHub release or the browser flow.

## X4 Pro safety scope

This candidate deliberately does not enable continuous diagnostic logging or
experimental aggressive sleep/downclock changes. Those options previously
increased the risk of a task-watchdog reset during SD/OTA work. The remaining
validation focus is the frontlight wake state, USB Drive exit path, dense
EPUB indexing, and signed updates.

## Documentation

The implementation plan and hardware validation gates are in
[plan-1.8.0-rc-2.md](./plan-1.8.0-rc-2.md). The upstream projects and adapted
areas are recorded in [fork-lineage.md](./fork-lineage.md).

