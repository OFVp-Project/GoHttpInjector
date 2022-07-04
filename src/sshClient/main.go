package mainSsh

import (
	"net"
	"golang.org/x/crypto/ssh"
)

func ConnectClient(Username string, Password string, sshHost string, Tunel net.Conn) (*ssh.Client, error) {
	sshClient := &ssh.ClientConfig{
		User: Username,
		Auth: []ssh.AuthMethod {
			ssh.Password(Password),
		},
	}
	c, chans, reqs, err := ssh.NewClientConn(Tunel, sshHost, sshClient)
	if err != nil {
		return nil, err
	}
	return ssh.NewClient(c, chans, reqs), nil
}