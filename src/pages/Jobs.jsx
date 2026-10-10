import React, { useState } from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { ChevronRight, X } from 'lucide-react';

const RESULT_COLOR = { SUCCESS: 'text-emerald-400', FAILED: 'text-red-400', ABORTED: 'text-amber-400', 'EMERGENCY STOP': 'text-red-400' };

export default function Jobs() {
  const { state: m } = useMachine();
  const [sel, setSel] = useState(null);
  const jobs = m.jobs.length ? m.jobs : [
    { id: 'J-DEMO1', droneId: 'DRN-001', startTs: Date.now() - 600000, endTs: Date.now(), duration: '10:00', batteryStart: 62, batteryEnd: 100, result: 'SUCCESS', error: '' },
    { id: 'J-DEMO2', droneId: 'DRN-001', startTs: Date.now() - 1200000, endTs: Date.now() - 600000, duration: '10:00', batteryStart: 55, batteryEnd: 98, result: 'SUCCESS', error: '' },
    { id: 'J-DEMO3', droneId: 'DRN-002', startTs: Date.now() - 1800000, endTs: Date.now() - 1200000, duration: '10:00', batteryStart: 40, batteryEnd: 40, result: 'ABORTED', error: 'Operator abort' },
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-white">Jobs / Operation History</h1>
      <Card className="bg-[#0e1217] border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              {['Job ID', 'Drone ID', 'Start', 'End', 'Duration', 'Battery Start', 'Battery End', 'Result', 'Error'].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id} className="border-t border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => setSel(j)}>
                <td className="px-3 py-2 font-mono text-emerald-300">{j.id}</td>
                <td className="px-3 py-2 font-mono">{j.droneId}</td>
                <td className="px-3 py-2 text-slate-400">{new Date(j.startTs).toLocaleTimeString()}</td>
                <td className="px-3 py-2 text-slate-400">{new Date(j.endTs).toLocaleTimeString()}</td>
                <td className="px-3 py-2 font-mono">{j.duration}</td>
                <td className="px-3 py-2 font-mono">{j.batteryStart}%</td>
                <td className="px-3 py-2 font-mono">{j.batteryEnd}%</td>
                <td className={`px-3 py-2 font-bold ${RESULT_COLOR[j.result]}`}>{j.result}</td>
                <td className="px-3 py-2 text-slate-500 text-xs">{j.error || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSel(null)}>
          <Card className="bg-[#0e1217] border-white/10 p-4 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono font-bold text-emerald-300">{sel.id}</span>
              <button onClick={() => setSel(null)}><X size={16} className="text-slate-500" /></button>
            </div>
            <div className="text-xs text-slate-400 mb-2">Cycle timeline:</div>
            <div className="space-y-1">
              {['Drone approach', 'Landing', 'Door close', 'Platform down', 'Glass center', 'Lock', 'Charging start', 'Charging complete', 'Unlock', 'Platform up', 'Door open', 'Takeoff'].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <ChevronRight size={12} className={sel.result === 'SUCCESS' ? 'text-emerald-400' : i < 6 ? 'text-emerald-400' : 'text-slate-600'} />
                  <span className={sel.result === 'SUCCESS' ? 'text-slate-300' : i < 6 ? 'text-slate-300' : 'text-slate-600'}>{s}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}