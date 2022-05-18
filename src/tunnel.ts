import { createServer } from "net";

class handler {}

export class CreateTunnel {
  private portListen = 8989;
  constructor(portListen: number) {
    this.portListen = portListen;
  }
  private listen() {
    const socketListen = createServer(this.portListen, "0.0.0.0", () => console.log("Listening on %s", this.portListen));
    socketListen.on("connection", socket => {
      console.log("Connection from %s", socket.remoteAddress);
      socket.destroy();
      return new handler();
    });
  }
}
