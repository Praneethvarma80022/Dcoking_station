import React from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { Activity } from 'lucide-react';

export default function Sensors() {
  const { state: m } = useMachine();
  const s = m.sensors;
  const sensors = [
    ['Door Open Limit', s.doorOpenLimit], ['Door Closed Limit', s.doorClosedLimit],
    ['Platform Top Limit', s.platformTopLimit], ['Platform Bottom Limit', s.platformBottomLimit],
    ['Glass Front Home', s.glassFrontHome], ['Glass Front Center', s.glassFrontCenter],
    ['Glass Rear Home', s.glassRearHome], ['Glass Rear Center', s.glassRearCenter],
    ['Glass Left Home', s.glassLeftHome], ['Glass Left Center', s.glassLeftCenter],
    ['Glass Right Home', s.glassRightHome], ['Glass Right Center', s.glassRightCenter],
    ['Drone Presence', s.dronePresence], ['Docking Alignment', s.dockingAlignment], ['Charging Contact', s.chargingContact],
    ['Emergency Stop', s.emergencyStop], ['Motor Overload', s.motorOverload],
    ['Temperature', s.temperature, '°C'], ['Battery Connection', s.batteryConnection],
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold text-white">Sensor Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {sensors.map(([name, val, unit]) => {
          const active = !!val;
          const isAlarm = name === 'Emergency Stop' || name === 'Motor Overload';
          const goodState = isAlarm ? !active : active;
          return (
            <Card key={name} className="bg-[#0e1217] border-white/10 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">{name}</span>
                <Activity size={13} className={goodState ? 'text-emerald-400' : 'text-red-400'} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${goodState ? 'bg-emerald-400' : 'bg-red-500'} ${active && !isAlarm ? 'shadow-[0_0_8px] shadow-emerald-400/60' : ''}`} />
                <span className={`font-mono font-bold text-sm ${goodState ? 'text-emerald-400' : 'text-red-400'}`}>
                  {unit ? `${val}${unit}` : active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="text-[10px] text-slate-600 mt-1 font-mono">Fault: OK</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}