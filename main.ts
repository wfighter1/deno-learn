// server.ts


interface Msg {
  Act: string; // Action type: "broadcast" or other actions
  Data: string; // The message data
}

class TCPServer {
  addr: string;
  clients: Set<Deno.Conn>;

  constructor(addr: string) {
    this.addr = addr;
    this.clients = new Set();
  }

  async start() {
    const listener = Deno.listen({ port: 8080 });

    console.log(`Server is listening on ${this.addr}`);

    for await (const conn of listener) {
      this.clients.add(conn);
      const clientAddr = `${(conn.remoteAddr as Deno.NetAddr).hostname}:${(conn.remoteAddr as Deno.NetAddr).port}`;

      console.log(`Client connected: ${clientAddr}`);
      this.handleConnection(conn);
    }
  }

  async handleConnection(conn: Deno.Conn) {
    const buffer = new Uint8Array(1024); // Buffer for reading data
    try {
      while (true) {
        const bytesRead = await conn.read(buffer);
        if (bytesRead === null) break;

        const message = new TextDecoder().decode(buffer.subarray(0, bytesRead));
        console.log(`Received message: ${message}`);
        let msg: Msg;
        try {
          msg = JSON.parse(message);
        } catch {
          console.error("Failed to parse message as JSON:", message);
          continue;
        }

        if (msg.Act === "broadcast") {
          this.broadcast(msg.Data, conn);
        }else{
          console.error("Unknown action:", msg.Act);
        } 
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      conn.close();
      this.clients.delete(conn);
      const clientAddr = `${(conn.remoteAddr as Deno.NetAddr).hostname}:${(conn.remoteAddr as Deno.NetAddr).port}`;
      console.log(`Client disconnected: ${clientAddr}`);
    }
  }

  broadcast(message: string, sender: Deno.Conn) {
    console.log(`Broadcasting message: ${message}`);
    for (const client of this.clients) {
      if (client !== sender) {
        const encodedMessage = new TextEncoder().encode(message);
        client.write(encodedMessage).catch((error) => console.error("Broadcast error:", error));
      }
    }
  }
}

const server = new TCPServer("0.0.0.0:8080");
server.start();
