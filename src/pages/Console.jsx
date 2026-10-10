import React, { useState, useMemo } from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Download, Search } from 'lucide-react';

const LEVELS = ['ALL', 'INFO', 'WARNING', 'ERROR', 'COMMAND', 'SYSTEM'];
const COLORS = { INFO: 'text-slate-300', WARNING: 'text-amber-400', ERROR: 'text-red-400', COMMAND: 'text-blue-400', SYSTEM: 'text-purple-400' };

export default function Console() {
  const { state: m, clearConsole } = useMachine();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const logs = useMemo(() => {
    return m.console.filter(l => (filter === 'ALL' || l.level === filter) && (!search || l.message.toLowerCase().includes(search.toLowerCase())));
  }, [m.console, filter, search]);

  const download = () => {
    const text = m.console.map(l => `[${l.time}] ${l.level} ${l.source} ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `console-${Date.now()}.log`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-white">Console</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="bg-[#0b0e12] border border-white/10 rounded pl-7 pr-2 py-1.5 text-xs w-40 text-slate-200 outline-none focus:border-emerald-500" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-[#0b0e12] border border-white/10 rounded px-2 py-1.5 text-xs text-slate-200 outline-none">
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
          <Button size="sm" variant="outline" className="h-8 border-white/20" onClick={download}><Download size={13} className="mr-1" />Export</Button>
          <Button size="sm" variant="outline" className="h-8 border-red-500/40 text-red-300" onClick={clearConsole}><Trash2 size={13} className="mr-1" />Clear</Button>
        </div>
      </div>
      <Card className="bg-[#0b0e12] border-white/10 p-3 flex-1 overflow-y-auto font-mono text-[12px]">
        {logs.length === 0 ? <div className="text-slate-600 text-center py-8">No log entries</div> : logs.map(l => (
          <div key={l.id} className="flex gap-2 py-0.5 border-b border-white/5">
            <span className="text-slate-600 shrink-0">{l.time}</span>
            <span className={`shrink-0 w-20 font-bold ${COLORS[l.level]}`}>{l.level}</span>
            <span className="text-slate-500 shrink-0 w-16">{l.source}</span>
            <span className="text-slate-200">{l.message}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}