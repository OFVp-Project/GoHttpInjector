import fs from "fs";
import path from "path";

export type baseConfig = {
  connectionType: "websocket"|"ssh_direct"|"http_proxy_payload"|"ssl"|"ssl_payload",
  config: {
    payload: string,
    customUA?: string,
    proxy: {
      port?: number,
      host?: string
    },
    ssh: {
      host: string,
      port: number,
      auth: {username: string} & {
        type: "password",
        password: string
      }
    },
    sni?: {
      host?: string
    }
  }
};

export function config(): baseConfig {
  const configPath = path.join(process.cwd(), "userConfig.json");
  if (!fs.existsSync(configPath)) {
    const tempConfig: baseConfig = {
      connectionType: "http_proxy_payload",
      config: {
        payload: "CONNECT [host_port] [protocol][crlf][crlf]",
        customUA: "",
        ssh: {
          host: "<You ssh host is here>",
          port: 22,
          auth: {
            type: "password",
            username: "<Your ssh username is here>",
            password: "<Your ssh password is here>"
          }
        },
        proxy: {},
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(tempConfig, null, 2));
    throw new Error("No config file found, created one for you");
  }

  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}