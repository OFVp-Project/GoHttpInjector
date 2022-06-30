import * as fs from "node:fs/promises";
import * as fsOld from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
export type configObject = {
  sshUsername: string,
  sshPassword: string,
  sshHost?: string,
  sshPort?: number,
  payload: string,
  proxyHost: string,
  proxyPort: number
};

export const homeConfig = path.resolve(process.env.OFVP_CONFIG||os.homedir(), ".ofvpConfig.json");
export async function getConfig(): Promise<configObject> {
  if (!fsOld.existsSync(homeConfig)) throw new Error("Config file not exists");
  return fs.readFile(homeConfig, "utf8").then(res => JSON.parse(res));
}

export async function writeConfig(config: configObject) {
  if (!(config.payload||config.proxyHost||config.proxyPort||config.sshHost||config.sshPort)) throw new Error("Invalid object config");
  return fs.writeFile(homeConfig, JSON.stringify(config, null, 2)).then(() => homeConfig);
}