import { Peer, DataConnection } from 'peerjs';

export type WebRTCEvents = {
  onConnect: () => void;
  onDisconnect: () => void;
  onReceiveTabs: (tabs: string[]) => void;
  onReceiveFile: (fileData: ArrayBuffer | Blob, fileName: string, fileType: string) => void;
  onSyncRequest: () => void;
  onSyncState: (state: any) => void;
};

export class WebRTCManager {
  private peer: Peer | null = null;
  public conn: DataConnection | null = null;
  private isInitiator: boolean;
  private events: WebRTCEvents;
  private sessionId: string;

  private pendingFileMetadata: { name: string, type: string, size: number } | null = null;

  constructor(isInitiator: boolean, sessionId: string, events: WebRTCEvents) {
    this.isInitiator = isInitiator;
    this.events = events;
    this.sessionId = sessionId;
  }

  public connect() {
    this.destroy();

    const prefix = 'dropspace-app-v1-';
    
    if (this.isInitiator) {
      // Desktop wait for connection
      this.peer = new Peer(`${prefix}${this.sessionId}`);
      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });
    } else {
      // Mobile connects to Desktop
      this.peer = new Peer();
      this.peer.on('open', () => {
        const conn = this.peer!.connect(`${prefix}${this.sessionId}`, {
          reliable: true
        });
        this.setupConnection(conn);
      });
    }
    
    this.peer.on('error', (err) => {
      console.error('PeerJS Error:', err);
    });
  }

  private setupConnection(conn: DataConnection) {
    this.conn = conn;

    conn.on('open', () => {
      this.events.onConnect();
    });

    conn.on('close', () => {
      this.events.onDisconnect();
    });

    conn.on('data', async (data: any) => {
      // Handle combined metadata+file Blob/ArrayBuffer
      if (data instanceof Blob || data instanceof ArrayBuffer || data instanceof Uint8Array) {
         try {
           const buffer = data instanceof Blob ? await data.arrayBuffer() : data instanceof Uint8Array ? data.buffer : data;
           const container = new Uint8Array(buffer as ArrayBuffer);
           
           // We expect the first 4 bytes to be the metadata length (Little Endian)
           const view = new DataView(buffer as ArrayBuffer);
           const metadataLength = view.getUint32(0, true);
           
           // Saftey check to see if we actually have our expected metadata
           if (metadataLength > 0 && metadataLength < 10000 && container.byteLength > 4 + metadataLength) {
             const metadataBytes = new Uint8Array(buffer as ArrayBuffer, 4, metadataLength);
             const metadataStr = new TextDecoder().decode(metadataBytes);
             const metadata = JSON.parse(metadataStr);
             
             // The rest is the actual file
             const fileBuffer = (buffer as ArrayBuffer).slice(4 + metadataLength);
             this.events.onReceiveFile(fileBuffer, metadata.name, metadata.type);
             return;
           }
         } catch (e) {
           console.error('Failed to parse file metadata header', e);
         }
         
         // Fallback if no valid metadata header
         let buf = data instanceof Uint8Array ? data.buffer : data;
         this.events.onReceiveFile(buf as ArrayBuffer, 'file', 'application/octet-stream');
         return;
      }

      // JSON Data
      try {
        let payload = data;
        if (typeof data === 'string') {
          payload = JSON.parse(data);
        }

        switch (payload.type) {
          case 'tabs':
            this.events.onReceiveTabs(payload.tabs);
            break;
          case 'sync-request':
            this.events.onSyncRequest();
            break;
          case 'sync-state':
            this.events.onSyncState(payload.state);
            break;
        }
      } catch (e) {
        console.error('Failed to parse PeerJS message', e, data);
      }
    });
  }

  public destroy() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  public sendTabs(tabs: string[]) {
    this.sendJson({ type: 'tabs', tabs });
  }

  public requestSync() {
    this.sendJson({ type: 'sync-request' });
  }

  public syncState(state: any) {
    this.sendJson({ type: 'sync-state', state });
  }

  public async sendFile(file: File) {
    if (!this.conn) {
      throw new Error("Peer not connected");
    }
    
    if (!this.conn.open) {
      // Wait for it to possibly open
      for(let i=0; i<10; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (this.conn.open) break;
      }
      if (!this.conn.open) {
        throw new Error("Peer connection is not open");
      }
    }
    
    // Combine metadata and file into a single Blob
    const metadata = JSON.stringify({
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    const metadataBytes = new TextEncoder().encode(metadata);
    const header = new ArrayBuffer(4);
    new DataView(header).setUint32(0, metadataBytes.length, true);
    
    const combinedBlob = new Blob([header, metadataBytes, file]);

    // Send the combined Blob
    this.conn.send(combinedBlob);
  }

  private sendJson(payload: any) {
    if (!this.conn || !this.conn.open) throw new Error("Peer not connected");
    this.conn.send(payload);
  }
}
