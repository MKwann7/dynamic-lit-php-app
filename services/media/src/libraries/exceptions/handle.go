package exceptions

import (
	"encoding/json"
	"net/http"
)

func HandleErr(responseWriter http.ResponseWriter, err error, status int) {
	msg, err := json.Marshal(&httpErr{
		Msg:  err.Error(),
		Code: status,
	})
	if err != nil {
		msg = []byte(err.Error())
	}
	http.Error(responseWriter, string(msg), status)
}

type httpErr struct {
	Msg  string `json:"msg"`
	Code int    `json:"code"`
}
