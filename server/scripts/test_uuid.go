package main

import (
	"fmt"
	"github.com/google/uuid"
)

func main() {
	id := "motionmesh-production-196936049283"
	_, err := uuid.Parse(id)
	if err == nil {
		fmt.Println("PARSED SUCCESSFULLY?!")
	} else {
		fmt.Println("FAILED TO PARSE:", err)
	}
}
