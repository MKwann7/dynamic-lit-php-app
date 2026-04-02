package dtos

import (
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/builder"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/db"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/helper"
	"github.com/google/uuid"
	"reflect"
)

type Users struct {
	builder builder.Builder
}

func (users *Users) GetById(userId int) (*User, error) {
	connection := users.getConnection()
	model := User{}
	interfaceModel, error := users.builder.GetById(userId, connection, reflect.TypeOf(model))

	if error != nil {
		return nil, error
	}

	returnModel := users.assignInterfaceModel(interfaceModel)

	return returnModel, nil
}

func (users *Users) GetByUuid(userUuid uuid.UUID) (*User, error) {
	connection := users.getConnection()
	model := User{}
	interfaceModel, error := users.builder.GetByUuid(userUuid, connection, reflect.TypeOf(model))

	if error != nil {
		return nil, error
	}

	returnModel := users.assignInterfaceModel(interfaceModel)

	return returnModel, nil
}

// LocalAddr returns the local network address.
func (users *Users) getConnection() db.Connection {
	connection := db.Connection{}
	return connection.GetMain("user", "user_id", "sys_row_id")
}

func (users *Users) assignInterfaceModel(model map[string]interface{}) *User {
	returnModel := &User{}
	returnModel.UserId = helper.CastAsNullableInt(model["user_id"])
	returnModel.CompanyId = helper.CastAsNullableInt(model["whitelabel_id"])
	returnModel.OriginatorId = helper.CastAsNullableInt(model["sponsor_id"])
	returnModel.FirstName = helper.CastAsNullableString(model["first_name"])
	returnModel.LastName = helper.CastAsNullableString(model["last_name"])
	returnModel.NamePrefix = helper.CastAsNullableString(model["name_prefix"])
	returnModel.MiddleName = helper.CastAsNullableString(model["middle_name"])
	returnModel.NameSuffix = helper.CastAsNullableString(model["name_sufx"])
	returnModel.Username = helper.CastAsNullableString(model["username"])
	returnModel.Password = helper.CastAsNullableString(model["password"])
	returnModel.PasswordResetToken = helper.CastAsNullableString(model["password_reset_token"])
	returnModel.Pin = helper.CastAsNullableInt(model["pin"])
	returnModel.UserEmail = helper.CastAsNullableString(model["user_email"])
	returnModel.UserPhone = helper.CastAsNullableString(model["user_phone"])
	returnModel.Status = helper.CastAsNullableString(model["status"])

	// sys_row_id is BINARY(16) — use CastBinaryAsNullableUuid.
	if nUuid := helper.CastBinaryAsNullableUuid(model["sys_row_id"]); nUuid.Valid {
		returnModel.SysRowId = nUuid.Value
	}

	return returnModel
}

type User struct {
	UserId             int             `field:"user_id"`
	CompanyId          int             `field:"whitelabel_id"`
	OriginatorId       int             `field:"sponsor_id"`
	FirstName          string          `field:"first_name"`
	LastName           string          `field:"last_name"`
	NamePrefix         string          `field:"name_prefix"`
	MiddleName         string          `field:"middle_name"`
	NameSuffix         string          `field:"name_sufx"`
	Username           string          `field:"username"`
	Password           string          `field:"password"`
	PasswordResetToken string          `field:"password_reset_token"`
	Pin                int             `field:"pin"`
	UserEmail          string          `field:"user_email"`
	UserPhone          string          `field:"user_phone"`
	CreatedOn          helper.NullTime `field:"created_on"`
	CreatedBy          int             `field:"created_by"`
	LastUpdated        helper.NullTime `field:"last_updated"`
	UpdateBy           int             `field:"update_by"`
	Status             string          `field:"status"`
	PreferredName      string          `field:"preferred_name"`
	LastLogin          helper.NullTime `field:"last_login"`
	SysRowId           uuid.UUID       `field:"sys_row_id"`
}
