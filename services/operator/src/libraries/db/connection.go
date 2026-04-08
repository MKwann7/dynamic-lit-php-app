package db

import (
	"os"
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

// GetIdentity builds a Connection targeting the dynlit_identity database.
func (connection *Connection) GetIdentity(tableName string, userKey string, uuidKey string) Connection {
	return Connection{
		Table:      os.Getenv("DB_IDENTITY_DATABASE") + "." + tableName,
		PrimaryKey: userKey,
		UuidKey:    uuidKey,
		IpAddress:  os.Getenv("DB_HOST"),
		Port:       os.Getenv("DB_PORT"),
		Database:   os.Getenv("DB_IDENTITY_DATABASE"),
		UserName:   os.Getenv("DB_USERNAME"),
		Password:   os.Getenv("DB_PASSWORD"),
		DbType:     MySQL,
	}
}

var matchFirstCap = regexp.MustCompile("(.)([A-Z][a-z]+)")
var matchAllCap = regexp.MustCompile("([a-z0-9])([A-Z])")

func convertToSqlField(fieldName string) string {
	snake := matchFirstCap.ReplaceAllString(fieldName, "${1}_${2}")
	snake = matchAllCap.ReplaceAllString(snake, "${1}_${2}")
	return strings.ToLower(snake)
}
