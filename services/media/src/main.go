package main

import (
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/controllers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/urfave/negroni"
	"log"
	"net/http"
	"os"
)

func main() {

	// Load .env if present (local dev convenience).
	// Not fatal when absent — Docker Compose injects vars via env_file:.
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	router := router()
	middleware := negroni.Classic()
	middleware.UseHandler(router)

	// Start HTTP server
	log.Println("HTTP server started on (" + os.Getenv("PORT_NUM_MEDIA") + ")")
	log.Fatal(http.ListenAndServe(":"+os.Getenv("PORT_NUM_MEDIA"), corseHandler(middleware)))
}

func router() *mux.Router {

	router := mux.NewRouter().StrictSlash(true)
	router.
		Methods("GET").
		Path("/health-check").
		HandlerFunc(controllers.HealthcheckControllerHandle)
	router.
		Methods("POST").
		Path("/api/v1/upload-image").
		HandlerFunc(controllers.UploadImageControllerHandle)
	router.
		Methods("POST").
		Path("/api/v1/delete-image").
		HandlerFunc(controllers.DeleteImageControllerHandle)
	router.
		Methods("GET").
		Path("/api/v1/images").
		HandlerFunc(controllers.ListImagesControllerHandle)
	router.
		Methods("GET").
		Path("/api/v1/images/{image_uuid}").
		HandlerFunc(controllers.GetImageControllerHandle)
	router.
		PathPrefix("/cdn/").
		Handler(http.StripPrefix("/cdn/", http.FileServer(http.Dir("/app/storage/"))))
	router.
		Methods("GET").
		PathPrefix("/").
		HandlerFunc(controllers.MediaControllerHandle)

	return router
}

func corseHandler(handler http.Handler) http.HandlerFunc {
	return func(responseWriter http.ResponseWriter, webRequest *http.Request) {
		setHeaders(responseWriter)
		if webRequest.Method == "OPTIONS" {
			// Explicitly respond to CORS preflight so the connection is not
			// left open — a dangling connection causes HAProxy to return 404.
			responseWriter.WriteHeader(http.StatusNoContent)
			return
		}
		handler.ServeHTTP(responseWriter, webRequest)
	}
}

func setHeaders(responseWriter http.ResponseWriter) {
	responseWriter.Header().Set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Methods, Authorization")
	responseWriter.Header().Set("Access-Control-Allow-Origin", "*")
	responseWriter.Header().Set("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")
	responseWriter.Header().Set("Access-Control-Max-Age", "86400")
}
