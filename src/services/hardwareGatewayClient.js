export class HardwareGatewayClient {
  constructor({ onMessage, onStatus } = {}) {
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.socket = null;
    this.url = import.meta.env.VITE_HARDWARE_WS_URL || `ws://${window.location.hostname}:8080/hardware`;
  }

  connect() {
    if (this.socket && this.socket.readyState <= 1) return;
    this.onStatus?.('CONNECTING');
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('open', () => {
      this.onStatus?.('CONNECTED');
      this.send({ type: 'get_hm30_status' });
    });
    this.socket.addEventListener('message', event => {
      try {
        this.onMessage?.(JSON.parse(event.data));
      } catch {
        this.onStatus?.('ERROR');
      }
    });
    this.socket.addEventListener('error', () => this.onStatus?.('ERROR'));
    this.socket.addEventListener('close', () => this.onStatus?.('DISCONNECTED'));
  }

  send(message) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  connectHm30(config) {
    this.send({ type: 'hm30_connect', config });
  }

  disconnectHm30() {
    this.send({ type: 'hm30_disconnect' });
  }

  listSerialPorts() {
    this.send({ type: 'list_serial_ports' });
  }

  testHm30(config) {
    this.send({ type: 'test_hm30', config });
  }

  connectDock(config) {
    this.send({ type: 'dock_connect', config });
  }

  disconnectDock() {
    this.send({ type: 'dock_disconnect' });
  }

  close() {
    this.socket?.close();
    this.socket = null;
  }
}