#!/usr/bin/env node
import yargs from "yargs";
import sshClient from "./sshClient";
import { startProxy } from "./webProxy";
import { ServerStream } from "./socks";
import * as config from "./lib/configStorage";

async function createConnection(method: "webProxy") {
  const { payload, proxyHost, proxyPort, sshUsername, sshPassword } = await config.getConfig();
  if (method === "webProxy") {
    return new Promise<void>((_res, rej) => {
      console.log("Connection to %s:%f", proxyHost, proxyPort);
      startProxy({payload, host: proxyHost, port: proxyPort}, (err, fn) => {
        if(err) return console.log(err)
        console.log("Success to connect in Web Proxy")
        const ssh = sshClient({Username: sshUsername, Password: sshPassword, socket: fn});
        ssh.on("ready", () => {
          console.log("Success in SSH Connection!");
          ServerStream(ssh).then(_res).catch(rej);
        });
      });
    });
  }
  throw new Error("Invalid Connection");
}

const Yargs = yargs(process.argv.slice(2)).help().version(false).alias("h", "help").wrap(yargs.terminalWidth()).command("config", "Create or Update config", yargs => {
  const options = yargs.option("payload", {
    alias: "a",
    description: "Payload to proxy",
    default: "GET / HTTP/1.0[crlf][crlf]Host: [host][crlf][crlf]"
  }).option("proxy", {
    alias: "p",
    description: "Proxy Host with port",
    default: "ssh.sirherobrine23.org:80"
  }).option("username", {
    alias: "U",
    description: "SSH Username",
    type: "string"
  }).option("password", {
    alias: "P",
    description: "SSH Password",
    type: "string"
  }).parseSync();
  const [proxyHost, proxyPort] = options.proxy.split(":");
  return config.writeConfig({
    payload: options.payload,
    proxyHost,
    proxyPort: parseInt(proxyPort),
    sshUsername: options.username,
    sshPassword: options.password
  });
}).command("webProxy", "Start with Web Proxy tunnel", () => createConnection("webProxy"))
Yargs.command({command: "*", handler: () => {Yargs.showHelp();}}).parseAsync().then(() => process.exit(0));