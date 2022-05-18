export function parsePayload(payloadRaw: string) {
  return payloadRaw.replace(/\[crlf\]/gi, "\r\n")
  .replace(/\[crlf\*2\]/gi, "\r\n\r\n")
  .replace(/\[cr\]/gi, "\r")
  .replace(/\[lf\]/gi, "\n")
  .replace("[protocol]", "Nodejs/"+process.version);
}
