import React, { useState } from 'react';
import { useMachine } from '@/services/machineStore';
import StationScene from '@/components/StationScene';
import { Card } from '@/components/ui/card';

const TREE = [
  { name: 'Docking Station', children: [
    { name: 'Outer Cabinet' }, { name: 'Landing Platform' },
    { name: 'Cross Lift', children: [{ name: 'Left Arm' }, { name: 'Right Arm' }, { name: 'Lead Screw' }, { name: 'Motor' }] },
    { name: 'Glass Centering', children: [{ name: 'X Rail' }, { name: 'Carriage' }, { name: 'Motor' }] },
    { name: 'Door' }, { name: 'Locking System' }, { name: 'Charging System' }, { name: 'Drone' },
  ]},
];

function TreeNode({ node, depth = 0, selected, onSelect }) {
  return (
    <div>
      <button onClick={() => onSelect(node.name)} className={`flex items-center gap-1 w-full text-left px-2 py-1 rounded text-xs ${selected === node.name ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:bg-white/5'}`} style={{ paddingLeft: depth * 12 + 8 }}>
        <span className="w-1 h-1 rounded-full bg-slate-600" />
        {node.name}
      </button>
      {node.children?.map(c => <TreeNode key={c.name} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} />)}
    </div>
  );
}

export default function Station3D() {
  const { state: m } = useMachine();
  const [preset, setPreset] = useState('3D');
  const [showInternal, setShowInternal] = useState(true);
  const [selected, setSelected] = useState(null);

  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-3 h-full">
      <Card className="bg-[#0e1217] border-white/10 p-3 lg:col-span-3 relative overflow-hidden min-h-[400px]">
        <StationScene preset={preset} showInternal={showInternal} />
        <button onClick={() => setShowInternal(v => !v)} className="absolute top-3 right-3 px-2 py-1 text-[10px] font-mono rounded border bg-black/40 border-white/10 text-slate-400">{showInternal ? 'HIDE' : 'SHOW'} INTERNAL</button>
      </Card>

      <div className="space-y-3">
        <Card className="bg-[#0e1217] border-white/10 p-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Component Tree</div>
          {TREE.map(n => <TreeNode key={n.name} node={n} selected={selected} onSelect={setSelected} />)}
        </Card>
        <Card className="bg-[#0e1217] border-white/10 p-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Selected: {selected || '—'}</div>
          <div className="text-xs text-slate-400">Inspect component state from the live machine model. Camera supports orbit, pan and zoom via mouse.</div>
        </Card>
      </div>
    </div>
  );
}