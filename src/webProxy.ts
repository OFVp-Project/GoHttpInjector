import * as net from "node:net";
import * as payloadUtil from "./lib/parsePayload";
export function startProxy(connect: {payload: string, host: string, port: number}, fn: (err?: Error, socket?: net.Socket) => void): void {
  const socket = net.createConnection({host: connect.host, port: connect.port});
  socket.once("error", err => fn(err, null));
  socket.once("ready", async () => {
    socket.write(payloadUtil.convertPayload(connect.payload));
    const data = await new Promise<string>(resolve => socket.once("data", data => resolve(data.toString("utf8"))));
    console.log(data);
    const payload = payloadUtil.parsePayload(data);
    if (payload?.code >= 300 && payload?.code <= 399) return fn(new Error("300 Status, catch"), null);
    console.log(payload);
    return fn(null, socket);
  })
}

// const serverProxy = net.createServer(connection => {
//   const [host, port] = process.env.CONNECT.split(":");
//   const payload = process.env.payload;
//   startProxy({host, port: parseInt(port), payload: payload}, (socket) => {
//     connection.on("error", err => console.log(err));
//     socket.on("error", err => console.log(err));
//     connection.pipe(socket);
//     socket.pipe(connection);
//     connection.on("close", () => socket.end());
//     socket.on("close", () => connection.end());
//     socket.on("close", () => serverProxy.close());
//     if (process.env.SHOW_DATA === "true") {
//       connection.on("data", data => console.log(data.toString("utf8")));
//       socket.on("data", data => console.log(data.toString("utf8")));
//     }
//   });
// }).listen(8022, () => console.log("Listen on 8022"));