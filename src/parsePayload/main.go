package parsePayload

import (
	"log"
	"strings"
	"regexp"
)

type PyloadHeader struct {
	Name string
	Value string
}

func Parse(payload string) ([]PyloadHeader) {
	HeaderReg, _ := regexp.Compile("([0-9A-Za-z_-]+)\\:((.*)|(.*[\\:]+.*)|)")
	payload = strings.ReplaceAll(payload, "[crlf]", "\r\n")
	payload = strings.ReplaceAll(payload, "\r", "")
	log.Println(payload)
	var count []PyloadHeader
	for _, line := range strings.Split(payload, "\n") {
		Header := HeaderReg.FindStringSubmatch(line)
		if len(Header) > 1 {
			Reg := PyloadHeader{
				Name: Header[1],
				Value: Header[2],
			}
			count = append(count, Reg)
		}
	}
	log.Println(count)
	return count
}