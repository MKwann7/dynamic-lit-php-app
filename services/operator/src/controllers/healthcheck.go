package controllers

import (
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/helper"
	"net/http"
)

func HealthcheckControllerHandle(responseWriter http.ResponseWriter, webRequest *http.Request) {

	healthCheck := helper.TransactionBool{Success: true}
	helper.JsonReturn(healthCheck, responseWriter)
}
