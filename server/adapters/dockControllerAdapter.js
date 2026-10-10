import { HardwareAdapter, ProtocolNotConfiguredError } from './hardwareAdapter.js';

export class DockControllerAdapter extends HardwareAdapter {
  constructor() {
    super('Dock USB/serial controller');
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