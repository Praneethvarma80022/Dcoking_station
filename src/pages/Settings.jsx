import React, { useState } from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Save } from 'lucide-react';

const SECTIONS = ['GENERAL', 'NETWORK', 'HARDWARE', 'SAFETY', 'DRONE', 'CHARGING', 'LOGGING'];

export default function Settings() {
  const { state: m, updateSettings } = useMachine();
  const [s, setS] = useState({ ...m.settings, ip: m.station.ip, port: m.station.port });
  const [section, setSection] = useState('GENERAL');

  const set = (k, v) => setS(p => ({ ...p, [k]: v }));
  const save = () => updateSettings(s);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white flex items-center gap-2"><SettingsIcon size={18} />Settings</h1>
        <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={save}><Save size={14} className="mr-2" />Save</Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {SECTIONS.map(sec => (
          <button key={sec} onClick={() => setSection(sec)} className={`px-3 py-1.5 text-xs rounded border ${section === sec ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'border-white/10 text-slate-400'}`}>{sec}</button>
        ))}
      </div>

      <Card className="bg-[#0e1217] border-white/10 p-4 max-w-2xl space-y-3">
        {section === 'GENERAL' && <>
          <Input label="Station Name" value={s.stationName} onChange={v => set('stationName', v)} />
          <Select label="Units" value={s.units} options={['metric', 'imperial']} onChange={v => set('units', v)} />
          <Select label="Language" value={s.language} options={['en', 'es', 'fr', 'de']} onChange={v => set('language', v)} />
          <Select label="Theme" value={s.theme} options={['dark', 'light']} onChange={v => set('theme', v)} />
        </>}
        {section === 'NETWORK' && <>
          <Input label="IP Address" value={s.ip} onChange={v => set('ip', v)} />
          <Input label="Port" value={String(s.port)} onChange={v => set('port', +v)} />
          <Input label="Connection Timeout (s)" value={String(s.doorTimeout)} onChange={v => set('doorTimeout', +v)} />
          <div className="text-xs text-slate-500">WebSocket status: <span className="text-emerald-400">{m.connected ? 'ACTIVE' : 'INACTIVE'}</span></div>
        </>}
        {section === 'HARDWARE' && <>
          <Select label="Controller Type" value={s.controllerType} options={['MockAdapter', 'KlipperAdapter', 'PLCAdapter', 'CustomMCUAdapter']} onChange={v => set('controllerType', v)} />
          <Input label="Max Platform Speed (%)" value={String(s.maxPlatformSpeed)} onChange={v => set('maxPlatformSpeed', +v)} />
        </>}
        {section === 'SAFETY' && <>
          <Input label="Door Timeout (s)" value={String(s.doorTimeout)} onChange={v => set('doorTimeout', +v)} />
          <Input label="Lock Timeout (s)" value={String(s.lockTimeout)} onChange={v => set('lockTimeout', +v)} />
          <Input label="Max Temperature (°C)" value={String(s.maxTemp)} onChange={v => set('maxTemp', +v)} />
        </>}
        {section === 'DRONE' && <>
          <Input label="Drone Identifier" value="DRN-001" onChange={() => {}} />
          <Input label="Docking Tolerance (%)" value="2" onChange={() => {}} />
        </>}
        {section === 'CHARGING' && <>
          <Input label="Target Battery (%)" value={String(s.targetBattery)} onChange={v => set('targetBattery', +v)} />
          <Input label="Max Charging Current (A)" value={String(s.maxChargeCurrent)} onChange={v => set('maxChargeCurrent', +v)} />
          <Input label="Charging Timeout (min)" value={String(s.chargeTimeout)} onChange={v => set('chargeTimeout', +v)} />
        </>}
        {section === 'LOGGING' && <>
          <Select label="Log Level" value={s.logLevel} options={['DEBUG', 'INFO', 'WARNING', 'ERROR']} onChange={v => set('logLevel', v)} />
          <Input label="Retention (days)" value="30" onChange={() => {}} />
        </>}
      </Card>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return <div><label className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0b0e12] border border-white/10 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500" /></div>;
}
function Select({ label, value, options, onChange }) {
  return <div><label className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">{label}</label><select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-[#0b0e12] border border-white/10 rounded px-3 py-2 text-sm text-slate-200 outline-none">{options.map(o => <option key={o}>{o}</option>)}</select></div>;
}