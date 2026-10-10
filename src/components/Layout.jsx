import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Cpu, Zap, Activity, TerminalSquare,
  Briefcase, History, Bell, Crosshair, Settings,
  Plane, Network, Boxes, Menu, X, ShieldAlert,
  Sun, Moon,
} from 'lucide-react';
import { useMachine } from '@/services/machineStore';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/manual', label: 'Control', icon: Cpu },
  { to: '/station3d', label: '3D Station', icon: Boxes },
  { to: '/drone', label: 'Drone', icon: Plane },
  { to: '/charging', label: 'Charging', icon: Zap },
  { to: '/sensors', label: 'Sensors', icon: Activity },

  { to: '/console', label: 'Console', icon: TerminalSquare },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/history', label: 'History', icon: History },
  { to: '/alarms', label: 'Alarms', icon: Bell },
  { to: '/calibration', label: 'Calibration', icon: Crosshair },
  { to: '/connection', label: 'Connection', icon: Network },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function StatusDot({ ok }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-500'} ${ok ? 'shadow-[0_0_6px] shadow-emerald-400/60' : 'shadow-[0_0_6px] shadow-red-500/60'}`} />;
}

export default function Layout() {
  const { state, dispatch, updateSettings } = useMachine();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const light = state.settings.theme === 'light';
    document.documentElement.classList.toggle('light', light);
    try { localStorage.setItem('dd_theme', state.settings.theme); } catch (e) {}
  }, [state.settings.theme]);

  const m = state;
  const connected = m.connected;
  const activeAlarms = m.alarms.filter(a => a.state === 'ACTIVE');
  const critical = activeAlarms.some(a => a.severity === 'CRITICAL');

  return (
    <div className="h-screen flex flex-col bg-[#0b0e12] text-slate-200 font-body overflow-hidden">
      {/* Top bar */}
      <header className="h-14 shrink-0 border-b border-white/10 bg-[#0e1217] flex items-center px-3 gap-3">
        <button className="lg:hidden p-2 hover:bg-white/5 rounded" onClick={() => setSidebarOpen(v => !v)}>
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <Plane size={16} className="text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-white">DRONE DOCK CONTROL CENTER</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">{m.station.name}</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 ml-6 text-xs">
          <div className="flex items-center gap-2">
            <StatusDot ok={connected} />
            <span className={connected ? 'text-emerald-400' : 'text-red-400'}>{connected ? 'CONNECTED' : m.connecting ? 'CONNECTING' : 'DISCONNECTED'}</span>
          </div>
          <span className="text-slate-500">{m.station.ip}:{m.station.port}</span>
          <span className="text-slate-500">HB {m.station.latency}ms</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${m.mode === 'AUTO' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>{m.mode}</span>
          {m.mockMode && <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-purple-500/20 text-purple-300">SIM</span>}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => updateSettings({ theme: m.settings.theme === 'light' ? 'dark' : 'light' })}
            className="p-2 hover:bg-white/5 rounded text-slate-400 hover:text-slate-200"
            title={m.settings.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {m.settings.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link to="/alarms" className="relative p-2 hover:bg-white/5 rounded">
            <Bell size={18} />
            {activeAlarms.length > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${critical ? 'bg-red-500' : 'bg-amber-500'} text-white`}>{activeAlarms.length}</span>
            )}
          </Link>
          <button
            onClick={() => dispatch(m.emergencyStop ? 'EMERGENCY_RESET' : 'EMERGENCY_STOP')}
            disabled={!connected}
            className={`flex items-center gap-2 px-3 h-9 rounded-md font-bold text-xs tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none ${
              m.emergencyStop
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_12px] shadow-red-600/40'
            }`}
          >
            <ShieldAlert size={15} />
            {m.emergencyStop ? 'RESET' : 'E-STOP'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'absolute z-30 h-[calc(100%-3.5rem-2rem)]' : 'hidden'} lg:relative lg:block w-56 shrink-0 border-r border-white/10 bg-[#0e1217] overflow-y-auto`}>
          <nav className="p-2 space-y-0.5">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                    active ? 'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}>
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#0b0e12]">
          <Outlet />
        </main>
      </div>

      {/* Status bar */}
      <footer className="h-8 shrink-0 border-t border-white/10 bg-[#0e1217] flex items-center px-3 gap-4 text-[11px] font-mono overflow-x-auto whitespace-nowrap">
        <Stat label="NET" value={connected ? 'CONNECTED' : 'OFFLINE'} ok={connected} />
        <Stat label="CTRL" value={m.station.controllerStatus} ok={m.station.controllerStatus === 'ONLINE'} />
        <Stat label="DRONE" value={m.drone.docked ? 'DOCKED' : m.drone.detected ? 'DETECTED' : 'AWAY'} ok={m.drone.detected} />
        <Stat label="DOOR" value={m.door.state} />
        <Stat label="CROSS" value={m.platform.state} />
        <Stat label="GLASS" value={m.glass.state} />
        <Stat label="LOCK" value={m.lock.state} ok={m.lock.state === 'LOCKED'} />
        <Stat label="CHARGE" value={`${Math.round(m.charging.battery)}%`} ok={m.charging.active} />
        <Stat label="E-STOP" value={m.emergencyStop ? 'ACTIVE' : 'READY'} ok={!m.emergencyStop} danger={m.emergencyStop} />
      </footer>
    </div>
  );
}

function Stat({ label, value, ok, danger }) {
  const color = danger ? 'text-red-400' : ok === undefined ? 'text-slate-300' : ok ? 'text-emerald-400' : 'text-slate-400';
  return <span className="flex items-center gap-1.5"><span className="text-slate-600">{label}:</span><span className={color}>{value}</span></span>;
}