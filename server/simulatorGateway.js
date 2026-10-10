const SUPPORTED_COMMANDS = new Set([
  'DOOR_OPEN', 'DOOR_CLOSE', 'DOOR_STOP',
  'CROSS_UP', 'CROSS_DOWN', 'CROSS_STOP',
  'GLASS_CENTER', 'GLASS_GETBACK', 'GLASS_STOP', 'GLASS_STEP', 'GLASS_ROD_IN', 'GLASS_ROD_HOME',
  'CHARGING_START', 'CHARGING_STOP',
  'DRONE_ARM', 'DRONE_DISARM', 'DRONE_TAKEOFF', 'DRONE_LAND', 'DRONE_RETURN',
  'EMERGENCY_STOP', 'EMERGENCY_RESET',
  'SET_MODE_AUTO', 'SET_MODE_MANUAL', 'OPERATION_START', 'OPERATION_ABORT', 'RUN_DEMO',
]);

export class SimulatorGateway {
  constructor() {
    this.state = {
      mode: 'SIMULATOR',
      connected: true,
      adapterStatus: { hm30: 'NOT_CONFIGURED', dock: 'NOT_CONFIGURED' },
      lastUpdate: new Date().toISOString(),
      command: null,
    };
  }

  async handleCommand(command, payload) {
    if (!SUPPORTED_COMMANDS.has(command)) {
      return { success: false, command, errorCode: 'UNKNOWN_COMMAND', message: `Unsupported command: ${command}` };
    }

    this.state.command = { command, payload: payload || null, at: new Date().toISOString() };
    this.state.lastUpdate = new Date().toISOString();
    return { success: true, command, mode: 'SIMULATOR' };
  }

  snapshot() {
    return { ...this.state };
  }
}