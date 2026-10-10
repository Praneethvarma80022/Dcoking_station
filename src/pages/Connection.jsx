import React, { useState } from 'react';
import { useMachine } from '@/services/machineStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Plug, Trash2, Edit, Plus, Activity } from 'lucide-react';

export default function Connection() {
  const { state: m, connect, disconnect, testConnection, saveStation, deleteStation, connectHm30, disconnectHm30, listHm30Ports, testHm30, connectDock, disconnectDock } = useMachine();
  const [ip, setIp] = useState(m.station.ip);
  const [port, setPort] = useState(m.station.port);
  const [timeout, setTimeoutVal] = useState(5);
  const [protocol, setProtocol] = useState('HTTP');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [editing, setEditing] = useState(null);
  const [hm30Transport, setHm30Transport] = useState('SERIAL');
  const [hm30Ip, setHm30Ip] = useState('');
  const [hm30Port, setHm30Port] = useState('');
  const [hm30Protocol, setHm30Protocol] = useState('UDP');
  const [localBindPort, setLocalBindPort] = useState('');
  const [hm30ComPort, setHm30ComPort] = useState('');
  const [hm30BaudRate, setHm30BaudRate] = useState('');
  const [dockComPort, setDockComPort] = useState('');
  const [dockBaudRate, setDockBaudRate] = useState('');

  const doTest = async () => {
    setTesting(true); setTestResult(null);
    const r = await testConnection(ip, port);
    setTestResult(r); setTesting(false);
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl">
      <h1 className="text-lg font-semibold text-white">Station Connection</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#0e1217] border-white/10 p-4 space-y-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Connection Parameters</div>
          <Field label="Station IP Address"><input value={ip} onChange={e => setIp(e.target.value)} className="input" placeholder="10.168.7.52" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Port"><input type="number" value={port} onChange={e => setPort(+e.target.value)} className="input" /></Field>
            <Field label="Protocol">
              <select value={protocol} onChange={e => setProtocol(e.target.value)} className="input">
                <option>HTTP</option><option>HTTPS</option><option>WS</option><option>WSS</option>
              </select>
            </Field>
          </div>
          <Field label="Connection Timeout (s)"><input type="number" value={timeout} onChange={e => setTimeoutVal(+e.target.value)} className="input" /></Field>
          <div className="flex gap-2 pt-1">
            {!m.connected ? (
              <Button className="bg-emerald-600 hover:bg-emerald-500 flex-1" disabled={m.connecting} onClick={() => connect(ip, port)}>
                <Plug size={14} className="mr-2" />{m.connecting ? 'CONNECTING…' : 'CONNECT'}
              </Button>
            ) : (
              <Button variant="outline" className="border-red-500/40 text-red-300 hover:bg-red-500/10 flex-1" onClick={disconnect}>
                <WifiOff size={14} className="mr-2" />DISCONNECT
              </Button>
            )}
            <Button variant="outline" className="border-white/20" disabled={testing} onClick={doTest}>
              <Activity size={14} className="mr-2" />{testing ? 'TESTING…' : 'TEST'}
            </Button>
          </div>
          {testResult && (
            <div className="text-xs px-3 py-2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Test successful — latency {testResult.latency}ms
            </div>
          )}
        </Card>

        <Card className="bg-[#0e1217] border-white/10 p-4">
          <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Live Connection Status</div>
          <div className="space-y-2 text-sm">
            <Row label="Status" value={m.connected ? 'CONNECTED' : m.connecting ? 'CONNECTING' : 'DISCONNECTED'} ok={m.connected} />
            <Row label="Station IP" value={`${m.station.ip}:${m.station.port}`} />
            <Row label="Controller" value={m.station.controllerStatus} ok={m.station.controllerStatus === 'ONLINE'} />
            <Row label="Wi-Fi" value={m.station.wifiStatus} ok={m.station.wifiStatus === 'CONNECTED'} />
            <Row label="Last Heartbeat" value={m.station.lastHeartbeat || '—'} />
            <Row label="Latency" value={`${m.station.latency} ms`} ok={m.station.latency < 200} />
            <Row label="Mode" value={m.mockMode ? 'SIMULATION (Mock Hardware)' : 'HARDWARE'} />
          </div>
        </Card>
      </div>

      <Card className="bg-[#0e1217] border-emerald-500/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500">HM30 MAVLink 2 Telemetry</div>
            <div className="text-xs text-slate-500 mt-1">Read-only telemetry. Flight commands are disabled.</div>
          </div>
          <div className="text-xs font-mono text-emerald-300">{m.hm30?.status || 'SIMULATOR'}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Connection Type"><select value={hm30Transport} onChange={e => setHm30Transport(e.target.value)} className="input"><option>SERIAL</option><option>UDP</option><option>TCP</option></select></Field>
          {hm30Transport === 'SERIAL' ? (
            <>
              <Field label="COM Port"><select value={hm30ComPort} onChange={e => setHm30ComPort(e.target.value)} className="input"><option value="">Select detected port</option>{m.hm30Ports.map(port => <option key={port.path} value={port.path}>{port.path}{port.manufacturer ? ` — ${port.manufacturer}` : ''}</option>)}</select></Field>
              <Field label="Baud Rate"><input type="number" value={hm30BaudRate} onChange={e => setHm30BaudRate(e.target.value)} className="input" placeholder="Required" /></Field>
              <div className="flex items-end"><Button variant="outline" className="border-white/20 w-full" onClick={listHm30Ports}>↻ REFRESH PORTS</Button></div>
            </>
          ) : (
            <>
              <Field label="HM30 IP"><input value={hm30Ip} onChange={e => setHm30Ip(e.target.value)} className="input" placeholder="Required" /></Field>
              <Field label="MAVLink Port"><input type="number" value={hm30Port} onChange={e => setHm30Port(e.target.value)} className="input" placeholder="Required" /></Field>
              <Field label="Local Bind Port"><input type="number" value={localBindPort} onChange={e => setLocalBindPort(e.target.value)} className="input" placeholder="Required for UDP" /></Field>
            </>
          )}
        </div>
        {hm30Transport !== 'SERIAL' && <div className="text-xs text-slate-500">Network protocol: <select value={hm30Protocol} onChange={e => setHm30Protocol(e.target.value)} className="input inline-block w-auto ml-1"><option>UDP</option><option>TCP</option></select></div>}
        <div className="flex gap-2">
          <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => connectHm30(hm30Transport === 'SERIAL' ? { transport: 'SERIAL', comPort: hm30ComPort, baudRate: Number(hm30BaudRate) } : { transport: hm30Transport, ip: hm30Ip, port: Number(hm30Port), protocol: hm30Protocol, localBindPort: Number(localBindPort) })}>CONNECT HM30</Button>
          <Button variant="outline" className="border-white/20" onClick={disconnectHm30}>DISCONNECT HM30</Button>
          <Button variant="outline" className="border-amber-500/30 text-amber-300" onClick={() => testHm30({ transport: 'SERIAL', comPort: hm30ComPort, baudRate: Number(hm30BaudRate) })}>TEST HM30</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
          <Row label="Transport" value={m.hm30?.config?.transport || 'SIMULATOR'} />
          <Row label="COM Port" value={m.hm30?.config?.comPort || '—'} />
          <Row label="Baud Rate" value={m.hm30?.config?.baudRate || '—'} />
          <Row label="Link" value={m.hm30?.linkQuality || '—'} ok={m.hm30?.connected} />
          <Row label="Heartbeat" value={m.hm30?.heartbeat ? 'RECEIVED' : 'NOT RECEIVED'} ok={m.hm30?.heartbeat} />
          <Row label="Last packet" value={m.hm30?.lastPacketAt || '—'} />
          <Row label="System ID" value={m.hm30?.systemId ?? '—'} />
          <Row label="Component ID" value={m.hm30?.componentId ?? '—'} />
        </div>
        {m.hm30?.error && <div className="text-xs px-3 py-2 rounded border border-red-500/30 bg-red-500/10 text-red-300">{m.hm30.error}</div>}
        {m.hm30Test && <div className={`text-xs px-3 py-2 rounded border ${m.hm30Test.passed ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-red-300 border-red-500/30 bg-red-500/10'}`}>{m.hm30Test.passed ? 'HM30 TEST PASSED' : `HM30 TEST FAILED: ${m.hm30Test.error}`}</div>}
      </Card>

      <Card className="bg-[#0e1217] border-cyan-500/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Dock Controller USB / Serial</div>
            <div className="text-xs text-slate-500 mt-1">Independent connection. Read-only until the dock protocol is provided.</div>
          </div>
          <div className="text-xs font-mono text-cyan-300">{m.dock?.status || 'DISCONNECTED'}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Dock COM Port"><select value={dockComPort} onChange={e => setDockComPort(e.target.value)} className="input"><option value="">Select detected port</option>{m.hm30Ports.map(port => <option key={port.path} value={port.path}>{port.path}{port.friendlyName ? ` — ${port.friendlyName}` : ''}</option>)}</select></Field>
          <Field label="Dock Baud Rate"><input type="number" value={dockBaudRate} onChange={e => setDockBaudRate(e.target.value)} className="input" placeholder="Required" /></Field>
          <div className="flex items-end gap-2"><Button className="bg-cyan-700 hover:bg-cyan-600" onClick={() => connectDock({ comPort: dockComPort, baudRate: Number(dockBaudRate) })}>CONNECT DOCK</Button><Button variant="outline" className="border-white/20" onClick={disconnectDock}>DISCONNECT</Button></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
          <Row label="Port" value={m.dock?.comPort || '—'} />
          <Row label="Baud" value={m.dock?.baudRate || '—'} />
          <Row label="Last packet" value={m.dock?.lastPacketAt || '—'} />
          <Row label="Bytes" value={m.dock?.bytesReceived ?? 0} ok={m.dock?.connected} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
          <Row label="System" value={m.dock?.system || '—'} />
          <Row label="Sissor" value={formatSwitches(m.dock?.sissor)} />
          <Row label="Door 1" value={formatSwitches(m.dock?.doors?.DOOR1)} />
          <Row label="Door 2" value={formatSwitches(m.dock?.doors?.DOOR2)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
          {['ROD1', 'ROD2', 'ROD3', 'ROD4'].map(rod => <Row key={rod} label={rod} value={formatRod(m.dock?.rods?.[rod])} />)}
        </div>
        {m.dock?.error && <div className="text-xs px-3 py-2 rounded border border-red-500/30 bg-red-500/10 text-red-300">{m.dock.error}</div>}
      </Card>

      <Card className="bg-[#0e1217] border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Saved Stations</div>
          <Button size="sm" variant="outline" className="border-white/20 h-7" onClick={() => setEditing({ name: '', ip: '', port: 80 })}>
            <Plus size={12} className="mr-1" />Add Station
          </Button>
        </div>
        {editing && (
          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-white/5 rounded">
            <input placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="input flex-1 min-w-[120px]" />
            <input placeholder="IP" value={editing.ip} onChange={e => setEditing({ ...editing, ip: e.target.value })} className="input w-40" />
            <input type="number" placeholder="Port" value={editing.port} onChange={e => setEditing({ ...editing, port: +e.target.value })} className="input w-24" />
            <Button size="sm" className="h-8 bg-emerald-600" onClick={() => { saveStation(editing); setEditing(null); }}>Save</Button>
            <Button size="sm" variant="outline" className="h-8 border-white/20" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        )}
        <div className="space-y-1.5">
          {m.savedStations.map(s => (
            <div key={s.id} className="flex items-center gap-3 bg-white/5 rounded px-3 py-2">
              <Wifi size={15} className="text-emerald-400" />
              <div className="flex-1">
                <div className="text-sm text-white">{s.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{s.ip}:{s.port}</div>
              </div>
              <Button size="sm" variant="outline" className="h-7 border-white/20" onClick={() => { setIp(s.ip); setPort(s.port); connect(s.ip, s.port); }}>Connect</Button>
              <button className="p-1.5 text-slate-500 hover:text-amber-400" onClick={() => setEditing(s)}><Edit size={13} /></button>
              <button className="p-1.5 text-slate-500 hover:text-red-400" onClick={() => deleteStation(s.id)}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </Card>

      <style>{`.input{background:#0b0e12;border:1px solid hsl(217 18% 20%);border-radius:6px;padding:8px 10px;font-size:13px;color:#e2e8f0;width:100%;outline:none}.input:focus{border-color:hsl(152 60% 42%)}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">{label}</label>{children}</div>;
}
function Row({ label, value, ok }) {
  const color = ok === undefined ? 'text-slate-200' : ok ? 'text-emerald-400' : 'text-red-400';
  return <div className="flex justify-between bg-white/5 rounded px-3 py-2"><span className="text-slate-500">{label}</span><span className={`font-mono font-bold ${color}`}>{value}</span></div>;
}
function formatSwitches(value) {
  return value ? `OPEN=${value.open ?? '—'} CLOSE=${value.close ?? '—'}` : '—';
}
function formatRod(value) {
  return value ? `CENTER=${value.center ?? '—'} BACK=${value.back ?? '—'}` : '—';
}