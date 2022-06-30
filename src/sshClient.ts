import { Socket } from "node:net";
import * as util from "node:util";
import { Client } from "ssh2";

export const createClientAsync = util.promisify(createClient);
export default function createClient(ssh: {host?: string, port?: number, socket?: Socket, Username: string, Password: string}, fn: (err?: Error, ssh?: Client) => void): void {
  let closed = false;
  const sshClient = new Client();
  sshClient.once("banner", banner => console.log(banner));
  sshClient.once("ready", () => {
    if (closed) return;
    closed = true;
    return fn(null, sshClient);
  });
  sshClient.on("close", () => process.exit(0));
  sshClient.on("end", () => process.exit(0));
  sshClient.on("error", err => {
    if (closed) return;
    closed = true;
    return fn(err, null);
  });
  if (!!ssh.socket) {
    sshClient.connect({
      username: ssh.Username,
      password: ssh.Password,
      sock: ssh.socket
    });
    return;
  }
  sshClient.connect({
    username: ssh.Username,
    password: ssh.Password,
    host: ssh.host,
    port: ssh.port,
  });
  return;
}