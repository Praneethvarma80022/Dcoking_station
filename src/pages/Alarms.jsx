import React from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle } from 'lucide-react';

const SEV = { CRITICAL: 'red', WARNING: 'amber', INFO: 'blue' };

export default function Alarms() {
  const { state: m, ackAlarm } = useMachine();
  const alarms = m.alarms;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-white">Alarms</h1>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Active" value={alarms.filter(a => a.state === 'ACTIVE').length} color="text-red-400" />
        <Stat label="Acknowledged" value={alarms.filter(a => a.state === 'ACKNOWLEDGED').length} color="text-amber-400" />
        <Stat label="Resolved" value={alarms.filter(a => a.state === 'RESOLVED').length} color="text-emerald-400" />
      </div>

      <Card className="bg-[#0e1217] border-white/10 overflow-hidden">
        {alarms.length === 0 ? <div className="text-center text-slate-600 py-8 flex items-center justify-center gap-2"><CheckCircle size={16} className="text-emerald-400" />No alarms — system nominal</div> :
          <div className="divide-y divide-white/5">
            {alarms.map(a => {
              const c = SEV[a.severity];
              return (
                <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${a.state === 'ACTIVE' && a.severity === 'CRITICAL' ? 'bg-red-500/5' : ''}`}>
                  <Bell size={16} className={c === 'red' ? 'text-red-400' : c === 'amber' ? 'text-amber-400' : 'text-blue-400'} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">{a.code}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c === 'red' ? 'bg-red-500/20 text-red-300' : c === 'amber' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>{a.severity}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{a.state}</span>
                    </div>
                    <div className="text-xs text-slate-400">{a.message}</div>
                    <div className="text-[10px] text-slate-600 font-mono">Raised {a.raisedAt}</div>
                  </div>
                  {a.state === 'ACTIVE' && <Button size="sm" variant="outline" className="h-7 border-white/20" onClick={() => ackAlarm(a.code)}>Acknowledge</Button>}
                </div>
              );
            })}
          </div>
        }
      </Card>
    </div>
  );
}

function Stat({ label, value, color }) {
  return <Card className="bg-[#0e1217] border-white/10 p-3"><div className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</div><div className={`text-2xl font-bold ${color}`}>{value}</div></Card>;
}