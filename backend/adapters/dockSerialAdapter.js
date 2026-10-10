import { EventEmitter } from 'node:events';
import { SerialPort } from 'serialport';

export class DockSerialAdapter extends EventEmitter {
  constructor(env = process.env) {
    super();
    this.config = {
      comPort: env.DOCK_COM_PORT || '',
      baudRate: Number(env.DOCK_BAUD_RATE || 0),
      staleMs: Number(env.DOCK_TELEMETRY_STALE_MS || 3000),
    };
    this.port = null;
    this.staleTimer = null;
    this.receiveBuffer = '';
    this.state = this.createState('DISCONNECTED');
  }

  createState(status) {
    return {
      name: 'Dock controller USB/serial',
      status,
      connected: false,
      comPort: this.config.comPort || null,
      baudRate: this.config.baudRate || null,
      lastPacketAt: null,
      bytesReceived: 0,
      stale: false,
      error: null,
      protocol: 'ASCII_STATUS',
      system: 'UNKNOWN',
      sissor: { open: null, close: null },
      doors: { DOOR1: { open: null, close: null }, DOOR2: { open: null, close: null } },
      rods: {
        ROD1: { center: null, back: null }, ROD2: { center: null, back: null },
        ROD3: { center: null, back: null }, ROD4: { center: null, back: null },
      },
    };
  }

  diagnostics() {
    return { type: 'dock_diagnostics', dock: { ...this.state } };
  }

  log(level, message, details = {}) {
    this.emit('log', { level, message, details, at: new Date().toISOString() });
  }

  async connect(overrides = {}) {
    await this.disconnect(false);
    this.config = { ...this.config, ...overrides };
    if (!this.config.comPort || !Number.isInteger(this.config.baudRate) || this.config.baudRate <= 0) {
      this.state = { ...this.state, status: 'ERROR', error: 'DOCK_COM_PORT and a valid DOCK_BAUD_RATE are required.' };
      this.emit('diagnostics', this.diagnostics());
      throw new Error(this.state.error);
    }

    this.state = { ...this.createState('CONNECTING'), comPort: this.config.comPort, baudRate: this.config.baudRate };
    this.emit('diagnostics', this.diagnostics());
    this.port = new SerialPort({ path: this.config.comPort, baudRate: this.config.baudRate, autoOpen: false });
    this.port.on('data', data => {
      this.state.lastPacketAt = new Date().toISOString();
      this.state.bytesReceived += data.length;
      this.state.stale = false;
      this.consumeText(data.toString('utf8'));
    });
    this.port.on('error', error => this.handleError(error));
    this.port.on('close', () => {
      this.state = { ...this.state, status: 'DISCONNECTED', connected: false };
      this.emit('diagnostics', this.diagnostics());
      this.log('warn', 'dock serial disconnected', { comPort: this.config.comPort });
    });

    try {
      await new Promise((resolve, reject) => {
        this.port.once('open', resolve);
        this.port.once('error', reject);
        this.port.open(error => { if (error) reject(error); });
      });
    } catch (error) {
      await this.disconnect(false);
      this.state = { ...this.state, status: 'ERROR', error: this.formatError(error) };
      this.emit('diagnostics', this.diagnostics());
      throw new Error(this.state.error);
    }

    this.state = { ...this.state, status: 'CONNECTED', connected: true, error: null };
    this.emit('diagnostics', this.diagnostics());
    this.log('info', 'dock serial connected', { comPort: this.config.comPort, baudRate: this.config.baudRate });
    this.staleTimer = setInterval(() => this.checkStale(), 500);
    return this.diagnostics();
  }

  consumeText(chunk) {
    this.receiveBuffer += chunk;
    const lines = this.receiveBuffer.split(/\r?\n/);
    this.receiveBuffer = lines.pop() || '';
    lines.forEach(line => this.parseStatusLine(line.trim()));
    this.emit('telemetry', { type: 'dock_state', dock: { ...this.state } });
  }

  parseStatusLine(line) {
    if (!line || /^=+$/.test(line) || /^STATUS$/i.test(line)) return;
    const system = line.match(/^SYSTEM:\s*(.+)$/i);
    if (system) {
      this.state.system = system[1].trim();
      this.log('debug', 'dock system status received', { system: this.state.system });
      return;
    }

    const actuator = line.match(/^(SISSOR|DOOR1|DOOR2):\s*OPEN=(\d+)\s+CLOSE=(\d+)$/i);
    if (actuator) {
      const key = actuator[1].toUpperCase();
      const value = { open: Number(actuator[2]), close: Number(actuator[3]) };
      if (key === 'SISSOR') this.state.sissor = value;
      else this.state.doors[key] = value;
      return;
    }

    const rod = line.match(/^(ROD[1-4]):\s*CENTER=(\d+)\s+BACK=(\d+)$/i);
    if (rod) {
      this.state.rods[rod[1].toUpperCase()] = { center: Number(rod[2]), back: Number(rod[3]) };
    }
  }

  async disconnect(logEvent = true) {
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.staleTimer = null;
    if (this.port?.isOpen) await new Promise(resolve => this.port.close(() => resolve()));
    this.port = null;
    this.state = { ...this.state, status: 'DISCONNECTED', connected: false };
    this.emit('diagnostics', this.diagnostics());
    if (logEvent) this.log('info', 'dock serial disconnected');
  }

  checkStale() {
    if (!this.state.lastPacketAt || Date.now() - Date.parse(this.state.lastPacketAt) <= this.config.staleMs) return;
    if (!this.state.stale) {
      this.state = { ...this.state, stale: true, status: 'TELEMETRY STALE' };
      this.emit('diagnostics', this.diagnostics());
      this.log('warn', 'dock telemetry timeout', { staleMs: this.config.staleMs });
    }
  }

  handleError(error) {
    this.state = { ...this.state, status: 'ERROR', connected: false, error: this.formatError(error) };
    this.emit('diagnostics', this.diagnostics());
    this.log('error', 'dock serial error', { error: this.state.error });
  }

  formatError(error) {
    if (error?.code === 'ENOENT') return `Unable to open ${this.config.comPort}. The dock port does not exist.`;
    if (error?.code === 'EBUSY' || error?.code === 'EACCES') return `Unable to open ${this.config.comPort}. The port may be in use or access was denied.`;
    return error?.message || 'Unknown dock serial error.';
  }

  async sendCommand() {
    throw new Error('Dock controller commands are disabled until its USB protocol is provided.');
  }
}