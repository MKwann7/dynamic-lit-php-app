package helper

import (
	"encoding/json"
	"net/http"
)

type TransactionResult struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}
type TransactionBool struct {
	Success bool `json:"success"`
}
type Transaction interface {
}

func JsonReturn(jsonReturn Transaction, responseWriter http.ResponseWriter) {

	responseWriter.Header().Set("Content-Type", "application/json charset=utf-8")
	jsonResult, conversionError := json.Marshal(jsonReturn)
	if conversionError != nil {
		failure := TransactionBool{Success: false}
		failureResult, _ := json.Marshal(failure)
		responseWriter.Write(failureResult)
		return
	}

	responseWriter.Write(jsonResult)
}
