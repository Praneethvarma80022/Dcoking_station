import React, { useState } from 'react';
import { useMachine } from '@/services/machineStore';
import StationScene from '@/components/StationScene';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Check } from 'lucide-react';

const CALIBRATIONS = [
  { id: 'doorOpen', label: 'Door Open Position', value: 100, unit: '%' },
  { id: 'doorClose', label: 'Door Close Position', value: 0, unit: '%' },
  { id: 'platformTop', label: 'Platform Top', value: 100, unit: '%' },
  { id: 'platformBottom', label: 'Platform Bottom', value: 0, unit: '%' },
  { id: 'glassFrontHome', label: 'Glass Front Home', value: 0, unit: '%' },
  { id: 'glassFrontCenter', label: 'Glass Front Center', value: 100, unit: '%' },
  { id: 'glassRearHome', label: 'Glass Rear Home', value: 0, unit: '%' },
  { id: 'glassRearCenter', label: 'Glass Rear Center', value: 100, unit: '%' },
  { id: 'glassLeftHome', label: 'Glass Left Home', value: 0, unit: '%' },
  { id: 'glassLeftCenter', label: 'Glass Left Center', value: 100, unit: '%' },
  { id: 'glassRightHome', label: 'Glass Right Home', value: 0, unit: '%' },
  { id: 'glassRightCenter', label: 'Glass Right Center', value: 100, unit: '%' },
  { id: 'lockPosition', label: 'Lock Position', value: 100, unit: '%' },
  { id: 'chargePosition', label: 'Charging Position', value: 0, unit: '%' },
];

export default function Calibration() {
  const { state: m, log, addHistory } = useMachine();
  const [confirmed, setConfirmed] = useState(false);
  const [vals, setVals] = useState(Object.fromEntries(CALIBRATIONS.map(c => [c.id, c.value])));
  const [saved, setSaved] = useState({});

  const applyOne = (c) => {
    setSaved(s => ({ ...s, [c.id]: true }));
    log('INFO', `CALIBRATION: ${c.label} confirmed at ${vals[c.id]}${c.unit}`, 'CALIBRATION');
    addHistory('CALIBRATION', c.label, `${vals[c.id]}${c.unit}`);
  };

  const saveAll = () => {
    log('SYSTEM', `Calibration saved — ${CALIBRATIONS.length} values committed`, 'CALIBRATION');
    addHistory('CALIBRATION', 'SAVE_ALL', `${CALIBRATIONS.length} values`);
    setSaved(Object.fromEntries(CALIBRATIONS.map(c => [c.id, true])));
  };

  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
      <Card className="bg-[#0e1217] border-white/10 p-3 relative overflow-hidden min-h-[360px]">
        <StationScene preset="FRONT" showInternal />
        <div className="absolute top-3 left-3 text-[10px] font-mono text-slate-400 bg-black/50 px-2 py-1 rounded">LIVE CALIBRATION VIEW</div>
      </Card>

      <Card className="bg-[#0e1217] border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-amber-400" />
          <h1 className="text-lg font-semibold text-white">Machine Calibration</h1>
        </div>
        {!confirmed ? (
          <div className="space-y-3">
            <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-3">
              Calibration moves the machine. Ensure the station is clear of personnel and the drone is removed before proceeding.
            </div>
            <Button className="bg-amber-600 hover:bg-amber-500 w-full" onClick={() => setConfirmed(true)}>
              <ShieldAlert size={14} className="mr-2" />Acknowledge & Enable Calibration
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {CALIBRATIONS.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 flex-1">{c.label}</span>
                <input type="number" value={vals[c.id]} onChange={e => setVals({ ...vals, [c.id]: +e.target.value })}
                  className="w-20 bg-[#0b0e12] border border-white/10 rounded px-2 py-1 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500" />
                <span className="text-xs text-slate-600 w-4">{c.unit}</span>
                <Button size="sm" variant="outline" className={`h-7 border-white/20 ${saved[c.id] ? 'border-emerald-500/50' : ''}`} onClick={() => applyOne(c)}><Check size={12} className={saved[c.id] ? 'text-emerald-400' : ''} /></Button>
              </div>
            ))}
            <Button className="bg-emerald-600 hover:bg-emerald-500 w-full mt-2" onClick={saveAll}>Save Calibration</Button>
          </div>
        )}
      </Card>
    </div>
  );
}