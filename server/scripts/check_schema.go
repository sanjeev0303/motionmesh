package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://Motionmesh_db_admin:0a260103b2fb5b2bbba38b7b30529f9a4a5ff2381d573ad84fb8500da1363f87_@motionmesh-prod-aurora.cluster-c1m606w6210b.ap-south-1.rds.amazonaws.com:5432/motionmesh"
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	rows, err := pool.Query(context.Background(), `
		SELECT column_name, data_type 
		FROM information_schema.columns 
		WHERE table_name = 'videos';
	`)
	if err != nil {
		log.Fatalf("Query failed: %v\n", err)
	}
	defer rows.Close()

	fmt.Println("Columns in 'videos' table:")
	for rows.Next() {
		var colName, dataType string
		err := rows.Scan(&colName, &dataType)
		if err != nil {
			log.Fatalf("Scan failed: %v\n", err)
		}
		fmt.Printf("%s: %s\n", colName, dataType)
	}
}
