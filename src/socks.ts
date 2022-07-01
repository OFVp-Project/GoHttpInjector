import socks from "socksv5";
import { Client } from "ssh2";

export function ServerStream(fn: Client) {
  return new Promise<void>((_res, rej) => {
    socks.createServer(function(info, accept, deny) {
      console.log(info)
      fn.forwardOut(info.srcAddr, info.srcPort, info.dstAddr, info.dstPort, (err, stream) => {
        if (err) {return deny();}
        const clientSocket = accept(true);
        if (clientSocket) {
          stream.pipe(clientSocket).on('error', rej);
          clientSocket.pipe(stream).on('error', rej);
        }
      });
    }).useAuth(socks.auth.None()).listen(1080, '127.0.0.1', function() {
      console.log('SOCKS server listening on port 1080');
    });
  });
}