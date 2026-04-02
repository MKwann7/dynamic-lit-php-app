package controllers

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/dtos"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/auth"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/helper"
	"github.com/google/uuid"
	"gopkg.in/gographics/imagick.v2/imagick"
	_ "image/jpeg"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Student struct {

	// defining struct fields
	Name  string
	Marks int
	Id    string
}

const MaxUploadSize = 1024 * 1024 * 10 // 10MB
const MaxImageDimension = 1024 * 2     // 2048px
const ImageThumbnailSize = 150

const ErrorNotAuthorized = "You are not authorized to make this request"
const ErrorFileSize = "The uploaded file is too big. Please choose a file that's less than 10MB in size"
const ErrorRequestParse = "There was an error parsing the request: entityName=%s; imageClass=%s;"

func UploadImageControllerHandle(responseWriter http.ResponseWriter, webRequest *http.Request) {

	user, _, err := auth.AuthorizeRequest(webRequest)

	if err != nil {
		log.Println(ErrorNotAuthorized + ": " + err.Error())
		http.Error(responseWriter, ErrorNotAuthorized, http.StatusUnauthorized)
		return
	}

	webRequest.Body = http.MaxBytesReader(responseWriter, webRequest.Body, MaxUploadSize)
	if err := webRequest.ParseMultipartForm(MaxUploadSize); err != nil {
		log.Println(ErrorFileSize)
		http.Error(responseWriter, ErrorFileSize, http.StatusBadRequest)
		return
	}

	entityName := webRequest.FormValue("entity_name")
	imageClass := webRequest.FormValue("image_class")

	if entityName == "" || imageClass == "" {
		errorText := fmt.Sprintf(ErrorRequestParse, entityName, imageClass)
		log.Println(errorText)
		http.Error(responseWriter, errorText, http.StatusBadRequest)
		return
	}

	// Optional admin override: allow a different user_id to be specified.
	effectiveUserId := user.UserId
	effectiveUserUuid := user.SysRowId.String()
	effectiveWhitelabelId := user.CompanyId

	if userIdStr := webRequest.FormValue("user_id"); userIdStr != "" {
		if uid, err := strconv.Atoi(userIdStr); err == nil && uid > 0 {
			effectiveUserId = uid
			// Fetch the target user to get their UUID for path building.
			users := dtos.Users{}
			if overrideUser, err := users.GetById(uid); err == nil {
				effectiveUserUuid = overrideUser.SysRowId.String()
				effectiveWhitelabelId = overrideUser.CompanyId
			}
		}
	}

	// Optional entity context (used for path and DB record).
	entityUuid := webRequest.FormValue("entity_uuid") // UUID string for storage path
	entityId := webRequest.FormValue("entity_id")     // integer ID for DB record (optional)
	parentUuid := webRequest.FormValue("parent_uuid") // UUID of parent image (for revisions)

	// Build storage paths using UUIDs, not integer IDs.
	var targetDirectory string
	if entityUuid != "" && entityName != "" {
		targetDirectory = "/app/storage/images/" + entityName + "s/" + entityUuid
	} else {
		targetDirectory = "/app/storage/images/users/" + effectiveUserUuid
	}
	targetThumbDirectory := targetDirectory + "/thumb"

	file, fileHeader, err := webRequest.FormFile("file")
	if err != nil {
		log.Println(err.Error())
		http.Error(responseWriter, err.Error(), http.StatusBadRequest)
		return
	}

	defer file.Close()

	if err = os.MkdirAll(targetDirectory, os.ModePerm); err != nil {
		log.Println("mkdir targetDirectory:", err.Error())
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	if err = os.MkdirAll(targetThumbDirectory, os.ModePerm); err != nil {
		log.Println("mkdir targetThumbDirectory:", err.Error())
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	newUUID, err := uuid.NewUUID()
	if err != nil {
		log.Println("newUUID:", err.Error())
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	fileName := fmt.Sprintf(targetDirectory+"/%s%s", newUUID.String(), filepath.Ext(fileHeader.Filename))
	fileThumbnail := fmt.Sprintf(targetThumbDirectory+"/thumb_%s%s", newUUID.String(), filepath.Ext(fileHeader.Filename))

	dst, err := os.Create(fileName)
	if err != nil {
		log.Println("create file:", err.Error())
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err = io.Copy(dst, file); err != nil {
		log.Println("copy file:", err.Error())
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	localFile, err := os.Open(dst.Name())
	if err != nil {
		log.Println("open local file:", err.Error())
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	defer localFile.Close()

	contentType, err := getFileContentType(localFile)
	if err != nil {
		log.Println("content type:", err.Error())
		http.Error(responseWriter, err.Error()+": "+contentType, http.StatusInternalServerError)
		return
	}

	if fileIsNotAnImage(contentType) {
		log.Println("fileIsNotAnImage:", contentType)
		http.Error(responseWriter, "fileIsNotAnImage: "+contentType, http.StatusInternalServerError)
		os.Remove(dst.Name())
		return
	}

	if contentType != "image/svg+xml" {
		if err = resizeFileIfLargerThanMax(dst.Name()); err != nil {
			log.Println("resizeFileIfLargerThanMax:", err.Error())
			http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	imageCndName := buildCndNameFromFileName(fileName)
	imageCndThumbnail := buildCndNameFromFileName(fileThumbnail)

	if contentType != "image/svg+xml" {
		if err = createImageThumbnail(dst.Name(), fileThumbnail); err != nil {
			log.Println("createImageThumbnail:", err.Error())
			http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		if err = createSvgThumbnail(dst.Name(), fileThumbnail); err != nil {
			log.Println("createSvgThumbnail:", err.Error())
			http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	image, err := insertImageRecord(
		effectiveUserId,
		effectiveWhitelabelId,
		newUUID,
		fileName,
		imageCndName,
		imageCndThumbnail,
		entityId,
		entityName,
		contentType,
		imageClass,
		parentUuid,
		parseOptionalInt(webRequest.FormValue("x_offset")),
		parseOptionalInt(webRequest.FormValue("y_offset")),
	)

	if err != nil {
		log.Println("insertImageRecord:", err.Error())
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	type ReturnImage struct {
		Image        string `json:"image"`
		Thumb        string `json:"thumb"`
		ImageId      int    `json:"image_id"`
		ImageUuid    string `json:"image_uuid"`
		Type         string `json:"type"`
		WhitelabelId int    `json:"whitelabel_id"`
		XOffset      *int   `json:"x_offset,omitempty"`
		YOffset      *int   `json:"y_offset,omitempty"`
	}

	imageData := ReturnImage{
		Image:        imageCndName,
		Thumb:        imageCndThumbnail,
		ImageId:      image.ImageId,
		ImageUuid:    image.SysRowId.String(),
		Type:         contentType,
		WhitelabelId: effectiveWhitelabelId,
	}
	if image.XOffset.Valid { v := image.XOffset.Value; imageData.XOffset = &v }
	if image.YOffset.Valid { v := image.YOffset.Value; imageData.YOffset = &v }

	result := helper.TransactionResult{Success: true, Message: "image registered", Data: imageData}
	jsonResult, _ := json.Marshal(result)
	log.Println("image registered: " + string(jsonResult))
	helper.JsonReturn(result, responseWriter)
}

func getFileContentType(out *os.File) (string, error) {

	// Only the first 512 bytes are used to sniff the content type.
	buffer := make([]byte, 512)

	_, err := out.Read(buffer)
	if err != nil {
		return "", err
	}

	contentType := http.DetectContentType(buffer)

	// Additional check for SVG content
	if bytes.Contains(buffer, []byte("<svg")) {
		return "image/svg+xml", nil
	}

	return contentType, nil
}

func fileIsNotAnImage(fileType string) bool {
	switch fileType {
	case "image/jpeg", "image/png", "image/gif", "image/svg+xml", "image/webp":
		return false
	default:
		return true
	}
}

func createImageThumbnail(localName string, fileThumbnail string) error {
	imagick.Initialize()
	defer imagick.Terminate()

	mw := imagick.NewMagickWand()
	if err := mw.ReadImage(localName); err != nil {
		return err
	}

	originalWidth := mw.GetImageWidth()
	originalHeight := mw.GetImageHeight()

	if err := resizeImage(mw, originalWidth, originalHeight, ImageThumbnailSize, false); err != nil {
		return err
	}
	if err := mw.WriteImage(fileThumbnail); err != nil {
		return err
	}

	mwthumb := imagick.NewMagickWand()
	if err := mwthumb.ReadImage(fileThumbnail); err != nil {
		return err
	}

	thumbWidth := mwthumb.GetImageWidth()
	thumbHeight := mwthumb.GetImageHeight()
	xcrop := processCropValue(thumbWidth, ImageThumbnailSize)
	ycrop := processCropValue(thumbHeight, ImageThumbnailSize)
	mwthumb.CropImage(ImageThumbnailSize, ImageThumbnailSize, xcrop, ycrop)

	return mwthumb.WriteImage(fileThumbnail)
}

func createSvgThumbnail(localName string, fileThumbnail string) error {
	sourceFile, err := os.Open(localName)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(fileThumbnail)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

func processCropValue(originalSize uint, cropSize uint) int {
	if originalSize > cropSize {
		return int((originalSize - cropSize) / 2)
	}
	return 0
}

func resizeFileIfLargerThanMax(localName string) error {
	imagick.Initialize()
	defer imagick.Terminate()

	mw := imagick.NewMagickWand()
	if err := mw.ReadImage(localName); err != nil {
		return err
	}

	originalWidth := mw.GetImageWidth()
	originalHeight := mw.GetImageHeight()

	if originalWidth > MaxImageDimension || originalHeight > MaxImageDimension {
		if err := resizeImage(mw, originalWidth, originalHeight, MaxImageDimension, true); err != nil {
			return err
		}
		os.Remove(localName)
		if err := mw.WriteImage(localName); err != nil {
			return err
		}
	}
	return nil
}

func resizeImage(mw *imagick.MagickWand, originalWidth uint, originalHeight uint, imageDimension uint, contain bool) error {

	var err error

	if contain {
		if (originalWidth > imageDimension && originalHeight > imageDimension && originalWidth > originalHeight) || (originalWidth > imageDimension && originalWidth > originalHeight) {
			err = mw.ResizeImage(imageDimension, calculateResizedDimension(originalWidth, originalHeight, imageDimension), imagick.FILTER_LANCZOS, 1)
		} else if (originalWidth > imageDimension && originalHeight > imageDimension && originalWidth < originalHeight) || (originalHeight > imageDimension && originalWidth < originalHeight) {
			err = mw.ResizeImage(calculateResizedDimension(originalHeight, originalWidth, imageDimension), imageDimension, imagick.FILTER_LANCZOS, 1)
		}
	} else {
		if (originalWidth > imageDimension && originalHeight > imageDimension && originalWidth > originalHeight) || (originalWidth > imageDimension && originalWidth > originalHeight) {
			err = mw.ResizeImage(calculateResizedDimension(originalHeight, originalWidth, imageDimension), imageDimension, imagick.FILTER_LANCZOS, 1)
		} else if (originalWidth > imageDimension && originalHeight > imageDimension && originalWidth < originalHeight) || (originalHeight > imageDimension && originalWidth < originalHeight) {
			err = mw.ResizeImage(imageDimension, calculateResizedDimension(originalWidth, originalHeight, imageDimension), imagick.FILTER_LANCZOS, 1)
		}
	}

	if err != nil {
		return err
	}
	return mw.SetImageCompressionQuality(95)
}

func calculateResizedDimension(sideA uint, sideB uint, imageDimension uint) uint {
	return uint((float32(imageDimension) / float32(sideA)) * float32(sideB))
}

func buildCndNameFromFileName(name string) string {
	return strings.Replace(name, "/app/storage", "/cdn", -1)
}

// parseOptionalInt converts a form string to *int; returns nil when the string is empty or invalid.
func parseOptionalInt(s string) *int {
	if s == "" {
		return nil
	}
	if v, err := strconv.Atoi(s); err == nil {
		return &v
	}
	return nil
}

func insertImageRecord(
	effectiveUserId int,
	effectiveWhitelabelId int,
	fileUuid uuid.UUID,
	fileName string,
	cndName string,
	cndThumbnail string,
	entityId string,
	entityName string,
	contentType string,
	imageClass string,
	parentUuid string,
	xOffset *int,
	yOffset *int,
) (*dtos.Image, error) {

	imagick.Initialize()
	defer imagick.Terminate()

	originalWidth := 100
	originalHeight := 100

	if contentType != "image/svg+xml" {
		mw := imagick.NewMagickWand()
		if err := mw.ReadImage(fileName); err != nil {
			return nil, err
		}
		originalWidth = int(mw.GetImageWidth())
		originalHeight = int(mw.GetImageHeight())
	} else {
		w, h, err := getSvgDimensions(fileName)
		if err != nil {
			return nil, err
		}
		originalWidth = int(w)
		originalHeight = int(h)
	}

	// Resolve parentUuid → parentId (creates a revision chain).
	var newParentId helper.NullInt
	if parentUuid != "" {
		if pUuid, err := uuid.Parse(parentUuid); err == nil {
			imgs := dtos.Images{}
			if parentImg, err := imgs.GetByUuid(pUuid); err == nil && parentImg.ImageId > 0 {
				newParentId = helper.NullInt{Value: parentImg.ImageId, Valid: true}
			}
		}
	}

	// Resolve optional integer entity_id.
	var entityIdInt helper.NullInt
	if entityId != "" {
		if id, err := strconv.Atoi(entityId); err == nil && id > 0 {
			entityIdInt = helper.NullInt{Value: id, Valid: true}
		}
	}

	imageModel := dtos.Image{}
	imageModel.SysRowId = fileUuid  // use the file UUID as sys_row_id so URL → DB lookups always align
	imageModel.UserId = effectiveUserId
	imageModel.WhitelabelId = effectiveWhitelabelId
	imageModel.ParentId = newParentId
	imageModel.EntityId = entityIdInt
	imageModel.EntityName = entityName
	imageModel.ImageClass = imageClass
	imageModel.Type = contentType
	imageModel.Title = fileName
	imageModel.Url = cndName
	imageModel.Thumb = cndThumbnail
	imageModel.Width = originalWidth
	imageModel.Height = originalHeight
	if xOffset != nil {
		imageModel.XOffset = helper.NullInt{Value: *xOffset, Valid: true}
	}
	if yOffset != nil {
		imageModel.YOffset = helper.NullInt{Value: *yOffset, Valid: true}
	}
	imageModel.CreatedBy = effectiveUserId
	imageModel.CreatedOn = helper.NullTime{Value: time.Now(), Valid: true}
	imageModel.UpdatedBy = effectiveUserId
	imageModel.LastUpdated = helper.NullTime{Value: time.Now(), Valid: true}

	images := dtos.Images{}
	return images.CreateNew(imageModel)
}

func getSvgDimensions(filename string) (float64, float64, error) {
	file, err := os.Open(filename)
	if err != nil {
		return 0, 0, err
	}
	defer file.Close()

	var svg SVG
	if err = xml.NewDecoder(file).Decode(&svg); err != nil {
		return 0, 0, err
	}

	parseDimension := func(dimension string) (float64, error) {
		dimension = strings.TrimSuffix(dimension, "px")
		return strconv.ParseFloat(dimension, 64)
	}

	width, err := parseDimension(svg.Width)
	if err != nil {
		return 0, 0, err
	}
	height, err := parseDimension(svg.Height)
	if err != nil {
		return 0, 0, err
	}
	return width, height, nil
}

type SVG struct {
	Width  string `xml:"width,attr"`
	Height string `xml:"height,attr"`
}
