export function convertPayload(payload: string): string {
  return payload
  .replace(/\[crlf(\*[0-9]+)?\]/gi, (_, rep?: string) => {let r = "[crlf]"; let repet = parseInt((rep||"").replace("*", "").trim())||0; while (repet > 1) {repet--;r+="[crlf]";} return r;})
  .replace(/\[crlf\]/gi, "\r\n")
  .replace(/\[cr\]/gi, "\r")
  .replace(/\[lf\]/gi, "\n")
  .replace(/\[protocol\]/gi, "HTTP/1.0")
  .replace(/\[ua\]/gi, `nodejs/${process.version}`)
  .replace(/\[split_delay\]/gi, "[delay_split]")
  .replace(/\[split_instant\]/gi, "[instant_split]")
  .replace(/\[method\]/gi, "CONNECT")
  .replace(/mip/gi, "127.0.0.1")
  .replace(/\[lfcr\]/gi, "\n\r")
  .replace(/\[auth\]/gi, "");
}

export type payloadObject = {
  second?: payloadObject,
  headers?: {[key: string]: string}
  method?: string,
  path?: string,
  version?: string,
  code?: string,
  message?: string
};

export function parsePayload(payloadRecived: string|Buffer): payloadObject {
  const payload: payloadObject = {};
  let payloadString = Buffer.from(payloadRecived).toString("utf8").trim();
  let req = "";
  const fistLine = payloadString.split(/\r?\n/)[0];
  const requestReg = [/(^[A-Z]+)\s+(.*)\s+HTTP\/(.*)\r?\n?/, /HTTP\/([0-9\.]+)\s+([0-9]+)\s+(.*)\r?\n?/];
  if (requestReg[0].test(fistLine)||requestReg[1].test(fistLine)) {
    if (requestReg[0].test(fistLine)) {
      const [method, path, version] = fistLine.match(requestReg[0]).slice(1);
      payload.version = version.trim();
      payload.method = method.trim();
      payload.path = path.trim();
    } else if (requestReg[1].test(fistLine)) {
      const [version, code, message] = fistLine.match(requestReg[1]).slice(1);
      payload.version = version.trim();
      payload.code = code.trim();
      payload.message = message.trim();
    }
    payloadString = payloadString.replace(/\r?\n/, "").replace(fistLine, "");
    req = fistLine;
  }
  if (!req) return payload;
  const headerReg = /([0-9A-Za-z\._-\s@]+)\:((.*)|(.*[\:]+.*)|[\:\{\}\'\"]*|)/;
  const lines = payloadString.split(/\r?\n/g);
  for (const lineN in lines) {
    const line = lines[lineN];
    if (requestReg.some(x => x.test(line))) {
      console.log(lines.slice(parseInt(lineN), lines.length-1).join("\r\n"))
      payload.second = parsePayload(lines.slice(parseInt(lineN), lines.length-1).join("\r\n"));
      break
    }
    const m = line.match(headerReg);
    if (!m) console.log("Drop Line: ", line);
    else {
      payloadString = payloadString.replace(line, "").replace(/^\r?\n?/, "");
      if (!payload.headers) payload.headers = {};
      payload.headers[m[1].trim()] = m[2].trim();
    }
  }
  return payload;
}