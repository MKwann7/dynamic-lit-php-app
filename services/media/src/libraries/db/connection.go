package db

import (
	"os"
	"reflect"
	"regexp"
	"strings"
)

type Connection struct {
	Table      string
	PrimaryKey string
	UuidKey    string
	IpAddress  string
	Port       string
	Database   string
	UserName   string
	Password   string
	DbType     string
}

const MySQL = "mysql"
const Postgres = "extensions"

func (connection *Connection) GetMain(tableName string, userKey string, uuidKey string) Connection {
	return Connection{
		os.Getenv("DB_USER_DATABASE") + "." + tableName,
		userKey,
		uuidKey,
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER_DATABASE"),
		os.Getenv("DB_USERNAME"),
		os.Getenv("DB_PASSWORD"),
		MySQL}
}

func (connection *Connection) GetMedia(tableName string, userKey string, uuidKey string) Connection {
	return Connection{
		os.Getenv("DB_MEDIA_DATABASE") + "." + tableName,
		userKey,
		uuidKey,
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_MEDIA_DATABASE"),
		os.Getenv("DB_USERNAME"),
		os.Getenv("DB_PASSWORD"),
		MySQL}
}

func (connection *Connection) GetTraffic(tableName string, userKey string, uuidKey string) Connection {
	return Connection{
		os.Getenv("DB_MAIN_DATABASE") + "." + tableName,
		userKey,
		uuidKey,
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_MAIN_DATABASE"),
		os.Getenv("DB_USERNAME"),
		os.Getenv("DB_PASSWORD"),
		MySQL}
}

func (connection *Connection) GetNotification(tableName string, userKey string, uuidKey string) Connection {
	return Connection{
		tableName,
		userKey,
		uuidKey,
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_MAIN_DATABASE"),
		os.Getenv("DB_USERNAME"),
		os.Getenv("DB_PASSWORD"),
		Postgres}
}

type SqlExecModel struct {
	Field string
	Type  reflect.Kind
	Value reflect.Value
}

func MakeSqlExecModel(myStructFields reflect.Type, myStructValues reflect.Value, indexField string) []SqlExecModel {

	num := myStructFields.NumField()

	var myModel []SqlExecModel

	for i := 0; i < num; i++ {
		field := myStructFields.Field(i)
		value := myStructValues.Field(i)

		currFieldName := convertToSqlField(field.Name)

		if currFieldName != indexField {
			sqlExecModel := SqlExecModel{Field: convertToSqlField(field.Name), Type: value.Kind(), Value: value}
			myModel = append(myModel, sqlExecModel)
		}
	}

	return myModel
}

var matchFirstCap = regexp.MustCompile("(.)([A-Z][a-z]+)")
var matchAllCap = regexp.MustCompile("([a-z0-9])([A-Z])")

func convertToSqlField(fieldName string) string {
	snake := matchFirstCap.ReplaceAllString(fieldName, "${1}_${2}")
	snake = matchAllCap.ReplaceAllString(snake, "${1}_${2}")
	return strings.ToLower(snake)
}
