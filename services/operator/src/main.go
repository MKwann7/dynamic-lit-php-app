package main

import (
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/controllers"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/scheduler"
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

	// Start the background ACME certificate renewal worker.
	// The worker runs its first cycle immediately, then every 6 hours.
	// lego's HTTP-01 challenge server binds :8099 only during active challenges;
	// NGINX proxies /.well-known/acme-challenge/* → http://127.0.0.1:8099.
	scheduler.StartRenewalWorker()

	router := router()
	middleware := negroni.Classic()
	middleware.UseHandler(router)

	// Start HTTP server
	log.Println("HTTP server started on (" + os.Getenv("PORT_NUM_OPERATOR") + ")")
	log.Fatal(http.ListenAndServe(":"+os.Getenv("PORT_NUM_OPERATOR"), corseHandler(middleware)))
}

func router() *mux.Router {

	router := mux.NewRouter().StrictSlash(true)
	router.
		Methods("GET").
		Path("/health-check").
		HandlerFunc(controllers.HealthcheckControllerHandle)

	router.
		Methods("GET").
		Path("/api/v1/ssls/get-all-active").
		HandlerFunc(controllers.GetAllActiveSslsControllerHandle)

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
