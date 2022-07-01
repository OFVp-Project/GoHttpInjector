import { Socket } from "node:net";
import * as util from "node:util";
import { Client } from "ssh2";

export const createClientAsync = util.promisify(createClient);
export default function createClient(ssh: {socket: Socket, Username: string, Password: string}): Client {
  const sshClient = new Client();
  sshClient.once("banner", banner => console.log(banner));
  sshClient.on("close", () => process.exit(0));
  sshClient.on("end", () => process.exit(0));
  sshClient.connect({
    username: ssh.Username,
    password: ssh.Password,
    sock: ssh.socket
  });
  return sshClient;
}