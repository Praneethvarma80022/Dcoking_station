import React from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { ShieldCheck, ShieldAlert, Plane } from 'lucide-react';
import GlassControls from '@/components/GlassControls';

const GROUPS = [
  { title: 'DOOR', color: 'blue', buttons: [
    { label: 'OPEN', cmd: 'DOOR_OPEN' },
    { label: 'STOP', cmd: 'DOOR_STOP', neutral: true },
    { label: 'CLOSE', cmd: 'DOOR_CLOSE' },
  ]},
  { title: 'CROSS LIFT', color: 'blue', buttons: [
    { label: 'UP', cmd: 'CROSS_UP' },
    { label: 'STOP', cmd: 'CROSS_STOP', neutral: true },
    { label: 'DOWN', cmd: 'CROSS_DOWN' },
  ]},
  { title: 'CHARGING', color: 'emerald', buttons: [
    { label: 'START', cmd: 'CHARGING_START' },
    { label: 'STOP', cmd: 'CHARGING_STOP', neutral: true },
  ]},
];

const DRONE_BUTTONS = [
  { label: 'ARM', cmd: 'DRONE_ARM', color: 'blue' },
  { label: 'DISARM', cmd: 'DRONE_DISARM', color: 'slate' },
  { label: 'TAKEOFF', cmd: 'DRONE_TAKEOFF', color: 'emerald' },
  { label: 'LAND', cmd: 'DRONE_LAND', color: 'blue' },
  { label: 'RETURN / ABORT', cmd: 'DRONE_RETURN', color: 'amber' },
];

export default function ManualControl() {
  const { state: m, dispatch, safety } = useMachine();
  const s = safety();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Control</h1>
          <p className="text-xs text-slate-500">Industrial control panel — every command validated by safety interlocks</p>
        </div>
        <div className={`px-3 py-1.5 rounded text-xs font-bold ${m.emergencyStop ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
          {m.emergencyStop ? 'E-STOP ACTIVE' : 'READY'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {GROUPS.map(g => (
          <Card key={g.title} className="bg-[#0e1217] border-white/10 p-4">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">{g.title}</div>
            <div className="grid grid-cols-3 gap-2">
              {g.buttons.map(b => (
                <button key={b.cmd} onClick={() => dispatch(b.cmd)}
                  className={`h-14 rounded font-mono font-bold text-sm transition-all border ${
                    b.neutral ? 'bg-slate-700/60 hover:bg-slate-600 border-slate-500/40 text-slate-200'
                    : g.color === 'emerald' ? 'bg-emerald-600/80 hover:bg-emerald-500 border-emerald-400/40 text-white'
                    : g.color === 'amber' ? 'bg-amber-600/80 hover:bg-amber-500 border-amber-400/40 text-white'
                    : 'bg-blue-600/80 hover:bg-blue-500 border-blue-400/40 text-white'
                  }`}>
                  {b.label}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <GlassControls />

      <Card className="bg-[#0e1217] border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Plane size={16} className="text-blue-400" />
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Drone Controls</div>
          <div className="ml-auto flex gap-3 text-[11px] font-mono">
            <span className={m.drone.armed ? 'text-emerald-400' : 'text-slate-500'}>{m.drone.armed ? '● ARMED' : '○ DISARMED'}</span>
            <span className={m.drone.docked ? 'text-emerald-400' : 'text-slate-500'}>{m.drone.docked ? '● DOCKED' : '○ NOT DOCKED'}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {DRONE_BUTTONS.map(b => (
            <button key={b.cmd} onClick={() => dispatch(b.cmd)}
              className={`h-12 rounded font-mono font-bold text-xs border transition-all ${
                b.color === 'emerald' ? 'bg-emerald-600/80 hover:bg-emerald-500 border-emerald-400/40 text-white'
                : b.color === 'amber' ? 'bg-amber-600/80 hover:bg-amber-500 border-amber-400/40 text-white'
                : b.color === 'slate' ? 'bg-slate-700/60 hover:bg-slate-600 border-slate-500/40 text-slate-200'
                : 'bg-blue-600/80 hover:bg-blue-500 border-blue-400/40 text-white'
              }`}>
              {b.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="bg-[#0e1217] border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={16} className="text-emerald-400" />
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Safety Interlock Status</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {Object.entries(s).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 bg-white/5 rounded px-2 py-1.5">
              {v ? <ShieldCheck size={13} className="text-emerald-400" /> : <ShieldAlert size={13} className="text-red-400" />}
              <span className="font-mono text-slate-300">{k.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}