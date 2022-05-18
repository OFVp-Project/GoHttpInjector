import child_process from "child_process";
import { config } from "./Config";

export class sshRun {
  private inject = {
    hots: "localhost",
    port: 9092
  };
  private config = config()
  constructor (injectPort: number, injectHots: string) {
    this.inject.port = injectPort;
    this.inject.hots = injectHots;
  }
  async sshClient(socks5Port: number, host: string, port: number) {
    const dynamicPortForwarding = `-CND ${socks5Port}`;
    const nc_proxies_mode = (this.config.connectionType === "websocket"||this.config.connectionType === "http_proxy_payload"||this.config.connectionType === "ssh_direct") ? `nc -X CONNECT -x ${this.inject.hots}:${this.inject.port} %h %p`:`corkscrew ${this.inject.hots} ${this.inject.port} %h %p`;

    // Start ssh client
    const sshClient = child_process.spawnSync("sshpass", ["-p", this.config.config.ssh.auth.password, "ssh", "-o", "ProxyCommand="+nc_proxies_mode, `${this.config.config.ssh.auth.username}@${this.config.config.ssh.host}`, "-p", String(this.config.config.ssh.port), "-v", dynamicPortForwarding, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null"]);
    for (const line of sshClient.stdout.toString().split("\n")) {
      if (line.includes("compat_banner: no match:")) console.log(`handshake starts\nserver :${line.split(":")[2]}`)
      else if (line.includes("Server host key")) console.log(line);
      else if (line.includes("kex: algorithm:")) console.log(line);
      else if (line.includes("kex: host key algorithm:")) console.log(line);
      else if (line.includes("kex: server->client cipher:")) console.log(line);
      else if (line.includes("Next authentication method: password")) console.log("Authenticate to password");
      else if (line.includes("Authentication succeeded (password).")) console.log("Authentication Comleted");
      else if (line.includes("pledge: proc")) {
        console.log("CONNECTED SUCCESSFULLY ");
        // os.system("cat logs.txt")
      } else if (line.includes("Permission denied")) console.log("username or password are inncorect ");
      else if (line.includes("Connection closed")) console.log("Connection closed " );
      else if (line.includes("Could not request local forwarding")) console.log("Port used by another programs ");
      else if (line.includes("client_loop: send disconnect: Broken pipe")) {
        console.log("Connection closed ");
        return;
      }
    }
  }
}