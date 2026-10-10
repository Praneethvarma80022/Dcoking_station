import dgram from 'node:dgram';
import net from 'node:net';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { common, minimal, ardupilotmega, createMavLinkStream } from 'node-mavlink';

const REGISTRY = { ...minimal.REGISTRY, ...common.REGISTRY, ...ardupilotmega.REGISTRY };
const MESSAGE_NAMES = {
  0: 'HEARTBEAT',
  24: 'GPS_RAW_INT',
  30: 'ATTITUDE',
  33: 'GLOBAL_POSITION_INT',
  74: 'VFR_HUD',
  147: 'BATTERY_STATUS',
  253: 'STATUSTEXT',
  1: 'SYS_STATUS',
};
const ARDUPILOT_MODES = {
  0: 'STABILIZE', 1: 'ACRO', 2: 'ALT_HOLD', 3: 'AUTO', 4: 'GUIDED', 5: 'LOITER',
  6: 'RTL', 7: 'CIRCLE', 9: 'LAND', 11: 'DRIFT', 13: 'SPORT', 14: 'FLIP',
  15: 'AUTOTUNE', 16: 'POSHOLD', 17: 'BRAKE', 18: 'THROW', 19: 'AVOID_ADSB',
  20: 'GUIDED_NOGPS', 21: 'SMART_RTL', 22: 'FLOWHOLD', 23: 'FOLLOW', 24: 'ZIGZAG',
};

const numberOr = (value, fallback = null) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const field = (data, camel, snake = camel) => data?.[camel] ?? data?.[snake];

export class Hm30MavlinkAdapter extends EventEmitter {
  constructor(env = process.env) {
    super();
    this.config = {
      ip: env.HM30_IP || '',
      port: Number(env.HM30_PORT || 0),
      protocol: String(env.HM30_PROTOCOL || 'UDP').toUpperCase(),
      localBindIp: env.LOCAL_BIND_IP || '0.0.0.0',
      localBindPort: Number(env.LOCAL_BIND_PORT || 0),
      systemId: env.MAVLINK_SYSTEM_ID ? Number(env.MAVLINK_SYSTEM_ID) : null,
      componentId: env.MAVLINK_COMPONENT_ID ? Number(env.MAVLINK_COMPONENT_ID) : null,
      staleMs: Number(env.HM30_TELEMETRY_STALE_MS || 3000),
    };
    this.socket = null;
    this.input = null;
    this.reader = null;
    this.staleTimer = null;
    this.connectedAt = null;
    this.state = this.createState('HM30 DISCONNECTED');
  }

  createState(status) {
    return {
      status,
      connected: false,
      heartbeat: false,
      lastTelemetryAt: null,
      lastPacketAt: null,
      linkQuality: 'DISCONNECTED',
      systemId: this.config?.systemId ?? null,
      componentId: this.config?.componentId ?? null,
      packetCount: 0,
      invalidPacketCount: 0,
      lastMessage: null,
      drone: {
        connected: false, systemId: null, componentId: null, armed: false, mode: 'UNKNOWN',
        battery: null, voltage: null, current: null, latitude: null, longitude: null,
        altitude: null, groundSpeed: null, heading: null, roll: null, pitch: null, yaw: null,
      },
    };
  }

  log(level, message, details = {}) {
    this.emit('log', { level, message, details, at: new Date().toISOString() });
  }

  diagnostics() {
    return {
      type: 'hm30_diagnostics',
      hm30: {
        ...this.state,
        config: { ...this.config, ip: this.config.ip || null, port: this.config.port || null },
      },
    };
  }

  async connect(overrides = {}) {
    await this.disconnect(false);
    this.config = { ...this.config, ...overrides };
    if (!this.config.ip || !this.config.port || !['UDP', 'TCP'].includes(this.config.protocol)) {
      this.setStatus('HM30 DISCONNECTED', 'CONFIGURATION_REQUIRED');
      throw new Error('HM30_IP, HM30_PORT, and HM30_PROTOCOL=UDP|TCP are required.');
    }

    this.setStatus('HM30 CONNECTING', 'CONNECTING');
    this.input = new PassThrough();
    this.reader = createMavLinkStream(this.input, {
      onCrcError: () => {
        this.state.invalidPacketCount += 1;
        this.log('warn', 'invalid MAVLink packet');
      },
    });
    this.reader.on('data', packet => this.handlePacket(packet));
    this.reader.on('error', error => this.handleError(error));

    if (this.config.protocol === 'UDP') {
      this.socket = dgram.createSocket('udp4');
      this.socket.on('message', (message, remote) => {
        if (this.config.ip && remote.address !== this.config.ip) return;
        this.input.write(message);
      });
      this.socket.on('error', error => this.handleError(error));
      await new Promise((resolve, reject) => {
        this.socket.once('error', reject);
        this.socket.bind(this.config.localBindPort, this.config.localBindIp, () => {
          this.socket.removeListener('error', reject);
          resolve();
        });
      });
    } else {
      this.socket = net.createConnection({ host: this.config.ip, port: this.config.port });
      this.socket.on('data', data => this.input.write(data));
      this.socket.on('error', error => this.handleError(error));
      await new Promise((resolve, reject) => {
        this.socket.once('error', reject);
        this.socket.once('connect', () => {
          this.socket.removeListener('error', reject);
          resolve();
        });
      });
    }

    this.setStatus('HM30 CONNECTED', 'CONNECTED');
    this.connectedAt = Date.now();
    this.log('info', 'HM30 socket connected', { protocol: this.config.protocol, ip: this.config.ip, port: this.config.port });
    this.staleTimer = setInterval(() => this.checkStale(), 500);
    return this.diagnostics();
  }

