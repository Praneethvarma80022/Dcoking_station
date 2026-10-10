import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { SerialPort } from 'serialport';
import { createMavLinkStream } from 'node-mavlink';
import { Hm30MavlinkAdapter } from './hm30MavlinkAdapter.js';

export class Hm30SerialAdapter extends Hm30MavlinkAdapter {
  constructor(env = process.env) {
    super({ ...env, HM30_PROTOCOL: 'SERIAL' });
    this.config = {
      ...this.config,
      transport: 'SERIAL',
      comPort: env.HM30_COM_PORT || '',
      baudRate: Number(env.HM30_BAUD_RATE || 0),
    };
    this.name = 'HM30 SERIAL/MAVLink 2';
    this.testInProgress = false;
  }

  static async listPorts() {
    return SerialPort.list();
  }

  diagnostics() {
    const message = super.diagnostics();
    message.hm30.config = {
      ...message.hm30.config,
      transport: 'SERIAL',
      comPort: this.config.comPort || null,
      baudRate: this.config.baudRate || null,
    };
    message.hm30.name = this.name;
    return message;
  }

  async connect(overrides = {}) {
    await this.disconnect(false);
    this.config = { ...this.config, ...overrides, protocol: 'SERIAL', transport: 'SERIAL' };
    if (!this.config.comPort || !Number.isInteger(this.config.baudRate) || this.config.baudRate <= 0) {
      this.setStatus('ERROR', 'CONFIGURATION_REQUIRED');
      throw new Error('HM30_COM_PORT and a valid HM30_BAUD_RATE are required for SERIAL.');
    }

    this.state.heartbeat = false;
    this.state.lastTelemetryAt = null;
    this.state.lastPacketAt = null;
    this.state.packetCount = 0;
    this.state.invalidPacketCount = 0;
    this.state.drone = { ...this.state.drone, connected: false };

    this.setStatus('HM30 CONNECTING', 'CONNECTING');
    this.input = new PassThrough();
    this.reader = createMavLinkStream(this.input, {
      onCrcError: () => {
        this.state.invalidPacketCount += 1;
        this.log('warn', 'invalid MAVLink packet');
      },
    });
    this.reader.on('data', packet => this.handlePacket(packet));
    this.reader.on('error', error => this.handleSerialError(error));

    this.socket = new SerialPort({ path: this.config.comPort, baudRate: this.config.baudRate, autoOpen: false });
    this.socket.on('data', data => this.input.write(data));
    this.socket.on('error', error => this.handleSerialError(error));
    this.socket.on('close', () => {
      if (this.state.status !== 'HM30 DISCONNECTED') {
        this.setStatus('HM30 DISCONNECTED', 'DISCONNECTED');
        this.log('warn', 'HM30 serial disconnected', { comPort: this.config.comPort });
      }
    });

    try {
      await new Promise((resolve, reject) => {
        this.socket.once('open', resolve);
        this.socket.once('error', reject);
        this.socket.open(error => {
          if (error) reject(error);
        });
      });
    } catch (error) {
      await this.disconnect(false);
      this.setStatus('ERROR', 'ERROR');
      throw new Error(this.formatSerialError(error));
    }

    this.connectedAt = Date.now();
    this.setStatus('HM30 CONNECTED', 'CONNECTED');
    this.log('info', 'HM30 serial connected', { comPort: this.config.comPort, baudRate: this.config.baudRate });
    this.log('info', 'waiting for MAVLink heartbeat');
    this.staleTimer = setInterval(() => this.checkStale(), 500);
    return this.diagnostics();
  }

  async disconnect(logEvent = true) {
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.staleTimer = null;
    if (this.input) this.input.end();
    if (this.socket?.isOpen) {
      await new Promise(resolve => this.socket.close(() => resolve()));
    }
    this.input = null;
    this.reader = null;
    this.socket = null;
    this.connectedAt = null;
    this.setStatus('HM30 DISCONNECTED', 'DISCONNECTED');
    if (logEvent) this.log('info', 'HM30 serial disconnected');
  }

  handleSerialError(error) {
    this.log('error', 'HM30 serial error', { error: this.formatSerialError(error), comPort: this.config.comPort });
    this.setStatus('ERROR', 'ERROR');
  }

  formatSerialError(error) {
    const code = error?.code || '';
    if (code === 'ENOENT') return `Unable to open ${this.config.comPort}. The port does not exist or the device is disconnected.`;
    if (code === 'EBUSY' || code === 'EACCES') return `Unable to open ${this.config.comPort}. The port may be in use or access was denied.`;
    if (code === 'EINVAL') return `Unable to open ${this.config.comPort}. The baud rate or serial configuration is invalid.`;
    return error?.message || 'Unknown serial connection error.';
  }

  async testConnection(overrides = {}, timeoutMs = 5000) {
    this.testInProgress = true;
    try {
      await this.connect(overrides);
      if (this.state.heartbeat) return { passed: true, diagnostics: this.diagnostics().hm30 };
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.removeListener('diagnostics', onDiagnostics);
          reject(new Error('Serial port opened, but no MAVLink heartbeat was received before timeout.'));
        }, timeoutMs);
        const onDiagnostics = () => {
          if (this.state.heartbeat) {
            clearTimeout(timer);
            this.removeListener('diagnostics', onDiagnostics);
            resolve();
          }
        };
        this.on('diagnostics', onDiagnostics);
      });
      return { passed: true, diagnostics: this.diagnostics().hm30 };
    } catch (error) {
      return { passed: false, error: error.message, diagnostics: this.diagnostics().hm30 };
    } finally {
      this.testInProgress = false;
    }
  }
}

export function createSerialAdapter(env) {
  return new Hm30SerialAdapter(env);
}