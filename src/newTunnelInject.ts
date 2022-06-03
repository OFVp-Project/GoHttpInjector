import * as net from "net"

function parsePayload(payload: string, host: string, port: number) {
  const ParsedPayload = payload.replace(/\[crlf\]/gi, "\r\n")
  .replace(/\[cr\]/gi, "\r")
  .replace(/\[lf\]/gi, "\n")
  .replace(/\[protocol\]/gi, "HTTP/1.0")
  .replace(/\[ua\]/gi, `nodejs/${process.version}`)
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

class connectionHandler {
  public payload: string = "CONNECT google.com:443 HTTP/1.0\r\n\r\n";
  public targetPost: number = 80;
  public targetHost: string = "";
  public targerSocket?: net.Socket;
  public connectTarget(): Promise<net.Socket> {
    const clientTarget = net.createConnection({port: this.targetPost, host: this.targetHost});
    return new Promise<net.Socket>((resolve, reject) => {
      clientTarget.on("error", reject);
      clientTarget.on("end", reject);
      clientTarget.on("connect", async () => {
        if (["[split]", "[delay_split]", "[instant_split]"].some(x => this.payload.includes(x))) {
          this.payload = this.payload.replace(/\[split\]/gi, '||1.0||').replace(/\[delay_split\]/gi, "||1.5||").replace(/\[instant_split\]/gi, "||0.0||");
          console.log("[*] Payload:\n%s", this.payload);
          for (const payl of this.payload.split("||")) {
            if (["1.0", "1.5", "0.0"].includes(payl)) {
              clientTarget.write(payl);
              console.log("Payload %s", payl);
              await new Promise((resolve) => setTimeout(resolve, payl === "1.0"?1000:payl === "1.5"?1500:0));
            } else {
              console.log("Payload %s", payl);
              clientTarget.write(payl);
            }
          }
        } else if (this.payload.includes("[repeat_split]")) {
          this.payload = this.payload.replace(/\[repeat_split\]/gi, "||1||").replace(/\[x-split\]/gi, "||1||");
          const payl = [];
          for (const element of this.payload.split("||")) {
            if (!!element && element !== "1") payl.push(element);
          }
          let rpspli = payl[0]+payl[0];
          clientTarget.write(rpspli);
          clientTarget.write(payl[1]);
        } else if (["[reverse_split]", "[x-split]"].some(x => this.payload.includes(x))) {
          this.payload = this.payload.replace(/\[reverse_split\]/gi, "||2|").replace(/\[x-split\]/gi, "||2|");
          const payl = [];
          for (const element of this.payload.split("||")) {
            if (!!element && element !== "2") payl.push(element);
          }
          clientTarget.write(payl[0]+payl[1])
          clientTarget.write(payl[1])
        } else if (this.payload.includes("[split-x]")) {
          this.payload = this.payload.replace(/\[split-x\]/gi, "||3||");
          let xsplit = [];
          for (const element of this.payload.split("||")) {
            if (!!element && element !== "3") xsplit.push(element);
          }
          clientTarget.write(xsplit[0]+xsplit[1]);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          clientTarget.write(xsplit[1]);
        } else clientTarget.write(this.payload);
        return resolve(clientTarget);
      });
    });
  }
}

export function createConnection(portListen: number = 9092) {
  const socketListen = net.createServer();
  return new Promise<number>((resolve, reject) => {
    socketListen.listen(portListen, "0.0.0.0", () => {
      console.log("Listening on %s", portListen);
      resolve(portListen);
    });
    socketListen.on("close", reject);
    socketListen.on("error", reject);
    socketListen.on("connection", (socket) => {
      console.log("[*] New Connection fro %s", socket.remoteAddress+":"+socket.remotePort);
      socket.on("ready", async () => {
        const client = new connectionHandler();
        client.payload = parsePayload("GET / HTTP/1.0[crlf]Host: google.com[crlf]User-Agent: nodejs/[ua][crlf][crlf]", "google.com", 80);
        client.targetHost = "google.com";
        client.targetPost = 80;
        const clientTarget = await client.connectTarget();
        clientTarget.pipe(socket);
        socket.pipe(clientTarget);
        return;
      });
    });
  });
}