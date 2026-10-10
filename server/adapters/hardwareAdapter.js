export class ProtocolNotConfiguredError extends Error {
  constructor(adapterName) {
    super(`${adapterName} protocol is not configured; no hardware command was sent.`);
    this.name = 'ProtocolNotConfiguredError';
  }
}

export class HardwareAdapter {
  constructor(name) {
    this.name = name;
    this.connected = false;
  }

  async connect() {
    throw new ProtocolNotConfiguredError(this.name);
  }

  async disconnect() {
    this.connected = false;
  }

  async readTelemetry() {
    throw new ProtocolNotConfiguredError(this.name);
  }

  async sendCommand() {
    throw new ProtocolNotConfiguredError(this.name);
  }
}