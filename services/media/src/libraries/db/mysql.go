package db

import (
	"database/sql"
	"fmt"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/helper"
	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"log"
	"reflect"
	"strconv"
	"strings"
)

func MysqlGetWhere(connection Connection, whereClause string, sort string, limit int) ([]map[string]interface{}, error) {

	database, databaseError := sql.Open("mysql", connection.UserName+":"+connection.Password+"@tcp("+connection.IpAddress+":"+connection.Port+")/"+connection.Database)

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
		// Create fresh pointers and map for every row so rows don't share the same memory.
		pointers := make([]interface{}, len(cols))
		rowInstance := make(map[string]interface{}, len(cols))

		for index, column := range cols {
			var value interface{}

			switch column.DatabaseTypeName() {
			case "INT":
				value = new(sql.NullInt32)
			case "VARCHAR", "STRING":
				value = new(sql.NullString)
			case "TIMESTAMP", "DATETIME":
				value = new(sql.NullString)
			case "UUID":
				value = new(sql.NullString)
			case "BINARY":
				// BINARY(16) columns (e.g. sys_row_id) come back as []byte.
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

func MysqlCreateNew(connection Connection, model []SqlExecModel) ([]map[string]interface{}, error) {

	database, databaseError := sql.Open("mysql", connection.UserName+":"+connection.Password+"@tcp("+connection.IpAddress+":"+connection.Port+")/"+connection.Database)

	if databaseError != nil {
		return nil, databaseError
	}

	defer database.Close()

	fieldsForInsertion := buildFieldsFromModel(model)
	valuesForInsertion := buildValuesFromModel(model)

	sqlQuery := "INSERT INTO " + connection.Table + " (" + fieldsForInsertion + ") VALUES (" + valuesForInsertion + ")"
	result, execError := database.Exec(sqlQuery)

	if execError != nil {
		return nil, execError
	}

	newestId, _ := result.LastInsertId()
	newRecordQuery := connection.PrimaryKey + " = " + fmt.Sprint(newestId)

	entityCollection, error := MysqlGetWhere(connection, newRecordQuery, "ASC", 1)

	if error != nil {
		return nil, error
	}

	return entityCollection, nil
}

func buildFieldsFromModel(model []SqlExecModel) string {
	var modelFields []string

	for _, currFieldModel := range model {
		if currFieldModel.Field == "sys_row_id" {
			// Include sys_row_id only when the caller explicitly provided a non-zero UUID.
			// When absent/zero the DB trigger auto-generates it.
			if currFieldModel.Value.Type().String() == "uuid.UUID" &&
				currFieldModel.Value.Interface().(uuid.UUID) != uuid.Nil {
				modelFields = append(modelFields, currFieldModel.Field)
			}
			continue
		}
		if currFieldModel.Value.IsZero() {
			continue
		}
		modelFields = append(modelFields, currFieldModel.Field)
	}

	return strings.Join(modelFields, ",")
}

func buildValuesFromModel(model []SqlExecModel) string {
	var modelFields []string

	for _, currFieldModel := range model {
		if currFieldModel.Field == "sys_row_id" {
			// sys_row_id is BINARY(16) — must use UUID_TO_BIN() when explicitly provided.
			if currFieldModel.Value.Type().String() == "uuid.UUID" &&
				currFieldModel.Value.Interface().(uuid.UUID) != uuid.Nil {
				uuidStr := currFieldModel.Value.Interface().(uuid.UUID).String()
				modelFields = append(modelFields, "UUID_TO_BIN('"+uuidStr+"')")
			}
			continue
		}
		if currFieldModel.Value.IsZero() {
			continue
		}
		var currType string

		switch currFieldModel.Type {
		case reflect.String:
			currType = "\"" + fmt.Sprint(currFieldModel.Value) + "\""
			break
		case reflect.Int, reflect.Int32, reflect.Int64:
			currType = fmt.Sprint(currFieldModel.Value)
			break
		case reflect.Bool:
			if currFieldModel.Value.Bool() == true {
				currType = "true"
			} else {
				currType = "false"
			}
			break
		case reflect.Struct:
			switch currFieldModel.Value.Type().String() {
			case "helper.NullTime":
				currDateTime := currFieldModel.Value.Interface().(helper.NullTime)
				currType = "\"" + currDateTime.Value.Format("2006-01-02 03:04:05") + "\""
				break
			case "helper.NullInt":
				currNullableInt := currFieldModel.Value.Interface().(helper.NullInt)
				if currNullableInt.Valid == false {
					currType = "null"
				} else {
					currType = "\"" + strconv.Itoa(currNullableInt.Value) + "\""
				}
				break
			}
			break
		default:
			switch currFieldModel.Value.Type().String() {
			case "uuid.UUID":
				if !currFieldModel.Value.IsZero() {
					currType = "\"" + currFieldModel.Value.Interface().(uuid.UUID).String() + "\""
				} else {
					currType = "\"" + uuid.New().String() + "\""
				}
			}
		}

		if currType != "" {
			modelFields = append(modelFields, currType)
		}
	}

	return strings.Join(modelFields, ",")
}
