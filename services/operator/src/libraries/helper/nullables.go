package helper

import (
	"database/sql"
	"github.com/google/uuid"
)

type NullInt struct {
	Value int
	Valid bool
}

type NullUuid struct {
	Value uuid.UUID
	Valid bool
}

func CastAsNullableInt(integerInterface interface{}) int {
	integer, ok := integerInterface.(*sql.NullInt32)
	if !ok || !integer.Valid {
		return -1
	}
	return int(integer.Int32)
}

func CastAsIntWithNull(integerInterface interface{}) NullInt {
	integer, ok := integerInterface.(*sql.NullInt32)
	if !ok || !integer.Valid {
		return NullInt{Value: -1, Valid: false}
	}
	return NullInt{Value: int(integer.Int32), Valid: true}
}

func CastAsNullableString(stringValueInterface interface{}) string {
	stringValue, ok := stringValueInterface.(*sql.NullString)
	if !ok || !stringValue.Valid {
		return ""
	}
	return stringValue.String
}

func CastBinaryAsNullableUuid(binInterface interface{}) NullUuid {
	binPtr, ok := binInterface.(*[]byte)
	if !ok || binPtr == nil || len(*binPtr) != 16 {
		return NullUuid{Valid: false}
	}
	u, err := uuid.FromBytes(*binPtr)
	if err != nil {
		return NullUuid{Valid: false}
	}
	return NullUuid{Value: u, Valid: true}
}
