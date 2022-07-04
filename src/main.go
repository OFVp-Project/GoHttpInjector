package main

import "github.com/Sirherobrine23/GoHttpInjector/src/webProxy"

func main() {
	webProxy.Server(":8080", "ssh.sirherobrine23.org:80")
}