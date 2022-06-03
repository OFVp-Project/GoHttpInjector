import child_process from "child_process";
import * as os from "os";
import { Client } from "ssh2";
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
    const sshClient = child_process.spawnSync("sshpass", ["-p", this.config.config.ssh.auth.password, "ssh",
      `${this.config.config.ssh.auth.username}@${this.config.config.ssh.host}`,
      "-o", "ProxyCommand="+nc_proxies_mode,
      "-p", String(this.config.config.ssh.port),
      "-v", dynamicPortForwarding,
      "-o", "StrictHostKeyChecking=no",
      "-o", "UserKnownHostsFile=/dev/null"
    ]);
    for (const std of [sshClient.stdout.toString(), sshClient.stderr.toString()]) {
      for (const line of std.split(/(\r)?\n/gi)) {
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
}

export class sshConnect {
  public targetHost: string = "localhost"
  public targetPort: number = 22;
  public sshUsername: string = (os.userInfo()).username;
  public sshPrivateKey?: string;
  public sshPassword?: string;
  public connect() {
    const ssh = new Client();
    ssh.on("error", error => {
      for (const line of String(error).split(/\r?\n/gi)) {
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
      console.log(String(error));
    });
    ssh.connect({
      host: this.targetHost,
      port: this.targetPort,
      username: this.sshUsername,
      compress: "force",
      privateKey: this.sshPrivateKey,
      password: this.sshPassword
    });
    return ssh;
  }
}