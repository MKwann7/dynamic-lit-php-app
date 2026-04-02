package dtos

import (
	"errors"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/builder"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/db"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/helper"
	"github.com/google/uuid"
	"reflect"
)

type Companies struct {
	builder builder.Builder
}

func (companies *Companies) GetById(userId int) (*Company, error) {
	connection := companies.getConnection()
	model := Company{}
	interfaceModel, error := companies.builder.GetById(userId, connection, reflect.TypeOf(model))

	if error != nil {
		return nil, error
	}

	returnModel := companies.assignInterfaceModel(interfaceModel)

	return returnModel, nil
}

func (companies *Companies) GetByUuid(userUuid uuid.UUID) (*Company, error) {
	connection := companies.getConnection()
	model := Company{}
	interfaceModel, error := companies.builder.GetByUuid(userUuid, connection, reflect.TypeOf(model))

	if error != nil {
		return nil, error
	}

	returnModel := companies.assignInterfaceModel(interfaceModel)

	return returnModel, nil
}

func (companies *Companies) GetByMediaDomain(mediaDomain string) (*Company, error) {
	connection := companies.getConnection()
	model := Company{}
	interfaceModel, error := companies.builder.GetWhere(connection, reflect.TypeOf(model), "domain_media =  '"+mediaDomain+"'", "ASC", 1)

	if error != nil {
		return nil, error
	}

	if len(interfaceModel) == 0 {
		return nil, errors.New("no company was found by that media domain")
	}

	returnModel := companies.assignInterfaceModel(interfaceModel[0])

	return returnModel, nil
}

// LocalAddr returns the local network address.
func (companies *Companies) getConnection() db.Connection {
	connection := db.Connection{}
	return connection.GetMain("company", "company_id", "sys_row_id")
}

func (companies *Companies) assignInterfaceModel(model map[string]interface{}) *Company {
	returnModel := &Company{}
	returnModel.CompanyId = helper.CastAsNullableInt(model["company_id"])
	returnModel.CompanyName = helper.CastAsNullableString(model["company_name"])
	returnModel.PlatformName = helper.CastAsNullableString(model["platform_name"])
	returnModel.OwnerId = helper.CastAsNullableInt(model["owner_id"])
	returnModel.DefaultSponsorId = helper.CastAsNullableInt(model["default_sponsor_id"])
	returnModel.Status = helper.CastAsNullableString(model["status"])
	returnModel.ParentId = helper.CastAsIntWithNull(model["parent_id"])
	returnModel.DomainPortal = helper.CastAsNullableString(model["domain_portal"])
	returnModel.DomainPortalSsl = helper.CastAsNullableBoolean(model["domain_portal_ssl"])
	returnModel.DomainPublic = helper.CastAsNullableString(model["domain_public"])
	returnModel.DomainPublicSsl = helper.CastAsNullableBoolean(model["domain_public_ssl"])
	returnModel.DomainMedia = helper.CastAsNullableString(model["domain_media"])
	returnModel.DomainMediaSsl = helper.CastAsNullableBoolean(model["domain_media_ssl"])
	returnModel.DomainWs = helper.CastAsNullableString(model["domain_ws"])
	returnModel.DomainWsSsl = helper.CastAsNullableBoolean(model["domain_ws_ssl"])

	if helper.CastAsNullableUuid(model["sys_row_id"]).Valid {
		returnModel.SysRowId = helper.CastAsNullableUuid(model["sys_row_id"]).Value
	}

	return returnModel
}

type Company struct {
	CompanyId        int            `field:"image_id"`
	CompanyName      string         `field:"company_name"`
	PlatformName     string         `field:"platform_name"`
	OwnerId          int            `field:"owner_id"`
	DefaultSponsorId int            `field:"default_sponsor_id"`
	Status           string         `field:"status"`
	ParentId         helper.NullInt `field:"parent_id"`
	DomainPortal     string         `field:"domain_portal"`
	DomainPortalSsl  bool           `field:"domain_portal_ssl"`
	DomainPublic     string         `field:"domain_public"`
	DomainPublicSsl  bool           `field:"domain_public_ssl"`
	DomainMedia      string         `field:"domain_media"`
	DomainMediaSsl   bool           `field:"domain_media_ssl"`
	DomainWs         string         `field:"domain_ws"`
	DomainWsSsl      bool           `field:"domain_ws_ssl"`
	SysRowId         uuid.UUID      `field:"sys_row_id"`
}
