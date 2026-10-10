import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { HardwareGatewayClient } from './hardwareGatewayClient';

// ============================================================================
// Autonomous Drone Docking Station — Mock Hardware Abstraction Layer
// ----------------------------------------------------------------------------
// This engine simulates the physical station in real time. It is the single
// source of truth for machine state. A real HardwareAdapter would replace the
// tick() simulation with WebSocket/REST reads + command dispatch, but the
// state shape and command API stay identical.
// ============================================================================

const TICK_MS = 100;

const SPEED = {
  door: 18,      // % per second
  platform: 14,
  glass: 22,
  lock: 40,
  droneVert: 30, // % per second (altitude)
  charge: 1.6,  // % per second
};

const AUTO_STEPS = [
  { id: 1, name: 'WAIT FOR DRONE', action: (m) => { m.drone.detected = true; }, done: (m) => m.drone.detected },
  { id: 2, name: 'DRONE APPROACH', action: (m) => { m.drone.docked = false; m.drone.altitude = 60; }, done: (m) => m.drone.altitude < 55 },
  { id: 3, name: 'LANDING DETECTED', action: () => {}, done: (m) => m.drone.altitude <= 1, wait: 600 },
  { id: 4, name: 'LANDING CONFIRMED', action: (m) => { m.drone.docked = true; m.drone.altitude = 0; }, done: () => true, wait: 500 },
  { id: 5, name: 'DOOR CLOSE', action: (m) => { m.door.target = 0; }, done: (m) => m.door.position <= 0.5 },
  { id: 6, name: 'CROSS DOWN', action: (m) => { m.platform.target = 0; }, done: (m) => m.platform.position <= 0.5 },
  { id: 7, name: 'GLASS CENTER', action: (m) => { Object.keys(m.glass.rods).forEach(k => { m.glass.rods[k].target = 100; }); }, done: (m) => Object.values(m.glass.rods).every(r => r.position >= 99) },
  { id: 8, name: 'DRONE LOCK', action: (m) => { m.lock.target = 'LOCKED'; }, done: (m) => m.lock.state === 'LOCKED' },
  { id: 9, name: 'CHARGING CONNECTION CHECK', action: () => {}, done: (m) => m.sensors.chargingContact, wait: 500 },
  { id: 10, name: 'CHARGING START', action: (m) => { m.charging.active = true; }, done: (m) => m.charging.active, wait: 400 },
  { id: 11, name: 'BATTERY MONITORING', action: () => {}, done: (m) => m.charging.battery >= m.charging.targetPct },
  { id: 12, name: 'CHARGING COMPLETE', action: () => {}, done: () => true, wait: 400 },
  { id: 13, name: 'CHARGING STOP', action: (m) => { m.charging.active = false; }, done: (m) => !m.charging.active, wait: 300 },
  { id: 14, name: 'DRONE UNLOCK', action: (m) => { m.lock.target = 'UNLOCKED'; }, done: (m) => m.lock.state === 'UNLOCKED' },
  { id: 15, name: 'CROSS UP', action: (m) => { m.platform.target = 100; }, done: (m) => m.platform.position >= 99.5 },
  { id: 16, name: 'DOOR OPEN', action: (m) => { m.door.target = 100; }, done: (m) => m.door.position >= 99.5 },
  { id: 17, name: 'TAKEOFF AUTHORIZATION', action: (m) => { m.drone.armed = true; }, done: (m) => m.drone.armed, wait: 500 },
  { id: 18, name: 'DRONE TAKEOFF', action: (m) => { m.drone.altitude = 0; m.drone.docked = false; m.drone.takeoffSeq = true; }, done: (m) => m.drone.altitude >= 95 },
  { id: 19, name: 'DOCK RESET', action: (m) => { resetAfterCycle(m); }, done: () => true, wait: 400 },
];

function resetAfterCycle(m) {
  m.drone.takeoffSeq = false;
  m.drone.armed = false;
  m.drone.detected = false;
  m.drone.docked = false;
  m.drone.altitude = 0;
  m.drone.flightMode = 'STANDBY';
  Object.keys(m.glass.rods).forEach(k => { m.glass.rods[k].target = 0; });
}

function now() { return Date.now(); }
function ts() { return new Date().toLocaleTimeString('en-GB'); }

