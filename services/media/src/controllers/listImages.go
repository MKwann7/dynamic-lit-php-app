package controllers

import (
	"encoding/json"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/dtos"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/auth"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/helper"
	"github.com/google/uuid"
	"log"
	"net/http"
)

// cropListItem is the JSON shape for each cropped derivative nested inside an imageListItem.
type cropListItem struct {
	ImageId    int    `json:"image_id"`
	ImageUuid  string `json:"image_uuid"`
	ParentUuid string `json:"parent_uuid"`
	Url        string `json:"url"`
	Thumb      string `json:"thumb"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	XOffset    *int   `json:"x_offset,omitempty"`
	YOffset    *int   `json:"y_offset,omitempty"`
	ImageClass string `json:"image_class"`
	EntityName string `json:"entity_name"`
	Type       string `json:"type"`
}

// imageListItem is the JSON shape for each root (original) image.
// Crops is always an array — empty when no derivatives exist.
type imageListItem struct {
	ImageId    int            `json:"image_id"`
	ImageUuid  string         `json:"image_uuid"`
	Url        string         `json:"url"`
	Thumb      string         `json:"thumb"`
	Width      int            `json:"width"`
	Height     int            `json:"height"`
	ImageClass string         `json:"image_class"`
	EntityName string         `json:"entity_name"`
	Type       string         `json:"type"`
	Crops      []cropListItem `json:"crops"`
}

// ListImagesControllerHandle handles GET /api/v1/images?user_uuid=<uuid>
//
// Returns only root (original) images — those with no parent_id.
// Each root image embeds a "crops" array containing every cropped derivative.
func ListImagesControllerHandle(responseWriter http.ResponseWriter, webRequest *http.Request) {
	_, _, err := auth.AuthorizeRequest(webRequest)
	if err != nil {
		log.Println(ErrorNotAuthorized + ": " + err.Error())
		http.Error(responseWriter, ErrorNotAuthorized, http.StatusUnauthorized)
		return
	}

	// Require user_uuid — the caller must tell us whose images to return.
	userUuidParam := webRequest.URL.Query().Get("user_uuid")
	if userUuidParam == "" {
		http.Error(responseWriter, "user_uuid query parameter is required", http.StatusBadRequest)
		return
	}

	parsedUuid, parseErr := uuid.Parse(userUuidParam)
	if parseErr != nil {
		http.Error(responseWriter, "invalid user_uuid parameter", http.StatusBadRequest)
		return
	}

	users := dtos.Users{}
	targetUser, lookupErr := users.GetByUuid(parsedUuid)
	if lookupErr != nil {
		log.Println("user lookup for list-images:", lookupErr.Error())
		http.Error(responseWriter, "user not found", http.StatusNotFound)
		return
	}

	images := dtos.Images{}
	rootImages, err := images.GetRootsByUserId(targetUser.UserId)
	if err != nil {
		log.Println("GetRootsByUserId error:", err.Error())
		http.Error(responseWriter, "error fetching images", http.StatusInternalServerError)
		return
	}

	items := make([]imageListItem, 0, len(rootImages))
	for _, img := range rootImages {
		item := imageListItem{
			ImageId:    img.ImageId,
			ImageUuid:  img.SysRowId.String(),
			Url:        img.Url,
			Thumb:      img.Thumb,
			Width:      img.Width,
			Height:     img.Height,
			ImageClass: img.ImageClass,
			EntityName: img.EntityName,
			Type:       img.Type,
			Crops:      []cropListItem{}, // always an array, never null
		}

		// Fetch all cropped derivatives for this root image.
		crops, cropErr := images.GetCropsByParentId(img.ImageId)
		if cropErr == nil {
			for _, crop := range crops {
				ci := cropListItem{
					ImageId:    crop.ImageId,
					ImageUuid:  crop.SysRowId.String(),
					ParentUuid: img.SysRowId.String(),
					Url:        crop.Url,
					Thumb:      crop.Thumb,
					Width:      crop.Width,
					Height:     crop.Height,
					ImageClass: crop.ImageClass,
					EntityName: crop.EntityName,
					Type:       crop.Type,
				}
				if crop.XOffset.Valid {
					v := crop.XOffset.Value
					ci.XOffset = &v
				}
				if crop.YOffset.Valid {
					v := crop.YOffset.Value
					ci.YOffset = &v
				}
				item.Crops = append(item.Crops, ci)
			}
		}

		items = append(items, item)
	}

	result := helper.TransactionResult{Success: true, Message: "images retrieved", Data: items}
	jsonBytes, _ := json.Marshal(result)
	responseWriter.Header().Set("Content-Type", "application/json")
	responseWriter.Write(jsonBytes)
}
