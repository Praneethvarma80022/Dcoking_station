import React, { useState } from 'react';
import { useMachine } from '@/services/machineStore';
import StationScene from '@/components/StationScene';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Eye, EyeOff, Zap, Battery, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { state: m, dispatch } = useMachine();
  const [preset, setPreset] = useState('3D');
  const [showInternal, setShowInternal] = useState(false);

  const activeAlarms = m.alarms.filter(a => a.state === 'ACTIVE');
  const chargeTime = Math.round(m.charging.timeRemaining);
  const curStep = m.operation.steps.find(s => s.status === 'RUNNING') || m.operation.steps[m.operation.step - 1];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-3 p-3">
      {/* LEFT: 3D + controls */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <Card className="flex-1 relative overflow-hidden bg-[#0b0e12] border-white/10 p-0 min-h-[320px]">
          <StationScene preset={preset} showInternal={showInternal} />
          <div className="absolute top-3 right-3 flex gap-1.5">
            <button onClick={() => setPreset('3D')} className="px-2 py-1 text-[10px] font-mono rounded border bg-black/40 border-white/10 text-slate-400 hover:text-slate-200">RESET</button>
            <button onClick={() => setShowInternal(v => !v)} className="px-2 py-1 text-[10px] font-mono rounded border bg-black/40 border-white/10 text-slate-400 hover:text-slate-200 flex items-center gap-1">
              {showInternal ? <EyeOff size={11} /> : <Eye size={11} />} INTERNAL
            </button>
          </div>
          <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
            <Coord label="CROSS" value={`${m.platform.position.toFixed(0)}%`} target={m.platform.direction || '—'} dir={m.platform.direction} />
            <Coord label="GLASS" value={`${m.glass.position.toFixed(0)}%`} target={m.glass.state} />
            <Coord label="DOOR" value={`${m.door.position.toFixed(0)}%`} target={m.door.state} />
            <Coord label="LOCK" value={m.lock.state} target={m.lock.state} />
          </div>
        </Card>

        {/* Quick controls */}
        <Card className="bg-[#0e1217] border-white/10 p-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Quick Controls</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <CtrlGroup title="Door" buttons={[['OPEN', 'DOOR_OPEN'], ['CLOSE', 'DOOR_CLOSE']]} dispatch={dispatch} />
            <CtrlGroup title="Cross Lift" buttons={[['UP', 'CROSS_UP'], ['STOP', 'CROSS_STOP'], ['DOWN', 'CROSS_DOWN']]} dispatch={dispatch} />
            <CtrlGroup title="Glass" buttons={[['CENTER', 'GLASS_CENTER'], ['GET BACK', 'GLASS_GETBACK']]} dispatch={dispatch} />
            <CtrlGroup title="Charging" buttons={[['START', 'CHARGING_START'], ['STOP', 'CHARGING_STOP']]} dispatch={dispatch} />
          </div>
        </Card>
      </div>

      {/* RIGHT: status column */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">
        <Card className="bg-[#0e1217] border-white/10 p-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Machine Status</div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <StatusItem label="Door" value={m.door.state} />
            <StatusItem label="Cross Lift" value={m.platform.state} />
            <StatusItem label="Glass" value={m.glass.state} />
            <StatusItem label="Lock" value={m.lock.state} ok={m.lock.state === 'LOCKED'} />
            <StatusItem label="Charging" value={m.charging.active ? 'ACTIVE' : 'IDLE'} ok={m.charging.active} />
            <StatusItem label="Drone" value={m.drone.docked ? 'DOCKED' : m.drone.detected ? 'DETECTED' : 'AWAY'} ok={m.drone.detected} />
          </div>
        </Card>

        <Card className="bg-[#0e1217] border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Operation</div>
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-[11px] bg-blue-600 hover:bg-blue-500" onClick={() => { dispatch('SET_MODE_AUTO'); dispatch('OPERATION_START'); }} disabled={!m.connected || m.operation.running}>
                <Play size={12} className="mr-1" />START
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px] border-white/20" onClick={() => dispatch('OPERATION_ABORT')} disabled={!m.operation.running}>
                <RotateCcw size={12} className="mr-1" />ABORT
              </Button>
            </div>
          </div>
          <div className="text-sm font-semibold text-white">{m.operation.name}</div>
          <div className="text-[11px] text-slate-400 mb-2">Step {m.operation.step}/{m.operation.totalSteps} — {curStep?.name || '—'}</div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${m.operation.progress}%` }} />
          </div>
          <div className="text-right text-[11px] text-slate-400 mt-1">{m.operation.progress}%</div>
        </Card>

        <Card className="bg-[#0e1217] border-white/10 p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500 mb-2">
            <Battery size={13} /> Battery
          </div>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-2xl font-bold text-white">{Math.round(m.charging.battery)}%</span>
            {m.charging.active && <Zap size={16} className="text-emerald-400 animate-pulse" />}
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
            <div className={`h-full ${m.charging.battery > 80 ? 'bg-emerald-500' : m.charging.battery > 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${m.charging.battery}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-400">
            <span>V: {m.charging.voltage.toFixed(1)}V</span>
            <span>I: {m.charging.current.toFixed(1)}A</span>
            <span>P: {m.charging.power.toFixed(0)}W</span>
            <span>T: {m.charging.temperature.toFixed(0)}°C</span>
          </div>
          {m.charging.active && <div className="text-[11px] text-emerald-400 mt-1">ETA ~{Math.floor(chargeTime / 60)}m {chargeTime % 60}s</div>}
        </Card>

        <Card className="bg-[#0e1217] border-white/10 p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-500 mb-2">
            <AlertTriangle size={13} /> Alerts {activeAlarms.length > 0 && <span className="text-red-400">({activeAlarms.length})</span>}
          </div>
          {activeAlarms.length === 0 ? (
            <div className="text-xs text-slate-500">No active alarms</div>
          ) : (
            <div className="space-y-1.5">
              {activeAlarms.slice(0, 5).map(a => (
                <div key={a.id} className={`text-[11px] px-2 py-1 rounded border ${a.severity === 'CRITICAL' ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>
                  <div className="font-mono font-bold">{a.code}</div>
                  <div className="text-slate-400">{a.message}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Button className="bg-purple-600 hover:bg-purple-500" onClick={() => dispatch('RUN_DEMO')} disabled={!m.connected || m.operation.running}>
          <Play size={14} className="mr-2" /> RUN DEMO CYCLE
        </Button>
      </div>
    </div>
  );
}

function Coord({ label, value, target, dir }) {
  return (
    <div className="bg-black/50 border border-white/10 rounded px-2 py-1.5 backdrop-blur-sm">
      <div className="text-slate-500 text-[9px] uppercase tracking-wider">{label}</div>
      <div className="text-white font-bold">{value}</div>
      <div className="text-slate-400 text-[9px]">{dir ? `→ ${dir}` : target}</div>
    </div>
  );
}

function StatusItem({ label, value, ok }) {
  const color = ok === undefined ? 'text-slate-200' : ok ? 'text-emerald-400' : 'text-slate-300';
  return (
    <div className="flex items-center justify-between bg-white/5 rounded px-2 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function CtrlGroup({ title, buttons, dispatch }) {
  return (
    <div className="bg-white/5 rounded p-1.5">
      <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-1 text-center">{title}</div>
      <div className="flex gap-1 justify-center">
        {buttons.map(([label, cmd]) => (
          <button key={cmd} onClick={() => dispatch(cmd)}
            className="px-2 py-1 text-[10px] font-mono rounded bg-blue-600/80 hover:bg-blue-500 text-white transition-colors">
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}