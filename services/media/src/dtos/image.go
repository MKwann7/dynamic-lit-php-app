package dtos

import (
	"fmt"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/builder"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/db"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/helper"
	"github.com/google/uuid"
	"reflect"
)

type Images struct {
	builder builder.Builder
}

func (images *Images) GetById(imageId int) (*Image, error) {
	connection := images.getConnection()
	model := Image{}
	interfaceModel, err := images.builder.GetById(imageId, connection, reflect.TypeOf(model))
	if err != nil {
		return nil, err
	}
	return images.assignInterfaceModel(interfaceModel), nil
}

func (images *Images) GetByUuid(imageUuid uuid.UUID) (*Image, error) {
	connection := images.getConnection()
	model := Image{}
	interfaceModel, err := images.builder.GetByUuid(imageUuid, connection, reflect.TypeOf(model))
	if err != nil {
		return nil, err
	}
	return images.assignInterfaceModel(interfaceModel), nil
}

// GetByUrlFragment looks up an image whose url or title contains the given UUID string.
// Used as a fallback when sys_row_id was auto-generated and doesn't match the filename UUID.
func (images *Images) GetByUrlFragment(uuidFragment string) (*Image, error) {
	connection := images.getConnection()
	rawList, err := images.builder.GetWhere(
		connection,
		reflect.TypeOf(Image{}),
		"(url LIKE '%"+uuidFragment+"%' OR title LIKE '%"+uuidFragment+"%')",
		"ASC",
		1,
	)
	if err != nil || len(rawList) == 0 {
		return nil, fmt.Errorf("image not found by url fragment %s", uuidFragment)
	}
	return images.assignInterfaceModel(rawList[0]), nil
}

// GetByUserId returns all images belonging to the given user, newest first.
func (images *Images) GetByUserId(userId int) ([]*Image, error) {
	connection := images.getConnection()
	rawList, err := images.builder.GetWhere(
		connection,
		reflect.TypeOf(Image{}),
		fmt.Sprintf("user_id = %d", userId),
		"DESC",
		0,
	)
	if err != nil {
		return nil, err
	}
	var result []*Image
	for _, row := range rawList {
		result = append(result, images.assignInterfaceModel(row))
	}
	return result, nil
}

// GetRootsByUserId returns only root (original) images for a user —
// images with no parent_id.  Crops are excluded; use GetCropsByParentId
// to retrieve each root's derivatives.
func (images *Images) GetRootsByUserId(userId int) ([]*Image, error) {
	connection := images.getConnection()
	rawList, err := images.builder.GetWhere(
		connection,
		reflect.TypeOf(Image{}),
		fmt.Sprintf("user_id = %d AND parent_id IS NULL", userId),
		"DESC",
		0,
	)
	if err != nil {
		return nil, err
	}
	var result []*Image
	for _, row := range rawList {
		result = append(result, images.assignInterfaceModel(row))
	}
	return result, nil
}

// GetCropsByParentId returns all cropped derivatives whose parent_id matches
// the given integer image ID, newest first.
func (images *Images) GetCropsByParentId(parentId int) ([]*Image, error) {
	connection := images.getConnection()
	rawList, err := images.builder.GetWhere(
		connection,
		reflect.TypeOf(Image{}),
		fmt.Sprintf("parent_id = %d", parentId),
		"DESC",
		0,
	)
	if err != nil {
		return nil, err
	}
	var result []*Image
	for _, row := range rawList {
		result = append(result, images.assignInterfaceModel(row))
	}
	return result, nil
}

func (images *Images) CreateNew(model Image) (*Image, error) {
	connection := images.getConnection()
	fields := reflect.TypeOf(model)
	values := reflect.ValueOf(model)
	interfaceModel, err := images.builder.CreateNew(db.MakeSqlExecModel(fields, values, connection.PrimaryKey), connection)
	if err != nil {
		return nil, err
	}
	return images.assignInterfaceModel(interfaceModel), nil
}

func (images *Images) getConnection() db.Connection {
	connection := db.Connection{}
	return connection.GetMedia("image", "image_id", "sys_row_id")
}

func (images *Images) assignInterfaceModel(model map[string]interface{}) *Image {
	returnModel := &Image{}
	returnModel.ImageId = helper.CastAsNullableInt(model["image_id"])
	returnModel.ParentId = helper.CastAsIntWithNull(model["parent_id"])
	returnModel.VersionId = helper.CastAsIntWithNull(model["version_id"])
	returnModel.WhitelabelId = helper.CastAsNullableInt(model["whitelabel_id"])
	returnModel.UserId = helper.CastAsNullableInt(model["user_id"])
	returnModel.EntityId = helper.CastAsIntWithNull(model["entity_id"])
	returnModel.EntityName = helper.CastAsNullableString(model["entity_name"])
	returnModel.ImageClass = helper.CastAsNullableString(model["image_class"])
	returnModel.Title = helper.CastAsNullableString(model["title"])
	returnModel.Url = helper.CastAsNullableString(model["url"])
	returnModel.Thumb = helper.CastAsNullableString(model["thumb"])
	returnModel.Width = helper.CastAsNullableInt(model["width"])
	returnModel.Height = helper.CastAsNullableInt(model["height"])
	returnModel.XOffset = helper.CastAsIntWithNull(model["x_offset"])
	returnModel.YOffset = helper.CastAsIntWithNull(model["y_offset"])
	returnModel.Type = helper.CastAsNullableString(model["type"])
	returnModel.CreatedBy = helper.CastAsNullableInt(model["created_by"])
	returnModel.UpdatedBy = helper.CastAsNullableInt(model["updated_by"])

	// sys_row_id is BINARY(16) — use CastBinaryAsNullableUuid.
	if nUuid := helper.CastBinaryAsNullableUuid(model["sys_row_id"]); nUuid.Valid {
		returnModel.SysRowId = nUuid.Value
	}

	return returnModel
}

type Image struct {
	ImageId      int             `field:"image_id"`
	ParentId     helper.NullInt  `field:"parent_id"`
	VersionId    helper.NullInt  `field:"version_id"`
	WhitelabelId int             `field:"whitelabel_id"`
	UserId       int             `field:"user_id"`
	EntityId     helper.NullInt  `field:"entity_id"`
	EntityName   string          `field:"entity_name"`
	ImageClass   string          `field:"image_class"`
	Title        string          `field:"title"`
	Url          string          `field:"url"`
	Thumb        string          `field:"thumb"`
	Width        int             `field:"width"`
	Height       int             `field:"height"`
	XOffset      helper.NullInt  `field:"x_offset"`
	YOffset      helper.NullInt  `field:"y_offset"`
	Type         string          `field:"type"`
	CreatedOn    helper.NullTime `field:"created_on"`
	CreatedBy    int             `field:"created_by"`
	LastUpdated  helper.NullTime `field:"last_updated"`
	UpdatedBy    int             `field:"updated_by"`
	SysRowId     uuid.UUID       `field:"sys_row_id"`
}
