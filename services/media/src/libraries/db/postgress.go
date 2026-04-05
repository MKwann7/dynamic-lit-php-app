package db

import (
	"database/sql"
	"fmt"
	"log"
)

func PostgresGetWhere(connection Connection, whereClause string, sort string, limit int) ([]map[string]interface{}, error) {
	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", connection.IpAddress, connection.Port, connection.UserName, connection.Password, connection.Database)

	database, databaseError := sql.Open("extensions", psqlInfo)

	if databaseError != nil {
		return nil, databaseError
	}

	defer database.Close()

	rows, queryError := database.Query("SELECT * FROM " + connection.Table + " WHERE " + whereClause)

	if queryError != nil {
		return nil, queryError
	}

	// be careful deferring Queries if you are using transactions
	defer rows.Close()

	var returnCollection []map[string]interface{}

	cols, _ := rows.ColumnTypes()

	pointers := make([]interface{}, len(cols))
	modelInstance := make(map[string]interface{}, len(cols))

	for index, column := range cols {
		var value interface{}

		//log.Println(column.Name(), column.DatabaseTypeName())

		switch column.DatabaseTypeName() {
		case "INT", "INT4", "INT8":
			value = new(sql.NullInt32)
		case "VARCHAR", "STRING", "BPCHAR":
			value = new(sql.NullString)
		case "TIMESTAMP", "DATETIME":
			value = new(sql.NullString)
		case "UUID":
			value = new(sql.NullString)
		default:
			value = new(interface{}) // destination must be a pointer
		}

		modelInstance[column.Name()] = value
		pointers[index] = value
	}

	for rows.Next() {
		err := rows.Scan(pointers...)
		if err != nil {
			log.Println(err)
		}
		returnCollection = append(returnCollection, modelInstance)
	}

	return returnCollection, nil
}
