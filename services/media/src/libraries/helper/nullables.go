package helper

import (
	"database/sql"
	"github.com/google/uuid"
	"time"
)

func CastAsNullableInt(integerInterface interface{}) int {

	integer, err := integerInterface.(*sql.NullInt32)

	if err != true || integer.Valid == false {
		return -1
	}

	return int(integer.Int32)
}

func CastAsIntWithNull(integerInterface interface{}) NullInt {

	integer, err := integerInterface.(*sql.NullInt32)

	if err != true || integer.Valid == false {
		return NullInt{Value: -1, Valid: false}
	}

	return NullInt{Value: int(integer.Int32), Valid: true}
}

func CastAsNullableString(stringValueInterface interface{}) string {

	stringValue, err := stringValueInterface.(*sql.NullString)

	if err != true || stringValue.Valid == false {
		return ""
	}

	return stringValue.String
}

func CastAsNullableBoolean(stringValueInterface interface{}) bool {

	boolValue, err := stringValueInterface.(*sql.NullBool)

	if err != true || boolValue.Valid == false {
		return false
	}

	return boolValue.Bool
}

func CastToNullableTime(timeDataInterface interface{}) NullTime {

	timeData, err := timeDataInterface.(*sql.NullString)

	if err != true || timeData.Valid == false {
		return NullTime{Valid: false}
	}

	newTime, error := time.Parse("2015-04-15 15:35:14", timeData.String)

	if error != nil {
		return NullTime{Valid: false}
	}

	newTime.String()

	return NullTime{Value: newTime, Valid: true}
}

type NullTime struct {
	Value time.Time
	Valid bool
}

func CastAsNullableUuid(uuidDataInterface interface{}) NullUuid {
	uuidData, err := uuidDataInterface.(*sql.NullString)
	if err != true || uuidData.Valid == false {
		return NullUuid{Valid: false}
	}

	newUuid, error := uuid.Parse(uuidData.String)
	if error != nil {
		return NullUuid{Valid: false}
	}

	return NullUuid{Value: newUuid, Valid: true}
}

// CastBinaryAsNullableUuid converts a *[]byte (MySQL BINARY(16) column) to a NullUuid.
// The MySQL driver returns BINARY(16) as a raw []byte, not a string.
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

type NullUuid struct {
	Value uuid.UUID
	Valid bool
}

type NullInt struct {
	Value int
	Valid bool
}
