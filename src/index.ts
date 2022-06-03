#!/usr/bin/env node
import * as tunelling from "./newTunnelInject";
import * as sshTunel from "./ssh";

tunelling.createConnection(9092).then(() => {
  console.log("Connected to port 9092, connecting to ssh");
  const ssh = new sshTunel.sshConnect();
  ssh.targetHost = "localhost";
  ssh.targetPort = 22;
  ssh.sshUsername = "node";
  ssh.sshPassword = "12345678";
  ssh.connect().on("ready", () => console.log("Connected to ssh")).on("error", (err: Error) => console.log(err)).on("error", () => process.exit(1));
});