import React, { useState } from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Square } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Charging() {
  const { state: m, dispatch } = useMachine();
  const [hist] = useState(() => Array.from({ length: 30 }, (_, i) => ({ t: i, battery: 60, v: 22.4, i: 0, temp: 24, p: 0 })));
  // shift in live values
  hist.shift();
  hist.push({ t: hist.length, battery: m.charging.battery, v: m.charging.voltage, i: m.charging.current, temp: m.charging.temperature, p: m.charging.power });

  const canStart = m.drone.docked && m.platform.position < 5 && m.lock.state === 'LOCKED' && m.sensors.chargingContact && !m.emergencyStop;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Charging Dashboard</h1>
        <div className="flex gap-2">
          <Button className="bg-emerald-600 hover:bg-emerald-500" disabled={!canStart || m.charging.active} onClick={() => dispatch('CHARGING_START')}>
            <Play size={14} className="mr-2" />START CHARGING
          </Button>
          <Button variant="outline" className="border-red-500/40 text-red-300" disabled={!m.charging.active} onClick={() => dispatch('CHARGING_STOP')}>
            <Square size={14} className="mr-2" />STOP
          </Button>
        </div>
      </div>

      {!canStart && !m.charging.active && (
        <div className="text-xs px-3 py-2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
          Charging preconditions not met: drone docked, platform down, lock engaged, charging contact detected.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Battery" value={`${Math.round(m.charging.battery)}%`} />
        <Metric label="Voltage" value={`${m.charging.voltage.toFixed(1)} V`} />
        <Metric label="Current" value={`${m.charging.current.toFixed(1)} A`} />
        <Metric label="Power" value={`${m.charging.power.toFixed(0)} W`} />
        <Metric label="Temperature" value={`${m.charging.temperature.toFixed(0)} °C`} />
        <Metric label="Charging Time" value={`${Math.floor(m.charging.chargingTime / 60)}m ${Math.round(m.charging.chargingTime % 60)}s`} />
        <Metric label="ETA Remaining" value={m.charging.active ? `${Math.floor(m.charging.timeRemaining / 60)}m ${Math.round(m.charging.timeRemaining % 60)}s` : '—'} />
        <Metric label="Target" value={`${m.settings.targetBattery}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Battery %">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hist}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="t" stroke="#475569" /><YAxis domain={[0, 100]} stroke="#475569" /><Tooltip contentStyle={{ background: '#0e1217', border: '1px solid #334155' }} /><Line dataKey="battery" stroke="#10b981" dot={false} strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Voltage / Current">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hist}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="t" stroke="#475569" /><YAxis stroke="#475569" /><Tooltip contentStyle={{ background: '#0e1217', border: '1px solid #334155' }} /><Line dataKey="v" name="Voltage" stroke="#3b82f6" dot={false} strokeWidth={2} /><Line dataKey="i" name="Current" stroke="#f59e0b" dot={false} strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Temperature">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hist}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="t" stroke="#475569" /><YAxis stroke="#475569" /><Tooltip contentStyle={{ background: '#0e1217', border: '1px solid #334155' }} /><Line dataKey="temp" stroke="#ef4444" dot={false} strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Power">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={hist}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="t" stroke="#475569" /><YAxis stroke="#475569" /><Tooltip contentStyle={{ background: '#0e1217', border: '1px solid #334155' }} /><Line dataKey="p" stroke="#a855f7" dot={false} strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <Card className="bg-[#0e1217] border-white/10 p-3"><div className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</div><div className="text-xl font-bold text-white font-mono">{value}</div></Card>;
}
function ChartCard({ title, children }) {
  return <Card className="bg-[#0e1217] border-white/10 p-3"><div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">{title}</div>{children}</Card>;
}