package controllers

import (
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/helper"
	"net/http"
)

func MediaControllerHandle(responseWriter http.ResponseWriter, webRequest *http.Request) {

	healthCheck := helper.TransactionBool{Success: true}
	helper.JsonReturn(healthCheck, responseWriter)
}
