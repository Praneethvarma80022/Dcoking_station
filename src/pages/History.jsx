import React, { useState, useMemo } from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plane, Clock, ChevronRight, Battery } from 'lucide-react';

const RANGES = ['Today', 'Last 7 Days', 'Last 30 Days', 'Custom'];

const LEVEL_COLOR = {
  ERROR: 'text-red-400',
  WARNING: 'text-amber-400',
  COMMAND: 'text-blue-300',
  SYSTEM: 'text-slate-400',
  INFO: 'text-emerald-400',
};

export default function History() {
  const { state: m } = useMachine();
  const [range, setRange] = useState('Last 7 Days');
  const [selected, setSelected] = useState(null);

  const counts = useMemo(() => {
    const c = {};
    m.history.forEach(h => { c[h.type] = (c[h.type] || 0) + 1; });
    return Object.entries(c).map(([type, count]) => ({ type, count }));
  }, [m.history]);

  const droneSessions = m.droneHistory || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">History</h1>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 text-xs rounded border ${range === r ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}>{r}</button>
          ))}
        </div>
      </div>

      {counts.length > 0 && (
        <Card className="bg-[#0e1217] border-white/10 p-4">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Operations by Type</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={counts}><CartesianGrid stroke="#1e293b" /><XAxis dataKey="type" stroke="#475569" /><YAxis stroke="#475569" allowDecimals={false} /><Tooltip contentStyle={{ background: '#0e1217', border: '1px solid #334155' }} /><Bar dataKey="count" fill="#10b981" /></BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Drone session history — retained 30 days, click to open logs */}
      <Card className="bg-[#0e1217] border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <Plane size={15} className="text-emerald-400" />
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Drone Session History</div>
          <div className="ml-auto text-[10px] text-slate-600 font-mono">{droneSessions.length} session{droneSessions.length === 1 ? '' : 's'} · retained 30 days</div>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {droneSessions.length === 0 ? (
            <div className="text-center text-slate-600 py-8 text-sm">No drone sessions yet — run a docking cycle to generate a record</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-slate-500 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Drone</th>
                  <th className="text-left px-3 py-2">Start</th>
                  <th className="text-left px-3 py-2">End</th>
                  <th className="text-left px-3 py-2">Duration</th>
                  <th className="text-left px-3 py-2">Battery</th>
                  <th className="text-left px-3 py-2">Result</th>
                  <th className="text-right px-3 py-2">Logs</th>
                </tr>
              </thead>
              <tbody>
                {droneSessions.map(s => (
                  <tr key={s.id} onClick={() => setSelected(s)}
                    className="border-t border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2 font-mono text-emerald-300 text-xs">{s.droneName}</td>
                    <td className="px-3 py-2 font-mono text-slate-400 text-xs">{s.startTime}</td>
                    <td className="px-3 py-2 font-mono text-slate-400 text-xs">{s.endTime}</td>
                    <td className="px-3 py-2 font-mono text-slate-200 text-xs">{s.duration}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-400">{s.batteryStart}% → {s.batteryEnd}%</td>
                    <td className="px-3 py-2"><span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{s.result}</span></td>
                    <td className="px-3 py-2 text-right"><ChevronRight size={14} className="text-slate-500 inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card className="bg-[#0e1217] border-white/10 overflow-hidden">
        <div className="px-4 py-2 border-b border-white/10 text-[11px] uppercase tracking-widest text-slate-500">Event Log</div>
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-slate-500 sticky top-0">
              <tr><th className="text-left px-3 py-2">Time</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Action</th><th className="text-left px-3 py-2">Detail</th></tr>
            </thead>
            <tbody>
              {m.history.length === 0 ? <tr><td colSpan={4} className="text-center text-slate-600 py-8">No history yet — operate the station to generate events</td></tr> :
                m.history.map(h => (
                  <tr key={h.id} className="border-t border-white/5">
                    <td className="px-3 py-1.5 font-mono text-slate-400 text-xs">{h.time}</td>
                    <td className="px-3 py-1.5"><span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">{h.type}</span></td>
                    <td className="px-3 py-1.5 font-mono text-slate-200">{h.action}</td>
                    <td className="px-3 py-1.5 text-slate-500 text-xs">{h.detail}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Session logs dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="bg-[#0e1217] border-white/10 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plane size={16} className="text-emerald-400" />
              {selected?.droneName}
              <span className="text-xs font-mono text-slate-500 ml-2">Session {selected?.id}</span>
            </DialogTitle>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-400 mt-2">
              <span className="flex items-center gap-1"><Clock size={12} /> {selected?.startTime} → {selected?.endTime}</span>
              <span>Duration: {selected?.duration}</span>
              <span className="flex items-center gap-1"><Battery size={12} /> {selected?.batteryStart}% → {selected?.batteryEnd}%</span>
              <span>Result: <span className="text-emerald-400">{selected?.result}</span></span>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto bg-black/40 rounded border border-white/10 p-2 font-mono text-xs space-y-0.5">
            {(selected?.logs || []).length === 0 ? (
              <div className="text-slate-600 text-center py-6">No logs recorded for this session</div>
            ) : selected?.logs.map(l => (
              <div key={l.id} className="flex gap-2 px-1 py-0.5 hover:bg-white/5 rounded">
                <span className="text-slate-600 shrink-0">{l.time}</span>
                <span className={`shrink-0 w-16 ${LEVEL_COLOR[l.level] || 'text-slate-400'}`}>{l.level}</span>
                <span className="text-slate-600 w-16 shrink-0">{l.source}</span>
                <span className="text-slate-200">{l.message}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}