package webProxy

import (
	"io"
	"log"
	"net"

	"github.com/Sirherobrine23/GoHttpInjector/src/parsePayload"
)

func Server(Port string, toConnect string) (net.Conn, error) {
	server, err := net.Listen("tcp", Port);
	if err != nil {
		return nil, err
	}
	for {
		conn, err := server.Accept()
		if err != nil {
			log.Println("Cannot coonect")
		}
		go (func(){
			payloadBuf := make([]byte, 128)
			conn.Read(payloadBuf)
			log.Println(parsePayload.Parse(string(payloadBuf)))
			log.Println(string(payloadBuf))
			connProxy, err := net.Dial("tcp", toConnect)
			connProxy.Write([]byte("GET / HTTP/1.0\r\nHost: ssh.sirherobrine23.org\r\n\r\n"))
			if err != nil {log.Println(err)}
			for {
				go (func(){
					_, err := io.Copy(connProxy, conn)
					if err != nil {log.Println(err)}
				})()
				_, err := io.Copy(conn, connProxy)
				if err != nil {log.Println(err)}
			}
		})()
	}
}

func WebProxy(toConnect string, src net.Conn) {
	dial, err := net.Dial("tcp", toConnect)
	if err != nil {
		log.Fatalf("Cannot connect to %s", toConnect)
	}
	defer dial.Close()
	for {
		go (func() {
			_, err := io.Copy(dial, src)
			if err != nil {
				log.Printf("Error on copy dial")
			}
		})()
		_, err := io.Copy(src, dial)
		if err != nil {
			log.Printf("Error on copy src")
		}
	}
}