  async disconnect(logEvent = true) {
    if (this.staleTimer) clearInterval(this.staleTimer);
    this.staleTimer = null;
    if (this.input) this.input.end();
    if (this.socket) this.socket.destroy?.();
    this.input = null;
    this.reader = null;
    this.socket = null;
    this.connectedAt = null;
    this.setStatus('HM30 DISCONNECTED', 'DISCONNECTED');
    if (logEvent) this.log('info', 'HM30 socket disconnected');
  }

  setStatus(status, linkQuality = this.state.linkQuality) {
    this.state.status = status;
    this.state.connected = status === 'HM30 CONNECTED';
    this.state.linkQuality = linkQuality;
    this.emit('diagnostics', this.diagnostics());
  }

  handleError(error) {
    this.log('error', 'HM30 connection error', { error: error.message });
    this.setStatus('HM30 DISCONNECTED', 'ERROR');
  }

  handlePacket(packet) {
    const { header } = packet;
    if (this.config.systemId && header.sysid !== this.config.systemId) return;
    if (this.config.componentId && header.compid !== this.config.componentId) return;
    const clazz = REGISTRY[header.msgid];
    if (!clazz) return;

    try {
      const data = packet.protocol.data(packet.payload, clazz);
      const messageName = MESSAGE_NAMES[header.msgid] || clazz.name.replace(/^MavLink/, '').toUpperCase();
      this.state.packetCount += 1;
      this.state.lastPacketAt = new Date().toISOString();
      this.state.lastTelemetryAt = this.state.lastPacketAt;
      this.state.lastMessage = messageName;
      this.state.systemId = header.sysid;
      this.state.componentId = header.compid;
      this.state.heartbeat ||= messageName === 'HEARTBEAT';
      this.state.drone = this.mapTelemetry(messageName, data, header);
      this.setStatus('HM30 CONNECTED', this.state.heartbeat ? 'HEARTBEAT RECEIVED' : 'TELEMETRY RECEIVING');
      this.emit('telemetry', { type: 'drone_state', drone: this.state.drone, message: messageName });
      this.log(messageName === 'HEARTBEAT' ? 'info' : 'debug', 'telemetry received', { message: messageName });
    } catch (error) {
      this.state.invalidPacketCount += 1;
      this.log('warn', 'invalid MAVLink payload', { error: error.message, msgid: header.msgid });
    }
  }

  mapTelemetry(messageName, data, header) {
    const drone = { ...this.state.drone, connected: true, systemId: header.sysid, componentId: header.compid };
    if (messageName === 'HEARTBEAT') {
      drone.armed = Boolean((numberOr(field(data, 'baseMode', 'base_mode'), 0) & 128) !== 0);
      const customMode = field(data, 'customMode', 'custom_mode');
      drone.mode = ARDUPILOT_MODES[customMode] || String(customMode ?? drone.mode);
      drone.flightMode = drone.mode;
    } else if (messageName === 'GLOBAL_POSITION_INT') {
      drone.latitude = numberOr(field(data, 'lat')) / 1e7;
      drone.longitude = numberOr(field(data, 'lon')) / 1e7;
      drone.altitude = numberOr(field(data, 'relativeAlt', 'relative_alt')) / 1000;
      drone.heading = numberOr(field(data, 'hdg')) / 100;
    } else if (messageName === 'ATTITUDE') {
      drone.roll = numberOr(field(data, 'roll'));
      drone.pitch = numberOr(field(data, 'pitch'));
      drone.yaw = numberOr(field(data, 'yaw'));
      drone.heading = drone.yaw == null ? drone.heading : (drone.yaw * 180 / Math.PI + 360) % 360;
    } else if (messageName === 'SYS_STATUS') {
      drone.voltage = numberOr(field(data, 'voltageBattery', 'voltage_battery')) / 1000;
      drone.current = numberOr(field(data, 'currentBattery', 'current_battery')) / 100;
      drone.battery = numberOr(field(data, 'batteryRemaining', 'battery_remaining'));
    } else if (messageName === 'BATTERY_STATUS') {
      drone.battery = numberOr(field(data, 'batteryRemaining', 'battery_remaining'));
      drone.voltage = numberOr(field(data, 'voltages')?.[0]) / 1000 || drone.voltage;
      drone.current = numberOr(field(data, 'currentBattery', 'current_battery')) / 100 || drone.current;
    } else if (messageName === 'VFR_HUD') {
      drone.groundSpeed = numberOr(field(data, 'groundspeed', 'groundSpeed'));
      drone.heading = numberOr(field(data, 'heading')) ?? drone.heading;
      drone.altitude = numberOr(field(data, 'alt')) ?? drone.altitude;
    } else if (messageName === 'GPS_RAW_INT') {
      drone.latitude = numberOr(field(data, 'lat')) / 1e7;
      drone.longitude = numberOr(field(data, 'lon')) / 1e7;
      drone.altitude = numberOr(field(data, 'alt')) / 1000;
    }
    return drone;
  }

  checkStale() {
    const lastActivity = this.state.lastTelemetryAt ? Date.parse(this.state.lastTelemetryAt) : this.connectedAt;
    if (!lastActivity || Date.now() - lastActivity <= this.config.staleMs) return;
    if (this.state.status !== 'TELEMETRY STALE') {
      this.setStatus('TELEMETRY STALE', 'STALE');
      this.state.drone = { ...this.state.drone, connected: false };
      this.emit('telemetry', { type: 'drone_state', drone: this.state.drone, stale: true });
      this.log('warn', 'HM30 telemetry stale', { staleMs: this.config.staleMs });
    }
  }

  async sendCommand() {
    throw new Error('HM30 adapter is read-only; flight commands are disabled.');
  }
}