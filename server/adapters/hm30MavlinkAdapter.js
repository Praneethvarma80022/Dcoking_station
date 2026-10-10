import { HardwareAdapter, ProtocolNotConfiguredError } from './hardwareAdapter.js';

export class Hm30MavlinkAdapter extends HardwareAdapter {
  constructor() {
    super('HM30/MAVLink 2');
  }

  async connect() {
    throw new ProtocolNotConfiguredError(this.name);
  }

  async readTelemetry() {
    throw new ProtocolNotConfiguredError(this.name);
  }

  async sendCommand() {
    throw new ProtocolNotConfiguredError(this.name);
  }
}