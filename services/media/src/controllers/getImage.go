package controllers

import (
	"encoding/json"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/dtos"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/auth"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/helper"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"log"
	"net/http"
)

// imageDetailItem is the JSON shape returned for a single image lookup.
// When the requested image is a crop, the root original is embedded under "original".
type imageDetailItem struct {
	ImageId    int              `json:"image_id"`
	ImageUuid  string           `json:"image_uuid"`
	ParentUuid string           `json:"parent_uuid,omitempty"`
	Url        string           `json:"url"`
	Thumb      string           `json:"thumb"`
	Width      int              `json:"width"`
	Height     int              `json:"height"`
	XOffset    *int             `json:"x_offset,omitempty"`
	YOffset    *int             `json:"y_offset,omitempty"`
	ImageClass string           `json:"image_class"`
	EntityName string           `json:"entity_name"`
	Type       string           `json:"type"`
	// Original is the root ancestor (no parent_id) embedded when this image is a crop.
	Original *imageDetailItem `json:"original,omitempty"`
}

// GetImageControllerHandle handles GET /api/v1/images/{image_uuid}
//
// Returns the requested image and, when the image is a cropped derivative,
// embeds the root original under the "original" key so callers always have
// access to the full-resolution source without a second round-trip.
func GetImageControllerHandle(responseWriter http.ResponseWriter, webRequest *http.Request) {
	_, _, err := auth.AuthorizeRequest(webRequest)
	if err != nil {
		log.Println(ErrorNotAuthorized+": "+err.Error())
		http.Error(responseWriter, ErrorNotAuthorized, http.StatusUnauthorized)
		return
	}

	imageUuidStr := mux.Vars(webRequest)["image_uuid"]
	imageUuid, err := uuid.Parse(imageUuidStr)
	if err != nil {
		http.Error(responseWriter, "invalid image_uuid", http.StatusBadRequest)
		return
	}

	images := dtos.Images{}
	img, err := images.GetByUuid(imageUuid)
	if err != nil || img == nil {
		// Fallback for records uploaded before sys_row_id was aligned with the filename UUID:
		// search the url / title columns for the UUID string.
		img, err = images.GetByUrlFragment(imageUuidStr)
		if err != nil || img == nil {
			log.Println("GetImage: not found for uuid", imageUuidStr)
			http.Error(responseWriter, "image not found", http.StatusNotFound)
			return
		}
	}

	item := toDetailItem(img)

	// If this image is a crop (has a parent_id), fetch and embed the original.
	if img.ParentId.Valid && img.ParentId.Value > 0 {
		parent, parentErr := images.GetById(img.ParentId.Value)
		if parentErr == nil && parent != nil {
			item.ParentUuid = parent.SysRowId.String()
			orig := toDetailItem(parent)
			item.Original = &orig
		}
	}

	result := helper.TransactionResult{Success: true, Message: "image retrieved", Data: item}
	jsonBytes, _ := json.Marshal(result)
	responseWriter.Header().Set("Content-Type", "application/json")
	responseWriter.Write(jsonBytes)
}

func toDetailItem(img *dtos.Image) imageDetailItem {
	item := imageDetailItem{
		ImageId:    img.ImageId,
		ImageUuid:  img.SysRowId.String(),
		Url:        img.Url,
		Thumb:      img.Thumb,
		Width:      img.Width,
		Height:     img.Height,
		ImageClass: img.ImageClass,
		EntityName: img.EntityName,
		Type:       img.Type,
	}
	if img.XOffset.Valid { v := img.XOffset.Value; item.XOffset = &v }
	if img.YOffset.Valid { v := img.YOffset.Value; item.YOffset = &v }
	return item
}

