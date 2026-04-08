package controllers

import (
	"archive/zip"
	"fmt"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/dtos"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

const ErrorNotAuthorized = "You are not authorized to make this request"

// GetAllActiveSslsControllerHandle handles GET /api/v1/ssls/get-all-active
//
// Auth:    Bearer token matched against OPERATOR_API_KEY env var.
// Result:  zip archive containing one file per domain, named <domain>,
//          with the certificate/key material as its contents.
func GetAllActiveSslsControllerHandle(responseWriter http.ResponseWriter, webRequest *http.Request) {

	// Auth: compare Authorization header against OPERATOR_API_KEY
	apiKey := os.Getenv("OPERATOR_API_KEY")
	if apiKey == "" {
		log.Println(ErrorNotAuthorized + ": OPERATOR_API_KEY is not configured")
		http.Error(responseWriter, ErrorNotAuthorized, http.StatusUnauthorized)
		return
	}
	authHeader := webRequest.Header.Get("Authorization")
	parts := strings.SplitN(authHeader, "Bearer ", 2)
	if len(parts) != 2 || strings.TrimSpace(parts[1]) != apiKey {
		log.Println(ErrorNotAuthorized + ": invalid bearer token")
		http.Error(responseWriter, ErrorNotAuthorized, http.StatusUnauthorized)
		return
	}

	// Fetch all active SSL records from dynlit_identity
	sslStore := dtos.DomainSsls{}
	sslData, err := sslStore.GetAll()
	if err != nil {
		log.Println("SSL database query failed: " + err.Error())
		http.Error(responseWriter, "Failed to retrieve SSL data", http.StatusInternalServerError)
		return
	}
	if len(sslData) == 0 {
		http.Error(responseWriter, "No SSL certificates found", http.StatusNotFound)
		return
	}

	// Write each certificate to an isolated per-request temp directory.
	// os.MkdirTemp gives every concurrent request its own scratch space,
	// eliminating races when multiple containers call this endpoint at startup.
	tempDir, mkErr := os.MkdirTemp("", "ssls-*")
	if mkErr != nil {
		log.Println("Failed to create SSL temp dir: " + mkErr.Error())
		http.Error(responseWriter, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer os.RemoveAll(tempDir) // always clean up, even on early return
	tempDir += "/"

	for _, ssl := range sslData {
		if ssl.Domain == "" || ssl.FullchainPem == "" || ssl.KeyPem == "" {
			continue
		}
		// Write {domain}.crt — full-chain PEM, read by NGINX Lua ssl_certificate_by_lua_block
		if writeErr := os.WriteFile(tempDir+ssl.Domain+".crt", []byte(ssl.FullchainPem), 0644); writeErr != nil {
			log.Println("Failed to write cert for domain " + ssl.Domain + ": " + writeErr.Error())
		}
		// Write {domain}.key — private key PEM
		if writeErr := os.WriteFile(tempDir+ssl.Domain+".key", []byte(ssl.KeyPem), 0644); writeErr != nil {
			log.Println("Failed to write key for domain " + ssl.Domain + ": " + writeErr.Error())
		}
	}

	// Build zip archive into a unique temp file.
	zipFile, createErr := os.CreateTemp("", "ssl-zip-*.zip")
	if createErr != nil {
		log.Println("Failed to create zip temp file: " + createErr.Error())
		http.Error(responseWriter, "Internal server error", http.StatusInternalServerError)
		return
	}
	zipPath := zipFile.Name()
	defer os.Remove(zipPath) // always clean up

	zipWriter := zip.NewWriter(zipFile)
	entries, readDirErr := os.ReadDir(tempDir)
	if readDirErr != nil {
		zipWriter.Close()
		zipFile.Close()
		log.Println("Failed to read SSL temp dir: " + readDirErr.Error())
		http.Error(responseWriter, "Internal server error", http.StatusInternalServerError)
		return
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		data, readErr := os.ReadFile(tempDir + entry.Name())
		if readErr != nil {
			log.Println("Skipping unreadable SSL file: " + entry.Name())
			continue
		}
		w, zipErr := zipWriter.Create(entry.Name())
		if zipErr != nil {
			log.Println("Failed to add " + entry.Name() + " to zip: " + zipErr.Error())
			continue
		}
		w.Write(data)
	}
	zipWriter.Close()
	zipFile.Close()

	// Stream the zip to the client.
	zipStat, statErr := os.Stat(zipPath)
	if statErr != nil {
		log.Println("Failed to stat zip file: " + statErr.Error())
		http.Error(responseWriter, "Internal server error", http.StatusInternalServerError)
		return
	}
	readFile, openErr := os.Open(zipPath)
	if openErr != nil {
		log.Println("Failed to open zip for serving: " + openErr.Error())
		http.Error(responseWriter, "Internal server error", http.StatusInternalServerError)
		return
	}
	defer readFile.Close()

	responseWriter.Header().Set("Content-Type", "application/zip")
	responseWriter.Header().Set("Content-Disposition", "attachment; filename=ssl_certificates.zip")
	responseWriter.Header().Set("Content-Length", fmt.Sprintf("%d", zipStat.Size()))
	io.Copy(responseWriter, readFile)
	// deferred os.RemoveAll(tempDir) and os.Remove(zipPath) handle cleanup
}