function makeInitial() {
  return {
    mockMode: true,
    hardwareTelemetry: false,
    hm30: { status: 'SIMULATOR', heartbeat: false, lastTelemetryAt: null, lastPacketAt: null, linkQuality: 'SIMULATOR', systemId: null, componentId: null, transport: 'SIMULATOR', comPort: null, baudRate: null },
    hm30Ports: [],
    hm30Test: null,
    dock: { status: 'SIMULATOR', connected: false, comPort: null, baudRate: null, lastPacketAt: null, bytesReceived: 0, stale: false, error: null },
    dockTelemetry: false,
    connected: false,
    connecting: false,
    connectionError: null,
    station: { ip: '10.168.7.52', port: 80, name: 'Dock Station Alpha', latency: 0, lastHeartbeat: null, controllerStatus: 'OFFLINE', wifiStatus: 'DISCONNECTED' },
    mode: 'MANUAL',
    emergencyStop: false,
    estopAcknowledged: true,
    door: { position: 0, target: 0, state: 'CLOSED' },
    platform: { position: 0, target: 0, state: 'DOWN', direction: 'NONE', speed: 0 },
    glass: {
      rods: {
        FRONT: { position: 0, target: 0, state: 'HOME', current: 0, direction: 'NONE' },
        REAR:  { position: 0, target: 0, state: 'HOME', current: 0, direction: 'NONE' },
        LEFT:  { position: 0, target: 0, state: 'HOME', current: 0, direction: 'NONE' },
        RIGHT: { position: 0, target: 0, state: 'HOME', current: 0, direction: 'NONE' },
      },
      speed: 22, moveDistance: 25, state: 'HOME', position: 0, target: 0,
    },
    lock: { state: 'UNLOCKED', target: 'UNLOCKED' },
    drone: { name: 'SIYI HM30', detected: false, docked: false, armed: false, altitude: 0, battery: 62, voltage: 22.4, current: 0, temp: 24, heading: 0, speed: 0, latitude: null, longitude: null, roll: 0, pitch: 0, yaw: 0, flightMode: 'STANDBY', takeoffReady: false, takeoffSeq: false },
    charging: { active: false, battery: 62, voltage: 0, current: 0, power: 0, temperature: 24, chargingTime: 0, timeRemaining: 0, targetPct: 100, errors: [] },
    operation: { name: 'IDLE', step: 0, totalSteps: AUTO_STEPS.length, progress: 0, running: false, sessionId: null, startedTs: null, batteryStart: 0, steps: AUTO_STEPS.map(s => ({ id: s.id, name: s.name, status: 'PENDING' })) },
    sensors: {
      doorOpenLimit: false, doorClosedLimit: true,
      platformTopLimit: false, platformBottomLimit: true,
      glassFrontHome: true, glassFrontCenter: false,
      glassRearHome: true, glassRearCenter: false,
      glassLeftHome: true, glassLeftCenter: false,
      glassRightHome: true, glassRightCenter: false,
      lockEngaged: false, lockReleased: true,
      dronePresence: false, dockingAlignment: false, chargingContact: false,
      emergencyStop: false, motorOverload: false, temperature: 24, batteryConnection: true,
    },
    motors: {
      door: { state: 'IDLE', direction: 'NONE', position: 0, speed: 0, current: 0, temp: 24, fault: false },
      lift: { state: 'IDLE', direction: 'NONE', position: 0, speed: 0, current: 0, temp: 24, fault: false },
      glass: { state: 'IDLE', direction: 'NONE', position: 50, speed: 0, current: 0, temp: 24, fault: false },
      lock: { state: 'IDLE', direction: 'NONE', position: 0, speed: 0, current: 0, temp: 24, fault: false },
    },
    alarms: [],
    console: [],
    jobs: [],
    history: [],
    droneHistory: [],
    audit: [],
    savedStations: [
      { id: 's1', name: 'Workshop Dock', ip: '10.168.7.52', port: 80 },
      { id: 's2', name: 'Rooftop Station', ip: '192.168.1.100', port: 80 },
    ],
    settings: {
      units: 'metric', language: 'en', theme: (typeof localStorage !== 'undefined' && localStorage.getItem('dd_theme')) || 'dark',
      controllerType: 'MockAdapter', maxPlatformSpeed: 80, doorTimeout: 15, lockTimeout: 8,
      maxChargeCurrent: 8, maxTemp: 55, targetBattery: 100, chargeTimeout: 240,
      logLevel: 'INFO', stationName: 'Dock Station Alpha',
    },
    docking: { status: 'IDLE' },
    _runner: null,
    _stepTimer: 0,
  };
}

// ---------- Safety interlocks (backend-equivalent validation) ----------
function safety(m) {
  const moving = (axis) => Math.abs(axis.position - axis.target) > 0.5;
  return {
    canOpenDoor: () => !m.emergencyStop && !moving(m.platform),
    canCloseDoor: () => !m.emergencyStop && !moving(m.platform),
    canLowerCross: () => !m.emergencyStop && !moving(m.door) && m.door.position < 5,
    canRaiseCross: () => !m.emergencyStop && !moving(m.door),
    canMoveGlass: () => !m.emergencyStop,
    canStartCharging: () => !m.emergencyStop && m.drone.docked && m.platform.position < 5 && m.lock.state === 'LOCKED' && m.sensors.chargingContact && !m.sensors.motorOverload,
    canStopCharging: () => !m.emergencyStop,
    canArm: () => !m.emergencyStop && m.drone.docked,
    canDisarm: () => !m.emergencyStop && !m.charging.active,
    canTakeoff: () => !m.emergencyStop && m.door.position > 95 && m.platform.position > 95 && m.lock.state === 'UNLOCKED' && m.drone.detected && !criticalAlarm(m) && m.drone.armed,
    canLand: () => !m.emergencyStop && m.door.position > 95 && m.platform.position > 95 && m.lock.state === 'UNLOCKED',
    canStartAuto: () => !m.emergencyStop && m.mode === 'AUTO' && !m.operation.running,
  };
}

function criticalAlarm(m) {
  return m.alarms.some(a => a.severity === 'CRITICAL' && a.state === 'ACTIVE');
}

// ---------- command result ----------
function ok(cmd) { return { success: true, command: cmd }; }
function fail(cmd, code, message) { return { success: false, command: cmd, errorCode: code, message }; }

export const MachineContext = createContext(null);
export const useMachine = () => useContext(MachineContext);

