package builder

import (
	"errors"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/db"
	"github.com/google/uuid"
	"reflect"
	"strconv"
)

type Builder struct {
}

func (builder *Builder) GetById(entityId int, connection db.Connection, model reflect.Type) (map[string]interface{}, error) {
	entityCollection, error := builder.GetWhere(connection, model, connection.PrimaryKey+" = "+strconv.Itoa(entityId), "ASC", 1)

	if error != nil {
		return nil, error
	}

	return entityCollection[0], nil
}

func (builder *Builder) GetByUuid(entityUuid uuid.UUID, connection db.Connection, model reflect.Type) (map[string]interface{}, error) {

	// sys_row_id is stored as BINARY(16) — must use UUID_TO_BIN() for correct comparison.
	entityCollection, error := builder.GetWhere(connection, model, connection.UuidKey+" = UUID_TO_BIN('"+entityUuid.String()+"')", "ASC", 1)

	if error != nil {
		return nil, error
	}

	if len(entityCollection) == 0 {
		return nil, errors.New("no entity was found by that uuid")
	}

	return entityCollection[0], nil
}

func (builder *Builder) GetWhere(connection db.Connection, model reflect.Type, whereClause string, sort string, limit int) ([]map[string]interface{}, error) {
	switch connection.DbType {
	case "extensions":
		return db.PostgresGetWhere(connection, whereClause, sort, limit)
	default:
		return db.MysqlGetWhere(connection, whereClause, sort, limit)
	}
}

func (builder *Builder) CreateNew(model []db.SqlExecModel, connection db.Connection) (map[string]interface{}, error) {
	var models []map[string]interface{}
	var err error

	models, err = db.MysqlCreateNew(connection, model)

	if err != nil {
		return nil, err
	}

	return models[0], nil
}
