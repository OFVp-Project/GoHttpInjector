import net, { createServer } from "net";
import { config } from "./Config";

/**
 * Wait for connections make write and read
 *
 * @param r - All sockets to wait readable
 * @param w - All sockets to wait writable
 */
async function selectWait(r: Array<net.Socket>, w: Array<net.Socket>) {
  await Promise.all([
    Promise.all(r.map(async (s) => {
      return new Promise((resolve) => {
        process.nextTick(async () => {
          while (true) {
            if (s.readable) return resolve("");
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
        });
      });
    })),
    Promise.all(w.map((s) => {
      process.nextTick(async () => {
        new Promise(async (resolve) => {
          while (true) {
            if (s.writable) return resolve("");
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
        });
      });
    }))
  ]);
}

class connectionHandler {
  public closed = false;
  public target?: net.Socket = undefined;
  private client?: net.Socket = undefined;
  public clientIpre = "";
  private config = config();
  private logLevel = "NONE";
  constructor (client: net.Socket) {
    this.client = client
    this.clientIpre = `${this.client.remoteAddress}:${this.client.remotePort}`;

    // Connection log
    if (this.logLevel !== "NONE") console.log("%s wsSSH (Client): Connected", this.clientIpre);
    this.client.once("close", () => {if (this.logLevel !== "NONE") console.log("%s wsSSH (Client): disconnected", this.clientIpre)});
    this.client.once("error", err => {
      if (!this.closed) {
        if (this.logLevel !== "NONE") console.log("%s wsSSH (Client): error: %s", this.clientIpre, err.message);
        return
      }
      this.closed = true;
    });
  }

  /** Close connection */
  public async closeClient(msg?: string, code?: number) {
    if (this.target !== undefined) {
      if (!this.target.destroyed) {
        if (code) {
          this.target.end(`HTTP/1.1 ${code} ${msg||"Bad Response"}\r\n\r\n`)
        } else this.target.end(msg?msg:undefined);
        this.target.destroy();
      }
    }
    if (!this.client.destroyed) {
      if (code) {
        this.client.end(`HTTP/1.1 ${code} ${msg||"Bad Response"}\r\n\r\n`)
      } else this.client.end(msg?msg:undefined);
      this.client.destroy();
    }
    return;
  }

  /** Set target (SSH) connection */
  private connect_target() {
    this.target = net.createConnection({port: this.config.config.proxy.port, host: this.config.config.proxy.host});
    this.closed = false;
    this.target.once("error", (err) => {
      if (this.logLevel !== "NONE") console.log("%s wsSSH (SSH): Error connecting to %s:%d: %s", this.clientIpre, this.config.config.proxy.host, this.config.config.proxy.port, err.message);
      this.closeClient();
    });
    this.target.once("close", () => {
      if (this.logLevel !== "NONE") console.log("%s wsSSH (SSH): Disconnected from %s:%d", this.clientIpre, this.config.config.proxy.host, this.config.config.proxy.port);
      this.closeClient();
    });
    return new Promise((resolve, reject) => {
      this.target.once("error", reject);
      this.target.once("connect", async () => {
        await selectWait([this.client], [this.target]);
        if (this.logLevel !== "NONE") console.log("%s wsSSH (SSH): Payload %s", this.clientIpre, this.config.config.payload);
        // Payload
        var payload = `CONNECT ${this.config.config.proxy.host}:${this.config.config.proxy.port} HTTP/1.0\r\n\r\n`;
        if (this.config.connectionType === "websocket"||this.config.connectionType === "http_proxy_payload") payload = this.parsePayload();
        console.log("%s wsSSH (SSH): Payload:\n**************\n%s\n**************\n", this.clientIpre, payload);
        if (["[split]", "[delay_split]", "[instant_split]"].some(x => payload.includes(x))) {
          payload = payload.replace(/\[split\]/gi, '||1.0||').replace(/\[delay_split\]/gi, "||1.5||").replace(/\[instant_split\]/gi, "||0.0||");
          for (const payl of payload.split("||")) {
            if (["1.0", "1.5", "0.0"].includes(payl)) {
              this.target.write(payl);
              if (this.logLevel !== "NONE") console.log("%s wsSSH (SSH): Payload %s", this.clientIpre, payl);
              await new Promise((resolve) => setTimeout(resolve, payl === "1.0"?1000:payl === "1.5"?1500:0));
            } else {
              if (this.logLevel !== "NONE") console.log("%s wsSSH (SSH): Payload %s", this.clientIpre, payl);
              this.target.write(payl);
            }
          }
        } else if (payload.includes("[repeat_split]")) {
          payload = payload.replace(/\[repeat_split\]/gi, "||1||").replace(/\[x-split\]/gi, "||1||");
          const payl = [];
          for (const element of payload.split("||")) {
            if (!!element && element !== "1") payl.push(element);
          }
          let rpspli = payl[0]+payl[0];
          this.target.write(rpspli);
          this.target.write(payl[1]);
        } else if (["[reverse_split]", "[x-split]"].some(x => payload.includes(x))) {
          payload = payload.replace(/\[reverse_split\]/gi, "||2|").replace(/\[x-split\]/gi, "||2|");
          const payl = [];
          for (const element of payload.split("||")) {
            if (!!element && element !== "2") payl.push(element);
          }
          this.target.write(payl[0]+payl[1])
          this.target.write(payl[1])
        } else if (payload.includes("[split-x]")) {
          payload = payload.replace(/\[split-x\]/gi, "||3||");
          let xsplit = [];
          for (const element of payload.split("||")) {
            if (!!element && element !== "3") xsplit.push(element);
          }
          this.target.write(xsplit[0]+xsplit[1]);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          this.target.write(xsplit[1]);
        } else this.target.write(payload);
        return resolve(this.ClientConnectAndTransmit());
      });
    });
  }

  /**
   * After the client and target are connected, this function will transmit data between them
   */
  private async ClientConnectAndTransmit() {
    this.target.on("data", data => {
      if (this.closed) return;
      this.client.write(data);
    });

    // if (this.config.connectionType === "websocket") {
    //   const testUpgrade = await new Promise<string>((resolve) => this.client.once("data", (data) => resolve(data.toString())));
    //   if (!/HTTP\/.*\s+101/gi.test(testUpgrade)) {
    //     this.closeClient("Bad Response", 400);
    //     return;
    //   }
    // }

    let blockWebsocket = this.config.connectionType === "websocket";
    this.client.on("data", data => {
      if (this.closed) return;
      if (blockWebsocket) {
        blockWebsocket = false;
        console.log("%s wsSSH (SSH): Websocket upgrade detected:\n%s", this.clientIpre, data.toString());
        return;
      }
      this.target.write(data);
    });

    await new Promise((resolve) => {
      this.client.once("close", resolve);
      this.target.once("close", resolve);
    });
    this.closeClient("Timeout", 400);
  }

  private parsePayload() {
    const { host, port } = this.config.config.ssh, { customUA } = this.config.config;
    const ParsedPayload = this.config.config.payload.replace(/\[crlf\]/gi, "\r\n")
    .replace(/\[crlf\*2\]/gi, "\r\n\r\n")
    .replace(/\[cr\]/gi, "\r")
    .replace(/\[lf\]/gi, "\n")
    .replace(/\[protocol\]/gi, "HTTP/1.0")
    .replace(/\[ua\]/gi, customUA||`nodejs/${process.version}`)
    .replace(/\[raw\]/gi, "CONNECT "+host+":"+port+" HTTP/1.0\r\n\r\n")
    .replace(/\[real_raw\]/gi, "CONNECT "+host+":"+port+" HTTP/1.0\r\n\r\n")
    .replace(/\[netData\]/gi, "CONNECT "+host+":"+port +" HTTP/1.0")
    .replace(/\[realData\]/gi, "CONNECT "+host+":"+port+" HTTP/1.0")
    .replace(/\[split_delay\]/gi, "[delay_split]")
    .replace(/\[split_instant\]/gi, "[instant_split]")
    .replace(/\[method\]/gi, "CONNECT")
    .replace(/mip/gi, "127.0.0.1")
    .replace(/\[ssh\]/gi, host+":"+port)
    .replace(/\[lfcr\]/gi, "\n\r")
    .replace(/\[host_port\]/gi, host+":"+port)
    .replace(/\[host\]/gi, host)
    .replace(/\[port\]/gi, String(port))
    .replace(/\[auth\]/gi, "");

    // Send Payload
    return ParsedPayload;
  }

  public async main() {
    const data = await new Promise<string>(resolve => {
      this.client.once("data", (data) => {
        resolve(data.toString());
      });
    });
    console.log(data);
    return this.connect_target();
  }
}

class CreateTunnel {
  private portListen = 9092;
  constructor(portListen: number) {
    this.portListen = portListen;
    this.listen();
  }
  private listen() {
    const socketListen = createServer();
    socketListen.listen(this.portListen, "0.0.0.0", () => console.log("Listening on %s", this.portListen));
    socketListen.on("connection", socket => {
      console.log("Connection from %s", socket.remoteAddress);
      const handler = new connectionHandler(socket);
      handler.main();
    });
  }
}

new CreateTunnel(9092)