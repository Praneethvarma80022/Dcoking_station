import React from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { Crosshair, Home, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Gauge, Ruler } from 'lucide-react';

const RODS = ['FRONT', 'REAR', 'LEFT', 'RIGHT'];

export default function GlassControls() {
  const { state: m, dispatch } = useMachine();
  const g = m.glass;
  const disabled = m.emergencyStop;

  const padBtn = (rod, icon) => (
    <button onClick={() => dispatch('GLASS_STEP', { rod })} disabled={disabled}
      title={`${rod} rod inward`}
      className="h-10 rounded bg-blue-600/80 hover:bg-blue-500 border border-blue-400/40 text-white flex items-center justify-center disabled:opacity-40">
      {icon}
    </button>
  );

  return (
    <Card className="bg-[#0e1217] border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crosshair size={16} className="text-blue-400" />
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Glass Centering Mechanism</div>
        </div>
        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${g.state === 'CENTERED' ? 'bg-emerald-500/20 text-emerald-300' : g.state === 'MOVING' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-500/20 text-slate-300'}`}>{g.state}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Automatic panel */}
        <div className="bg-white/5 rounded p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-2 text-center">Automatic</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => dispatch('GLASS_CENTER')} disabled={disabled}
              className="h-12 rounded font-mono font-bold text-xs bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/40 text-white disabled:opacity-40">CENTER</button>
            <button onClick={() => dispatch('GLASS_GETBACK')} disabled={disabled}
              className="h-12 rounded font-mono font-bold text-xs bg-blue-600/80 hover:bg-blue-500 border border-blue-400/40 text-white disabled:opacity-40">GET BACK</button>
          </div>
          <button onClick={() => dispatch('GLASS_STOP')} disabled={disabled}
            className="w-full mt-2 h-9 rounded font-mono font-bold text-xs bg-slate-700/60 hover:bg-slate-600 border border-slate-500/40 text-slate-200 disabled:opacity-40 flex items-center justify-center gap-1">
            <Square size={12} /> STOP
          </button>
        </div>

        {/* Directional pad */}
        <div className="bg-white/5 rounded p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-2 text-center">Directional Pad</div>
          <div className="grid grid-cols-3 gap-1.5 max-w-[160px] mx-auto">
            <div></div>
            {padBtn('FRONT', <ArrowUp size={16} />)}
            <div></div>
            {padBtn('LEFT', <ArrowLeft size={16} />)}
            <button onClick={() => dispatch('GLASS_STOP')} disabled={disabled}
              className="h-10 rounded bg-red-600/70 hover:bg-red-500 border border-red-400/40 text-white flex items-center justify-center disabled:opacity-40"><Square size={12} /></button>
            {padBtn('RIGHT', <ArrowRight size={16} />)}
            <div></div>
            {padBtn('REAR', <ArrowDown size={16} />)}
            <div></div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white/5 rounded p-2.5 space-y-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 text-center">Settings</div>
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1"><span className="flex items-center gap-1"><Gauge size={11} /> Speed</span><span className="font-mono text-slate-200">{g.speed}%/s</span></div>
            <input type="range" min="5" max="100" value={g.speed} onChange={e => dispatch('GLASS_SET_SPEED', { value: +e.target.value })} className="w-full accent-emerald-500" />
          </div>
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1"><span className="flex items-center gap-1"><Ruler size={11} /> Move Distance</span><span className="font-mono text-slate-200">{g.moveDistance}%</span></div>
            <input type="range" min="5" max="100" value={g.moveDistance} onChange={e => dispatch('GLASS_SET_DISTANCE', { value: +e.target.value })} className="w-full accent-blue-500" />
          </div>
        </div>
      </div>

      {/* Rod status */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        {RODS.map(r => {
          const rod = g.rods[r];
          const key = r.charAt(0) + r.slice(1).toLowerCase();
          const homeSense = m.sensors[`glass${key}Home`];
          const centerSense = m.sensors[`glass${key}Center`];
          return (
            <div key={r} className="bg-white/5 rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold text-slate-200">{r}</span>
                <span className={`text-[9px] font-mono ${rod.state === 'MOVING' ? 'text-amber-400' : rod.state === 'CENTERED' ? 'text-emerald-400' : 'text-slate-400'}`}>{rod.state}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
                <div className={`h-full ${rod.state === 'CENTERED' ? 'bg-emerald-500' : rod.state === 'MOVING' ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${rod.position}%` }} />
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mb-1.5">
                <span>POS {rod.position.toFixed(0)}%</span>
                <span>I {rod.current.toFixed(1)}A</span>
              </div>
              <div className="flex items-center gap-1 mb-1.5">
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${homeSense ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-500'}`}>HOME</span>
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${centerSense ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-500'}`}>CENTER</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => dispatch('GLASS_ROD_IN', { rod: r })} disabled={disabled}
                  className="h-7 text-[9px] font-mono rounded bg-emerald-600/70 hover:bg-emerald-500 text-white disabled:opacity-40">IN</button>
                <button onClick={() => dispatch('GLASS_STEP', { rod: r })} disabled={disabled}
                  className="h-7 text-[9px] font-mono rounded bg-blue-600/70 hover:bg-blue-500 text-white disabled:opacity-40">STEP</button>
                <button onClick={() => dispatch('GLASS_ROD_HOME', { rod: r })} disabled={disabled}
                  className="h-7 text-[9px] font-mono rounded bg-slate-700/60 hover:bg-slate-600 border border-slate-500/40 text-slate-200 disabled:opacity-40 flex items-center justify-center"><Home size={11} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}