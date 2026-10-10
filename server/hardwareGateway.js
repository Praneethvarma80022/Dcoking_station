import { Hm30MavlinkAdapter } from '../backend/adapters/hm30MavlinkAdapter.js';
import { Hm30SerialAdapter } from '../backend/adapters/hm30SerialAdapter.js';
import { DockSerialAdapter } from '../backend/adapters/dockSerialAdapter.js';
import { DockControllerAdapter } from './adapters/dockControllerAdapter.js';
import { SimulatorGateway } from './simulatorGateway.js';

export class HardwareGateway {
  constructor() {
    this.simulator = new SimulatorGateway();
    this.adapters = {
      UDP: new Hm30MavlinkAdapter(),
      TCP: new Hm30MavlinkAdapter(),
      SERIAL: new Hm30SerialAdapter(),
    };
    this.hm30 = this.adapters.UDP;
    this.dock = new DockControllerAdapter();
    this.dockSerial = new DockSerialAdapter();
    this.clients = new Set();
    Object.values(this.adapters).forEach(adapter => {
      adapter.on('diagnostics', message => this.broadcast(message));
      adapter.on('telemetry', message => this.broadcast(message));
      adapter.on('log', message => this.broadcast({ type: 'gateway_log', log: message }));
    });
    [this.dockSerial].forEach(adapter => {
      adapter.on('diagnostics', message => this.broadcast(message));
      adapter.on('telemetry', message => this.broadcast(message));
      adapter.on('log', message => this.broadcast({ type: 'gateway_log', log: message }));
    });
  }

  addClient(client) {
    this.clients.add(client);
    client.send(JSON.stringify({ type: 'gateway_state', state: this.snapshot() }));
  }

  removeClient(client) {
    this.clients.delete(client);
  }

  snapshot() {
    return {
      ...this.simulator.snapshot(),
      interfaces: {
        drone: { name: this.hm30.constructor.name, status: 'INTERFACE_READY', transmitEnabled: false },
        dock: { name: this.dock.name, status: 'INTERFACE_READY', transmitEnabled: false },
      },
      hm30: this.hm30.diagnostics().hm30,
      dock: this.dockSerial.diagnostics().dock,
    };
  }

  broadcast(message) {
    const encoded = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === 1) client.send(encoded);
    }
  }

  async handleMessage(message) {
    if (!message || typeof message !== 'object') {
      return { type: 'error', error: 'Message must be an object.' };
    }

    if (message.type === 'command') {
      const result = await this.simulator.handleCommand(message.command, message.payload);
      this.broadcast({ type: 'command_ack', result });
      this.broadcast({ type: 'gateway_state', state: this.snapshot() });
      return null;
    }

    if (message.type === 'get_state') {
      return { type: 'gateway_state', state: this.snapshot() };
    }

    if (message.type === 'hm30_connect') {
      try {
        const transport = String(message.config?.transport || message.config?.protocol || 'UDP').toUpperCase();
        const adapter = this.adapters[transport];
        if (!adapter) throw new Error(`Unsupported HM30 transport: ${transport}`);
        if (this.hm30 !== adapter) await this.hm30.disconnect(false);
        this.hm30 = adapter;
        const diagnostics = await this.hm30.connect(message.config || {});
        this.broadcast(diagnostics);
        return diagnostics;
      } catch (error) {
        this.broadcast({ type: 'hm30_diagnostics', hm30: this.hm30.diagnostics().hm30 });
        return { type: 'error', error: error.message };
      }
    }

    if (message.type === 'hm30_disconnect') {
      await this.hm30.disconnect();
      const diagnostics = this.hm30.diagnostics();
      this.broadcast(diagnostics);
      return diagnostics;
    }

    if (message.type === 'get_hm30_status') return this.hm30.diagnostics();

    if (message.type === 'dock_connect') {
      try {
        const diagnostics = await this.dockSerial.connect(message.config || {});
        this.broadcast(diagnostics);
        return diagnostics;
      } catch (error) {
        return { type: 'error', error: error.message, subsystem: 'dock' };
      }
    }

    if (message.type === 'dock_disconnect') {
      await this.dockSerial.disconnect();
      const diagnostics = this.dockSerial.diagnostics();
      this.broadcast(diagnostics);
      return diagnostics;
    }

    if (message.type === 'list_serial_ports') {
      const ports = await Hm30SerialAdapter.listPorts();
      return { type: 'serial_ports', ports };
    }

    if (message.type === 'test_hm30') {
      if (!(this.hm30 instanceof Hm30SerialAdapter)) {
        return { type: 'hm30_test_result', result: { passed: false, error: 'Select SERIAL transport before testing HM30.' } };
      }
      const result = await this.hm30.testConnection(message.config || {});
      this.broadcast({ type: 'hm30_test_result', result });
      return { type: 'hm30_test_result', result };
    }

    return { type: 'error', error: `Unsupported message type: ${message.type}` };
  }
}