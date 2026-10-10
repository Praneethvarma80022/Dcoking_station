import React from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane, Radio, Compass, Gauge, Thermometer, Battery } from 'lucide-react';

export default function Drone() {
  const { state: m, dispatch } = useMachine();
  const d = m.drone;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Drone Status</h1>
        <div className="flex gap-2">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-500" disabled={!d.armed} onClick={() => dispatch('DRONE_DISARM')}>DISARM</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" disabled={d.armed || !d.docked} onClick={() => dispatch('DRONE_ARM')}>ARM</Button>
          <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-300" disabled={!d.takeoffReady} onClick={() => dispatch('DRONE_TAKEOFF')}>TAKEOFF</Button>
          <Button size="sm" variant="outline" className="border-white/20" onClick={() => dispatch('DRONE_LAND')}>LAND</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-[#0e1217] border-white/10 p-4 lg:col-span-2">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Telemetry</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <TIcon icon={Radio} label="Connection" value={d.docked ? 'DOCKED' : d.detected ? 'DETECTED' : 'AIRBORNE'} ok={d.detected || d.flightMode === 'AIRBORNE'} />
            <TIcon icon={Battery} label="Battery" value={`${Math.round(d.battery)}%`} />
            <TIcon icon={Gauge} label="Altitude" value={`${Math.round(d.altitude)} %`} />
            <TIcon icon={Compass} label="Heading" value={`${Math.round(d.heading)}°`} />
            <TIcon icon={Gauge} label="Speed" value={`${d.speed.toFixed(1)} m/s`} />
            <TIcon icon={Thermometer} label="Temp" value={`${d.temp.toFixed(0)}°C`} />
            <TIcon icon={Plane} label="Armed" value={d.armed ? 'ARMED' : 'DISARMED'} ok={d.armed} />
            <TIcon icon={Plane} label="Flight Mode" value={d.flightMode} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Info label="Docking Status" value={d.docked ? 'DOCKED & LOCKED' : d.detected ? 'APPROACHING' : 'AWAY'} />
            <Info label="Takeoff Readiness" value={d.takeoffReady ? 'READY' : 'NOT READY'} ok={d.takeoffReady} />
          </div>
        </Card>

        <Card className="bg-[#0e1217] border-white/10 p-4">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Attitude Indicator</div>
          <Attitude heading={d.heading} armed={d.armed} />
        </Card>
      </div>
    </div>
  );
}

function TIcon({ icon: Icon, label, value, ok }) {
  const color = ok === undefined ? 'text-slate-200' : ok ? 'text-emerald-400' : 'text-slate-300';
  return (
    <div className="bg-white/5 rounded p-3">
      <Icon size={16} className="text-slate-500 mb-1" />
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}
function Info({ label, value, ok }) {
  const color = ok ? 'text-emerald-400' : 'text-slate-300';
  return <div className="bg-white/5 rounded px-3 py-2"><div className="text-[10px] text-slate-500 uppercase">{label}</div><div className={`font-mono font-bold ${color}`}>{value}</div></div>;
}
function Attitude({ heading, armed }) {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-40 h-40 rounded-full border-2 border-white/20 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-full h-1/2 top-0 bg-blue-500/30" />
          <div className="absolute w-full h-1/2 bottom-0 bg-amber-700/30" />
          <div className="absolute w-full h-0.5 bg-white/40 top-1/2" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotate(${-heading}deg)` }}>
          <div className="w-1 h-20 bg-emerald-400 origin-bottom" style={{ transform: 'translateY(-50%)' }} />
        </div>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/70">N</div>
        <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono ${armed ? 'text-emerald-400' : 'text-slate-500'}`}>{armed ? 'ARMED' : 'SAFE'}</div>
      </div>
    </div>
  );
}