export function MachineProvider({ children }) {
  const machine = useRef(makeInitial());
  const gatewayClient = useRef(null);
  const [snapshot, setSnapshot] = useState(() => ({ ...machine.current }));
  const [, force] = useState(0);

  const log = useCallback((level, message, source = 'SYSTEM') => {
    const m = machine.current;
    m.console.unshift({ id: now() + Math.random(), time: ts(), level, message, source, sessionId: m.operation?.sessionId || null });
    if (m.console.length > 400) m.console.length = 400;
  }, []);

  const addHistory = useCallback((type, action, detail = '') => {
    const m = machine.current;
    m.history.unshift({ id: now() + Math.random(), time: ts(), timestamp: now(), type, action, detail });
    if (m.history.length > 500) m.history.length = 500;
  }, []);

  const addAudit = useCallback((user, command, mode, result, error = '') => {
    const m = machine.current;
    m.audit.unshift({ id: now() + Math.random(), time: ts(), timestamp: now(), user, command, mode, result, error });
    if (m.audit.length > 500) m.audit.length = 500;
  }, []);

  const raiseAlarm = useCallback((code, severity, message) => {
    const m = machine.current;
    if (m.alarms.some(a => a.code === code && a.state === 'ACTIVE')) return;
    m.alarms.unshift({ id: now() + Math.random(), code, severity, message, state: 'ACTIVE', raisedAt: ts(), raisedTs: now() });
    log('ERROR', `ALARM: ${code} — ${message}`, 'SAFETY');
  }, [log]);

  const resolveAlarm = useCallback((code) => {
    const m = machine.current;
    m.alarms.forEach(a => { if (a.code === code && a.state === 'ACTIVE') a.state = 'RESOLVED'; });
  }, []);

  // ---------- command dispatch ----------
  const dispatch = useCallback((command, payload, user = 'Operator') => {
    const m = machine.current;
    if (m.emergencyStop && command !== 'EMERGENCY_RESET' && command !== 'DISCONNECT' && command !== 'CONNECT') {
      log('WARNING', `Command ${command} rejected — Emergency Stop active`, 'SAFETY');
      addAudit(user, command, m.mode, 'REJECTED', 'EMERGENCY_STOP');
      return fail(command, 'EMERGENCY_STOP', 'Emergency stop is active. Reset before issuing commands.');
    }
    const s = safety(m);
    const reject = (code, msg) => { log('ERROR', `${command} rejected: ${msg}`, 'SAFETY'); addAudit(user, command, m.mode, 'REJECTED', code); return fail(command, code, msg); };

    switch (command) {
      case 'DOOR_OPEN':
        if (!s.canOpenDoor()) return reject('UNSAFE_STATE', 'Cannot open door while platform is moving.');
        m.door.target = 100; log('COMMAND', 'DOOR_OPEN'); addHistory('DOOR', 'OPEN'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'DOOR_CLOSE':
        if (!s.canCloseDoor()) return reject('UNSAFE_STATE', 'Cannot close door while platform is moving.');
        m.door.target = 0; log('COMMAND', 'DOOR_CLOSE'); addHistory('DOOR', 'CLOSE'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'DOOR_STOP':
        m.door.target = m.door.position; log('COMMAND', 'DOOR_STOP'); return ok(command);
      case 'CROSS_UP':
        if (!s.canRaiseCross()) return reject('UNSAFE_STATE', 'Cross lift raise blocked — door not secured or moving.');
        if (m.lock.state === 'LOCKED') m.lock.target = 'UNLOCKED';
        m.platform.target = 100; log('COMMAND', 'CROSS_UP'); addHistory('CROSS', 'UP'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'CROSS_DOWN':
        if (!s.canLowerCross()) return reject('DOOR_NOT_SECURED', 'Cross lift movement blocked — door not closed.');
        m.platform.target = 0; log('COMMAND', 'CROSS_DOWN'); addHistory('CROSS', 'DOWN'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'CROSS_STOP':
        m.platform.target = m.platform.position; log('COMMAND', 'CROSS_STOP'); return ok(command);
      case 'GLASS_CENTER':
        if (!s.canMoveGlass()) return reject('UNSAFE_STATE', 'Emergency stop active.');
        Object.keys(m.glass.rods).forEach(k => { m.glass.rods[k].target = 100; });
        log('COMMAND', 'GLASS_CENTER'); addHistory('GLASS', 'CENTER'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'GLASS_GETBACK':
        if (!s.canMoveGlass()) return reject('UNSAFE_STATE', 'Emergency stop active.');
        Object.keys(m.glass.rods).forEach(k => { m.glass.rods[k].target = 0; });
        log('COMMAND', 'GLASS_GETBACK'); addHistory('GLASS', 'GET_BACK'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'GLASS_STOP':
        Object.keys(m.glass.rods).forEach(k => { m.glass.rods[k].target = m.glass.rods[k].position; });
        log('COMMAND', 'GLASS_STOP'); return ok(command);
      case 'GLASS_STEP': {
        if (!s.canMoveGlass()) return reject('UNSAFE_STATE', 'Emergency stop active.');
        const rod = (payload && payload.rod) || 'FRONT';
        if (!m.glass.rods[rod]) return fail(command, 'UNKNOWN_ROD', `Unknown rod: ${rod}`);
        m.glass.rods[rod].target = clamp(m.glass.rods[rod].position + m.glass.moveDistance, 0, 100);
        log('COMMAND', `GLASS_STEP_${rod}`); addHistory('GLASS', `STEP_${rod}`); return ok(command);
      }
      case 'GLASS_ROD_IN': {
        if (!s.canMoveGlass()) return reject('UNSAFE_STATE', 'Emergency stop active.');
        const rod = (payload && payload.rod) || 'FRONT';
        if (!m.glass.rods[rod]) return fail(command, 'UNKNOWN_ROD', `Unknown rod: ${rod}`);
        m.glass.rods[rod].target = 100;
        log('COMMAND', `GLASS_ROD_IN_${rod}`); addHistory('GLASS', `IN_${rod}`); return ok(command);
      }
      case 'GLASS_ROD_HOME': {
        if (!s.canMoveGlass()) return reject('UNSAFE_STATE', 'Emergency stop active.');
        const rod = (payload && payload.rod) || 'FRONT';
        if (!m.glass.rods[rod]) return fail(command, 'UNKNOWN_ROD', `Unknown rod: ${rod}`);
        m.glass.rods[rod].target = 0;
        log('COMMAND', `GLASS_ROD_HOME_${rod}`); addHistory('GLASS', `HOME_${rod}`); return ok(command);
      }
      case 'GLASS_SET_SPEED':
        if (payload && typeof payload.value === 'number') m.glass.speed = clamp(payload.value, 1, 100);
        return ok(command);
      case 'GLASS_SET_DISTANCE':
        if (payload && typeof payload.value === 'number') m.glass.moveDistance = clamp(payload.value, 1, 100);
        return ok(command);
      case 'CHARGING_START':
        if (!s.canStartCharging()) return reject('CHARGING_PRECONDITION', 'Charging requires docked drone, platform down, lock engaged, contact detected.');
        m.charging.active = true; log('COMMAND', 'CHARGING_START'); addHistory('CHARGING', 'START'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'CHARGING_STOP':
        if (!s.canStopCharging()) return reject('UNSAFE_STATE', 'Emergency stop active.');
        m.charging.active = false; log('COMMAND', 'CHARGING_STOP'); addHistory('CHARGING', 'STOP'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'DRONE_ARM':
        if (!s.canArm()) return reject('DRONE_NOT_DOCKED', 'Arm requires docked drone.');
        m.drone.armed = true; m.drone.flightMode = 'ARMED'; log('COMMAND', 'DRONE_ARM'); addHistory('DRONE', 'ARM'); return ok(command);
      case 'DRONE_DISARM':
        if (!s.canDisarm()) return reject('CHARGING_ACTIVE', 'Disarm blocked while charging.');
        m.drone.armed = false; m.drone.flightMode = 'STANDBY'; log('COMMAND', 'DRONE_DISARM'); addHistory('DRONE', 'DISARM'); return ok(command);
      case 'DRONE_TAKEOFF':
        if (!s.canTakeoff()) return reject('TAKEOFF_NOT_READY', 'Takeoff requires door open, platform up, lock released, drone armed.');
        m.drone.takeoffSeq = true; m.drone.docked = false; log('COMMAND', 'DRONE_TAKEOFF'); addHistory('DRONE', 'TAKEOFF'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'DRONE_LAND':
        if (!s.canLand()) return reject('LAND_NOT_READY', 'Land requires door open, platform up, lock released.');
        m.drone.detected = true; m.drone.docked = false; m.drone.altitude = 100; m.drone.flightMode = 'LANDING';
        log('COMMAND', 'DRONE_LAND — drone approaching from altitude'); addHistory('DRONE', 'LAND'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'DRONE_RETURN':
        if (m.emergencyStop) return reject('UNSAFE_STATE', 'Emergency stop active.');
        if (m.drone.takeoffSeq) { m.drone.takeoffSeq = false; m.drone.detected = true; m.drone.flightMode = 'LANDING'; log('COMMAND', 'DRONE_ABORT_TAKEOFF'); addHistory('DRONE', 'ABORT_TAKEOFF'); }
        else { m.drone.detected = true; m.drone.docked = false; m.drone.altitude = Math.max(m.drone.altitude, 80); m.drone.flightMode = 'RETURNING'; log('COMMAND', 'DRONE_RETURN_TO_DOCK'); addHistory('DRONE', 'RETURN'); }
        return ok(command);
      case 'EMERGENCY_STOP':
        m.emergencyStop = true; m.estopAcknowledged = false;
        m.door.target = m.door.position; m.platform.target = m.platform.position; Object.keys(m.glass.rods).forEach(k => { m.glass.rods[k].target = m.glass.rods[k].position; });
        m.lock.target = m.lock.state; m.charging.active = false; m.operation.running = false; m._runner = null;
        raiseAlarm('EMERGENCY_STOP', 'CRITICAL', 'Emergency stop activated — all motion halted.');
        log('ERROR', 'EMERGENCY STOP ACTIVATED', 'SAFETY'); addHistory('SAFETY', 'EMERGENCY_STOP'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'EMERGENCY_RESET':
        m.emergencyStop = false; m.estopAcknowledged = true; resolveAlarm('EMERGENCY_STOP');
        log('SYSTEM', 'Emergency stop reset — state synchronization required.', 'SAFETY'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'SET_MODE_AUTO':
        m.mode = 'AUTO'; log('SYSTEM', 'Mode → AUTO'); return ok(command);
      case 'SET_MODE_MANUAL':
        if (m.operation.running) return reject('OPERATION_RUNNING', 'Cannot switch to manual during automatic operation.');
        m.mode = 'MANUAL'; log('SYSTEM', 'Mode → MANUAL'); return ok(command);
      case 'OPERATION_START':
        if (!s.canStartAuto()) return reject('AUTO_NOT_READY', 'Start requires AUTO mode and no running operation.');
        startAutoSequence(user); return ok(command);
      case 'OPERATION_ABORT':
        m.operation.running = false; m._runner = null;
        m.door.target = m.door.position; m.platform.target = m.platform.position; Object.keys(m.glass.rods).forEach(k => { m.glass.rods[k].target = m.glass.rods[k].position; });
        log('WARNING', 'Automatic operation aborted by operator.', 'OPERATION'); addHistory('OPERATION', 'ABORT'); addAudit(user, command, m.mode, 'SUCCESS'); return ok(command);
      case 'RUN_DEMO':
        m.mode = 'AUTO'; startAutoSequence(user, true); log('SYSTEM', 'RUN DEMO started', 'DEMO'); return ok(command);
      default:
        return fail(command, 'UNKNOWN_COMMAND', `Unknown command: ${command}`);
    }
  }, [log, addHistory, addAudit, raiseAlarm, resolveAlarm]);

  const startAutoSequence = useCallback((user, isDemo = false) => {
    const m = machine.current;
    m.operation.running = true;
    m.operation.step = 0;
    m.operation.progress = 0;
    m.operation.sessionId = 'S' + now();
    m.operation.startedTs = now();
    m.operation.batteryStart = Math.round(m.charging.battery);
    m.operation.name = isDemo ? 'DEMO: AUTOMATIC DOCKING CYCLE' : 'AUTOMATIC DOCKING CYCLE';
    m.operation.steps.forEach(s => s.status = 'PENDING');
    // reset to a clean starting state for the cycle
    m.drone.detected = false; m.drone.docked = false; m.drone.altitude = 0; m.drone.armed = false;
    m.charging.active = false; m.lock.target = 'UNLOCKED'; m.door.target = 100; m.platform.target = 100; Object.keys(m.glass.rods).forEach(k => { m.glass.rods[k].target = 0; });
    m._runner = { index: 0, started: false, waitUntil: 0 };
    log('SYSTEM', `Operation started: ${m.operation.name}`, 'OPERATION');
    addAudit(user, 'OPERATION_START', 'AUTO', 'SUCCESS');
  }, [log, addAudit]);

  // ---------- connection ----------
  const connect = useCallback((ip, port) => {
    const m = machine.current;
    m.connecting = true; m.connectionError = null;
    m.station.ip = ip || m.station.ip; m.station.port = port || m.station.port;
    log('SYSTEM', `Connecting to ${m.station.ip}:${m.station.port}...`, 'NETWORK');
    setTimeout(() => {
      m.connecting = false; m.connected = true; m.mockMode = true;
      m.station.controllerStatus = 'ONLINE'; m.station.wifiStatus = 'CONNECTED';
      m.station.lastHeartbeat = ts(); m.station.latency = Math.floor(80 + Math.random() * 80);
      log('SYSTEM', `Connected to station ${m.station.ip} (Mock Hardware)`, 'NETWORK');
    }, 900);
  }, [log]);

  const disconnect = useCallback(() => {
    const m = machine.current;
    m.connected = false; m.connecting = false;
    m.station.controllerStatus = 'OFFLINE'; m.station.wifiStatus = 'DISCONNECTED';
    m.operation.running = false; m._runner = null;
    m.emergencyStop = false; m.estopAcknowledged = true; resolveAlarm('EMERGENCY_STOP');
    log('WARNING', 'Disconnected from station. Emergency stop reset, last known state retained.', 'NETWORK');
  }, [log, resolveAlarm]);

  const testConnection = useCallback((ip, port) => {
    log('SYSTEM', `Testing connection to ${ip}:${port}...`, 'NETWORK');
    return new Promise((res) => setTimeout(() => res({ success: true, latency: Math.floor(60 + Math.random() * 60) }), 700));
  }, [log]);

  const ackAlarm = useCallback((code) => {
    machine.current.alarms.forEach(a => { if (a.code === code && a.state === 'ACTIVE') a.state = 'ACKNOWLEDGED'; });
  }, []);

  const saveStation = useCallback((station) => {
    const m = machine.current;
    if (station.id) { const i = m.savedStations.findIndex(s => s.id === station.id); if (i >= 0) m.savedStations[i] = station; }
    else { station.id = 's' + now(); m.savedStations.push(station); }
  }, []);

  const deleteStation = useCallback((id) => {
    machine.current.savedStations = machine.current.savedStations.filter(s => s.id !== id);
  }, []);

  const clearConsole = useCallback(() => { machine.current.console = []; }, []);

  const updateSettings = useCallback((patch) => { Object.assign(machine.current.settings, patch); }, []);

  const connectHm30 = useCallback((config) => {
    gatewayClient.current?.connectHm30(config);
  }, []);

  const disconnectHm30 = useCallback(() => {
    gatewayClient.current?.disconnectHm30();
    machine.current.hardwareTelemetry = false;
    machine.current.mockMode = true;
    machine.current.hm30 = { ...machine.current.hm30, status: 'HM30 DISCONNECTED', linkQuality: 'DISCONNECTED' };
  }, []);

  const listHm30Ports = useCallback(() => {
    gatewayClient.current?.listSerialPorts();
  }, []);

  const testHm30 = useCallback((config) => {
    gatewayClient.current?.testHm30(config);
  }, []);

  const connectDock = useCallback((config) => {
    gatewayClient.current?.connectDock(config);
  }, []);

  const disconnectDock = useCallback(() => {
    gatewayClient.current?.disconnectDock();
  }, []);

  useEffect(() => {
    const client = new HardwareGatewayClient({
      onStatus: status => {
        const m = machine.current;
        m.hm30 = { ...m.hm30, gatewayStatus: status };
        if (status === 'CONNECTED') client.listSerialPorts();
        setSnapshot({ ...m });
      },
      onMessage: message => {
        const m = machine.current;
        if (message.type === 'hm30_diagnostics') {
          m.hm30 = message.hm30;
          setSnapshot({ ...m });
        }
        if (message.type === 'error') {
          m.hm30 = { ...m.hm30, status: 'ERROR', linkQuality: 'ERROR', error: message.error };
          setSnapshot({ ...m });
        }
        if (message.type === 'serial_ports') {
          m.hm30Ports = message.ports || [];
          setSnapshot({ ...m });
        }
        if (message.type === 'hm30_test_result') {
          m.hm30Test = message.result;
          setSnapshot({ ...m });
        }
        if (message.type === 'dock_diagnostics' || message.type === 'dock_state') {
          m.dock = message.dock;
          m.dockTelemetry = message.dock.connected && !message.dock.stale;
          applyDockTelemetry(m, message.dock);
          setSnapshot({ ...m });
        }
        if (message.type === 'drone_state' && message.drone) {
          m.hardwareTelemetry = !message.stale;
          m.mockMode = message.stale;
          m.connected = !message.stale;
          m.drone = { ...m.drone, ...message.drone };
          if (m.droneHomeLatitude == null && Number.isFinite(m.drone.latitude) && Number.isFinite(m.drone.longitude)) {
            m.droneHomeLatitude = m.drone.latitude;
            m.droneHomeLongitude = m.drone.longitude;
          }
          m.hm30 = { ...m.hm30, status: message.stale ? 'TELEMETRY STALE' : 'HM30 CONNECTED' };
          setSnapshot({ ...m });
        }
      },
    });
    gatewayClient.current = client;
    client.connect();
    return () => {
      client.close();
      gatewayClient.current = null;
    };
  }, []);

  // ---------- simulation tick ----------
  useEffect(() => {
    const interval = setInterval(() => {
      const m = machine.current;
      const dt = TICK_MS / 1000;

      // heartbeat / latency when connected
      if (m.connected) {
        if (Math.random() < 0.3) { m.station.latency = Math.floor(90 + Math.random() * 70); m.station.lastHeartbeat = ts(); }
      }

      // emergency stop freezes motion
      const motionAllowed = !m.emergencyStop && !m.dockTelemetry;

      // DOOR
      if (motionAllowed && Math.abs(m.door.position - m.door.target) > 0.5) {
        const dir = m.door.target > m.door.position ? 1 : -1;
        m.door.position = clamp(m.door.position + dir * SPEED.door * dt, 0, 100);
        m.door.state = dir > 0 ? 'OPENING' : 'CLOSING';
        m.motors.door = { state: 'RUNNING', direction: dir > 0 ? 'OPEN' : 'CLOSE', position: m.door.position, speed: SPEED.door, current: 1.2 + Math.random() * 0.3, temp: m.motors.door.temp, fault: false };
      } else {
        m.door.position = m.door.target;
        m.door.state = m.door.position <= 0.5 ? 'CLOSED' : m.door.position >= 99.5 ? 'OPEN' : m.door.state;
        if (m.motors.door.state === 'RUNNING') { log('INFO', `DOOR_${m.door.state}`); m.motors.door = { ...m.motors.door, state: 'IDLE', direction: 'NONE', speed: 0, current: 0 }; }
      }

      // CROSS LIFT / LANDING PLATFORM — mechanically coupled: the platform is physically
      // attached to the cross lift, so a single position drives both. The platform cannot
      // rise while the drone lock is still engaged (the lock auto-releases on CROSS_UP).
      const crossRaisingLocked = m.platform.target > m.platform.position && m.lock.state === 'LOCKED';
      if (motionAllowed && !crossRaisingLocked && Math.abs(m.platform.position - m.platform.target) > 0.5) {
        const dir = m.platform.target > m.platform.position ? 1 : -1;
        m.platform.position = clamp(m.platform.position + dir * SPEED.platform * dt, 0, 100);
        m.platform.direction = dir > 0 ? 'UP' : 'DOWN'; m.platform.speed = SPEED.platform;
        m.platform.state = dir > 0 ? 'MOVING_UP' : 'MOVING_DOWN';
        m.motors.lift = { state: 'RUNNING', direction: m.platform.direction, position: m.platform.position, speed: SPEED.platform, current: 2.2 + Math.random() * 0.5, temp: m.motors.lift.temp, fault: false };
      } else {
        m.platform.position = m.platform.target; m.platform.speed = 0; m.platform.direction = 'NONE';
        m.platform.state = m.platform.position <= 0.5 ? 'DOWN' : m.platform.position >= 99.5 ? 'UP' : m.platform.state;
        if (m.motors.lift.state === 'RUNNING') { log('INFO', `PLATFORM_POSITION = ${m.platform.position.toFixed(0)}`); m.motors.lift = { ...m.motors.lift, state: 'IDLE', direction: 'NONE', speed: 0, current: 0 }; }
      }

      // GLASS — four centering rods (FRONT, REAR, LEFT, RIGHT)
      const glassSpeed = m.glass.speed || SPEED.glass;
      let glassMoving = false, glassSum = 0;
      Object.keys(m.glass.rods).forEach(k => {
        const r = m.glass.rods[k];
        if (motionAllowed && Math.abs(r.position - r.target) > 0.5) {
          const dir = r.target > r.position ? 1 : -1;
          r.position = clamp(r.position + dir * glassSpeed * dt, 0, 100);
          r.state = 'MOVING'; r.direction = dir > 0 ? 'IN' : 'OUT';
          r.current = 0.8 + Math.random() * 0.3;
          glassMoving = true;
        } else {
          r.position = r.target; r.direction = 'NONE'; r.current = 0;
          r.state = r.position >= 99 ? 'CENTERED' : r.position <= 1 ? 'HOME' : 'PARTIAL';
        }
        glassSum += r.position;
      });
      m.glass.position = glassSum / 4;
      m.glass.state = glassMoving ? 'MOVING' : (m.glass.position >= 99 ? 'CENTERED' : m.glass.position <= 1 ? 'HOME' : 'PARTIAL');
      m.motors.glass = { state: glassMoving ? 'RUNNING' : 'IDLE', direction: glassMoving ? 'IN' : 'NONE', position: m.glass.position, speed: glassMoving ? glassSpeed : 0, current: glassMoving ? 0.8 + Math.random() * 0.3 : 0, temp: m.motors.glass.temp, fault: false };

      // AUTO-DOCKING: after drone lands and glass centers, close door → lower platform → lock
      if (motionAllowed && !m.operation.running && m.drone.docked && m.platform.position > 95) {
        const allCentered = Object.values(m.glass.rods).every(r => r.position >= 99);
        if (allCentered) {
          if (m.door.position > 5 && m.door.target > 5) {
            m.door.target = 0;
            log('INFO', 'AUTO_DOCK — centering complete, closing door', 'DOCKING');
          } else if (m.door.position <= 5 && m.platform.target > 5) {
            m.platform.target = 0;
            log('INFO', 'AUTO_DOCK — door secured, lowering platform to engage lock', 'DOCKING');
            addHistory('DOCKING', 'AUTO_LOWER');
          }
        }
      }

      // LOCK — automatic mechanism (no manual control). Engages when the drone is docked
      // and the cross lift is fully down; releases when the cross lift is commanded up.
      if (motionAllowed && !m.operation.running) {
        if (m.drone.docked && m.platform.position < 5) m.lock.target = 'LOCKED';
        else if (m.platform.target > 5) m.lock.target = 'UNLOCKED';
      }
      // LOCK
      if (motionAllowed && m.lock.target !== m.lock.state) {
        m.lock.state = 'MOVING';
        m.motors.lock = { state: 'RUNNING', direction: m.lock.target === 'LOCKED' ? 'ENGAGE' : 'RELEASE', position: m.lock.target === 'LOCKED' ? Math.min(100, m.motors.lock.position + SPEED.lock * dt) : Math.max(0, m.motors.lock.position - SPEED.lock * dt), speed: SPEED.lock, current: 0.6, temp: m.motors.lock.temp, fault: false };
        if ((m.lock.target === 'LOCKED' && m.motors.lock.position >= 99) || (m.lock.target === 'UNLOCKED' && m.motors.lock.position <= 1)) {
          m.lock.state = m.lock.target; log('INFO', `DRONE_${m.lock.state === 'LOCKED' ? 'LOCKED' : 'UNLOCKED'}`); m.motors.lock = { ...m.motors.lock, state: 'IDLE', direction: 'NONE', speed: 0, current: 0 };
        }
      }

      // Simulator-only drone animation. Real HM30 telemetry owns these fields.
      if (!m.hardwareTelemetry && motionAllowed && m.drone.takeoffSeq) {
        m.drone.altitude = clamp(m.drone.altitude + SPEED.droneVert * dt, 0, 100);
        m.drone.flightMode = 'TAKEOFF';
        if (m.drone.altitude >= 99) { m.drone.takeoffSeq = false; m.drone.flightMode = 'AIRBORNE'; log('INFO', 'DRONE_AIRBORNE'); addHistory('DRONE', 'TAKEOFF_COMPLETE'); }
      }
      // landing approach — drone descends when detected, not docked, not taking off.
      // Station must have door open and platform up for the drone to land on the pad.
      if (!m.hardwareTelemetry && motionAllowed && m.drone.detected && !m.drone.docked && !m.drone.takeoffSeq) {
        if (m.door.position > 95 && m.platform.position > 95) {
          m.drone.altitude = clamp(m.drone.altitude - SPEED.droneVert * 0.6 * dt, 0, 100);
          m.drone.flightMode = 'LANDING';
          // landing independently confirmed by presence + alignment sensors
          if (m.drone.altitude <= 0.5) {
            m.drone.docked = true; m.drone.altitude = 0; m.drone.flightMode = 'DOCKED';
            log('INFO', 'DRONE_LANDED — landing confirmed by presence + alignment sensors', 'SENSORS');
            addHistory('DRONE', 'LANDED');
            // docking controller activates centering rods automatically
            if (!m.operation.running) {
              Object.keys(m.glass.rods).forEach(k => { m.glass.rods[k].target = 100; });
              log('INFO', 'CENTERING_RODS_ACTIVATED — docking controller engaging rods', 'DOCKING');
            }
          }
        } else {
          m.drone.flightMode = 'HOVERING';
        }
      }

      // CHARGING
      if (motionAllowed && m.charging.active) {
        m.charging.battery = clamp(m.charging.battery + SPEED.charge * dt, 0, m.charging.targetPct);
        m.charging.voltage = 23.5 + (m.charging.battery / 100) * 4.5;
        m.charging.current = m.charging.battery < 80 ? 6.4 : m.charging.battery < 95 ? 3.2 : 0.8;
        m.charging.power = m.charging.voltage * m.charging.current;
        m.charging.temperature = clamp(m.charging.temperature + (m.charging.current > 4 ? 0.05 : 0.01) * dt * 60, 24, 52);
        m.charging.chargingTime += dt;
        m.drone.battery = m.charging.battery; m.drone.voltage = m.charging.voltage; m.drone.temp = m.charging.temperature;
        m.sensors.chargingContact = true;
        if (m.charging.battery >= m.charging.targetPct) {
          m.charging.active = false; m.charging.current = 0; m.charging.power = 0;
          log('INFO', 'CHARGING_COMPLETE'); addHistory('CHARGING', 'COMPLETE');
        }
      } else {
        m.charging.current = 0; m.charging.power = 0; m.charging.voltage = m.charging.active ? m.charging.voltage : 0;
        if (!m.lock.state === 'LOCKED' && m.platform.position < 5) m.sensors.chargingContact = false;
      }
      m.charging.timeRemaining = m.charging.active ? Math.max(0, ((m.charging.targetPct - m.charging.battery) / SPEED.charge)) : 0;

      // sensors from positions
      const s = m.sensors;
      if (!m.dockTelemetry) {
        s.doorOpenLimit = m.door.position >= 99; s.doorClosedLimit = m.door.position <= 1;
        s.platformTopLimit = m.platform.position >= 99; s.platformBottomLimit = m.platform.position <= 1;
        s.glassFrontHome = m.glass.rods.FRONT.position <= 1; s.glassFrontCenter = m.glass.rods.FRONT.position >= 99;
        s.glassRearHome = m.glass.rods.REAR.position <= 1; s.glassRearCenter = m.glass.rods.REAR.position >= 99;
        s.glassLeftHome = m.glass.rods.LEFT.position <= 1; s.glassLeftCenter = m.glass.rods.LEFT.position >= 99;
        s.glassRightHome = m.glass.rods.RIGHT.position <= 1; s.glassRightCenter = m.glass.rods.RIGHT.position >= 99;
        s.lockEngaged = m.lock.state === 'LOCKED'; s.lockReleased = m.lock.state === 'UNLOCKED';
        s.dronePresence = m.drone.detected; s.dockingAlignment = m.drone.docked;
        s.chargingContact = m.lock.state === 'LOCKED' && m.platform.position < 5 && m.drone.docked;
        s.temperature = Math.round(m.charging.temperature);
      }
      s.emergencyStop = m.emergencyStop;
      // motor temps drift back to ambient
      Object.values(m.motors).forEach(mt => { mt.temp = clamp(mt.temp + (24 - mt.temp) * 0.02, 24, 70); });

      // takeoff readiness
      m.drone.takeoffReady = safety(m).canTakeoff();

      // docking status — reflects the confirmed docking workflow
      const allRodsCentered = Object.values(m.glass.rods).every(r => r.position >= 99);
      m.docking.status = m.drone.docked && m.lock.state === 'LOCKED' && allRodsCentered ? 'COMPLETE'
        : m.drone.docked && allRodsCentered ? 'CENTERED'
        : m.drone.docked ? 'DOCKED'
        : m.drone.detected ? 'APPROACHING'
        : 'IDLE';

      // AUTO sequence runner
      if (m.operation.running && m._runner) {
        const r = m._runner;
        const stepDef = AUTO_STEPS[r.index];
        if (!stepDef) {
          m.operation.running = false; m._runner = null; m.operation.progress = 100;
          log('SYSTEM', 'Operation complete.', 'OPERATION'); addHistory('OPERATION', 'COMPLETE');
          const endTs = now();
          const startTs = m.operation.startedTs || endTs;
          const durMs = endTs - startTs;
          const duration = `${String(Math.floor(durMs / 60000)).padStart(2, '0')}:${String(Math.floor((durMs % 60000) / 1000)).padStart(2, '0')}`;
          const sessionLogs = m.console.filter(c => c.sessionId === m.operation.sessionId).slice(0, 200).reverse();
          m.jobs.unshift({ id: 'J' + endTs, droneId: 'DRN-001', startTs, endTs, duration, batteryStart: m.operation.batteryStart, batteryEnd: Math.round(m.charging.battery), result: 'SUCCESS', error: '' });
          m.droneHistory.unshift({
            id: 'DH' + endTs, droneId: 'DRN-001', droneName: m.drone.name || 'DRN-001',
            startTs, endTs, startTime: new Date(startTs).toLocaleString('en-GB'),
            endTime: new Date(endTs).toLocaleString('en-GB'), duration,
            batteryStart: m.operation.batteryStart, batteryEnd: Math.round(m.charging.battery),
            result: 'SUCCESS', logs: sessionLogs,
          });
          // retain drone history for 30 days only
          const cutoff = endTs - 30 * 86400000;
          m.droneHistory = m.droneHistory.filter(h => h.endTs >= cutoff);
        }
        else {
          const stepState = m.operation.steps[r.index];
          if (!r.started) { stepState.status = 'RUNNING'; stepDef.action(m); r.started = true; r.waitUntil = 0; log('INFO', `STEP ${stepDef.id}: ${stepDef.name}`, 'OPERATION'); }
          const completed = stepDef.done(m);
          if (completed) {
            if (r.waitUntil === 0) { r.waitUntil = stepDef.wait ? now() + stepDef.wait : 0; }
            if (r.waitUntil === 0 || now() >= r.waitUntil) {
              stepState.status = 'COMPLETED';
              m.operation.step = r.index + 1;
              m.operation.progress = Math.round(((r.index + 1) / AUTO_STEPS.length) * 100);
              r.index++; r.started = false; r.waitUntil = 0;
            }
          }
        }
      }

      // periodic ambient telemetry when drone airborne
      if (m.drone.flightMode === 'AIRBORNE') { m.drone.heading = (m.drone.heading + 0.5) % 360; m.drone.speed = 8 + Math.random() * 2; }

      setSnapshot({ ...m });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [log, addHistory]);

  const value = {
    state: snapshot,
    machine,
    dispatch,
    connect, disconnect, testConnection,
    ackAlarm, saveStation, deleteStation, clearConsole, updateSettings,
    log, addHistory,
    safety: () => safety(machine.current),
    connectHm30, disconnectHm30, listHm30Ports, testHm30, connectDock, disconnectDock,
  };

  return <MachineContext.Provider value={value}>{children}</MachineContext.Provider>;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function applyDockTelemetry(machine, dock) {
  if (!dock || !machine.dockTelemetry) return;
  const open = value => value?.open === 1;
  const close = value => value?.close === 1;
  const doorOpen = open(dock.doors?.DOOR1) || open(dock.doors?.DOOR2);
  const doorClosed = close(dock.doors?.DOOR1) && close(dock.doors?.DOOR2);
  machine.door.position = doorOpen ? 100 : doorClosed ? 0 : machine.door.position;
  machine.door.state = doorOpen ? 'OPEN' : doorClosed ? 'CLOSED' : 'UNKNOWN';
  machine.platform.position = open(dock.sissor) ? 100 : close(dock.sissor) ? 0 : machine.platform.position;
  machine.platform.state = open(dock.sissor) ? 'UP' : close(dock.sissor) ? 'DOWN' : 'UNKNOWN';
  machine.glass.rods = Object.fromEntries(Object.entries(machine.glass.rods).map(([key, rod]) => {
    const source = dock.rods?.[`ROD${{ FRONT: 1, REAR: 2, LEFT: 3, RIGHT: 4 }[key]}`];
    return [key, { ...rod, position: source?.center === 1 ? 100 : source?.back === 1 ? 0 : rod.position, state: source?.center === 1 ? 'CENTERED' : source?.back === 1 ? 'HOME' : 'UNKNOWN' }];
  }));
  machine.glass.position = Object.values(machine.glass.rods).reduce((sum, rod) => sum + rod.position, 0) / 4;
  machine.glass.state = machine.glass.position >= 99 ? 'CENTERED' : machine.glass.position <= 1 ? 'HOME' : 'UNKNOWN';
  machine.sensors.doorOpenLimit = doorOpen;
  machine.sensors.doorClosedLimit = doorClosed;
  machine.sensors.platformTopLimit = open(dock.sissor);
  machine.sensors.platformBottomLimit = close(dock.sissor);
  machine.sensors.glassFrontCenter = dock.rods?.ROD1?.center === 1;
  machine.sensors.glassFrontHome = dock.rods?.ROD1?.back === 1;
  machine.sensors.glassRearCenter = dock.rods?.ROD2?.center === 1;
  machine.sensors.glassRearHome = dock.rods?.ROD2?.back === 1;
  machine.sensors.glassLeftCenter = dock.rods?.ROD3?.center === 1;
  machine.sensors.glassLeftHome = dock.rods?.ROD3?.back === 1;
  machine.sensors.glassRightCenter = dock.rods?.ROD4?.center === 1;
  machine.sensors.glassRightHome = dock.rods?.ROD4?.back === 1;
}