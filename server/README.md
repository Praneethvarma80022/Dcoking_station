# Hardware Gateway

The gateway owns the future hardware boundary:

```text
HM30/MAVLink 2 adapter  ─┐
                         ├─ HardwareGateway ─ WebSocket ─ React machine state / 3D scene
Dock USB/serial adapter ─┘
```

Run it with:

```bash
npm run hardware:server
```

The default mode is intentionally `SIMULATOR`. The adapter classes do not open sockets, serial ports, or transmit commands until the real HM30 and dock-controller protocols are implemented. The WebSocket endpoint is `ws://127.0.0.1:8080/hardware`; health is available at `http://127.0.0.1:8080/health`.

## HM30 telemetry

Copy `.env.example` to `.env` and fill in every HM30 value supplied by the HM30 configuration. No IP address, port, system ID, or component ID is assumed by the adapter. Start the gateway with `npm run hardware:server` (or `node --env-file=.env server/index.js` on Node versions that support `--env-file`).

The adapter is read-only. It receives MAVLink 2 over UDP or TCP, parses `HEARTBEAT`, `GLOBAL_POSITION_INT`, `ATTITUDE`, `SYS_STATUS`, `BATTERY_STATUS`, `VFR_HUD`, `GPS_RAW_INT`, and `STATUSTEXT`, then publishes `drone_state` and `hm30_diagnostics` WebSocket events. ARM, TAKEOFF, LAND, RTL, and all other flight commands are intentionally rejected.

The command allowlist mirrors the commands already emitted by `src/services/machineStore.jsx`. Replace the adapter method bodies only after the hardware packet formats, safety interlocks, acknowledgements, and telemetry mappings are documented.