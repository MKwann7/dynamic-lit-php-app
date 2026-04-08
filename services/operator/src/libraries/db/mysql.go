package db

import (
	"database/sql"
	_ "github.com/go-sql-driver/mysql"
	"log"
	"strconv"
)

// MysqlGetWhere executes SELECT * FROM <table> WHERE <whereClause>.
// TEXT/MEDIUMTEXT/LONGTEXT/BLOB columns are explicitly scanned as *sql.NullString
// so that CastAsNullableString works on every column, including key_value (TEXT).
func MysqlGetWhere(connection Connection, whereClause string, sort string, limit int) ([]map[string]interface{}, error) {

	database, databaseError := sql.Open("mysql",
		connection.UserName+":"+connection.Password+
			"@tcp("+connection.IpAddress+":"+connection.Port+")/"+connection.Database)
	if databaseError != nil {
		return nil, databaseError
	}
	defer database.Close()

	sqlQuery := "SELECT * FROM " + connection.Table + " WHERE " + whereClause
	if sort != "" {
		sqlQuery += " ORDER BY " + connection.PrimaryKey + " " + sort
	}
	if limit > 0 {
		sqlQuery += " LIMIT " + strconv.Itoa(limit)
	}

	rows, queryError := database.Query(sqlQuery)
	if queryError != nil {
		return nil, queryError
	}
	defer rows.Close()

	var returnCollection []map[string]interface{}
	cols, _ := rows.ColumnTypes()

	for rows.Next() {
		pointers := make([]interface{}, len(cols))
		rowInstance := make(map[string]interface{}, len(cols))

		for index, column := range cols {
			var value interface{}
			switch column.DatabaseTypeName() {
			case "INT":
				value = new(sql.NullInt32)
			case "TEXT", "MEDIUMTEXT", "LONGTEXT", "BLOB":
				value = new(sql.NullString)
			case "VARCHAR", "STRING":
				value = new(sql.NullString)
			case "TIMESTAMP", "DATETIME":
				value = new(sql.NullString)
			case "BINARY":
				value = new([]byte)
			default:
				value = new(interface{})
			}
			rowInstance[column.Name()] = value
			pointers[index] = value
		}

		if err := rows.Scan(pointers...); err != nil {
			log.Println(err)
		}
		returnCollection = append(returnCollection, rowInstance)
	}

	return returnCollection, nil
}
