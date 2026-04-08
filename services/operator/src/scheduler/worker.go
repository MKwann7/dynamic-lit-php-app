// Package scheduler runs the background certificate renewal loop.
//
// Design philosophy — "the quiet gardener":
//   - Renew only when necessary (cert expiring in <30 days, missing, or failed)
//   - Never re-issue a healthy cert
//   - Retry failed domains on the next cycle (no immediate re-attempt)
//   - Process domains sequentially to avoid port 8099 contention during HTTP-01
package scheduler

import (
	"log"
	"os"
	"time"

	"github.com/MKwann7/zgEXCELL-3-Media/app/media/acme"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/cert"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/domainssl"
)

const (
	workerInterval    = 6 * time.Hour
	defaultSSLDir     = "/app/ssl"
	defaultAccountKey = "/app/ssl/acme-account.key"
)

// StartRenewalWorker launches the certificate renewal loop in a background
// goroutine.  It runs one cycle immediately on startup, then repeats every 6 h.
func StartRenewalWorker() {
	go func() {
		log.Println("[ACME] Renewal worker started")
		runCycle()

		ticker := time.NewTicker(workerInterval)
		defer ticker.Stop()
		for range ticker.C {
			runCycle()
		}
	}()
}

// runCycle performs one full pass over all domains in domain_ssl.
func runCycle() {
	log.Println("[ACME] Starting certificate renewal cycle")

	email := os.Getenv("ACME_EMAIL")
	if email == "" {
		log.Println("[ACME] ACME_EMAIL is not set — skipping cycle")
		return
	}

	staging := os.Getenv("ACME_STAGING") != "false" // default: staging=true for safety
	keyPath := envOr("ACME_ACCOUNT_KEY_PATH", defaultAccountKey)
	sslDir := envOr("SSL_DIR", defaultSSLDir)

	repo := &domainssl.Repository{}
	domains, err := repo.GetAllForProcessing()
	if err != nil {
		log.Printf("[ACME] Failed to load domains from DB: %v", err)
		return
	}

	if len(domains) == 0 {
		log.Println("[ACME] No domains found in domain_ssl, nothing to do")
		return
	}

	svc := acme.NewService(email, staging, keyPath)

	processed, skipped, failed := 0, 0, 0
	for _, d := range domains {
		result := processDomain(svc, repo, d, sslDir)
		switch result {
		case "processed":
			processed++
		case "skipped":
			skipped++
		case "failed":
			failed++
		}
	}

	log.Printf("[ACME] Cycle complete — processed=%d skipped=%d failed=%d",
		processed, skipped, failed)
}

// processDomain decides whether action is needed for a single domain and acts.
// Returns "processed", "skipped", or "failed".
func processDomain(
	svc *acme.Service,
	repo *domainssl.Repository,
	d *domainssl.DomainSsl,
	sslDir string,
) string {
	if d.Domain == "" {
		return "skipped"
	}

	// Manual certs (is_lets_encrypt = false) are managed entirely by the user.
	// The ACME worker must not overwrite or attempt to renew them — but it must
	// still write the PEM material to disk so NGINX can find the files on startup.
	if !d.IsLetsEncrypt {
		_ = repo.MarkChecked(d.DomainSslId)
		if d.FullchainPem != "" && d.KeyPem != "" {
			if writeErr := cert.Write(sslDir, d.Domain, d.FullchainPem, d.KeyPem); writeErr != nil {
				log.Printf("[ACME] %s: disk write failed for manual cert: %v", d.Domain, writeErr)
				return "failed"
			}
			log.Printf("[ACME] %s: manual cert written to disk (is_lets_encrypt=false, skipping ACME)", d.Domain)
		} else {
			log.Printf("[ACME] %s: manual cert has no PEM material yet, skipping", d.Domain)
		}
		return "skipped"
	}

	// --- Decide action ---
	var reason string
	switch {
	case d.NeedsIssuance():
		reason = "no certificate exists"
	case d.Status == "failed":
		reason = "retrying after previous failure"
	case d.NeedsRenewal():
		if d.Expires != nil {
			reason = "expires " + d.Expires.Format(time.RFC3339)
		} else {
			reason = "unknown expiry"
		}
	default:
		// Healthy cert — stamp last_checked_at and move on.
		_ = repo.MarkChecked(d.DomainSslId)
		log.Printf("[ACME] %s: healthy (expires %s), skipping",
			d.Domain, expiresStr(d.Expires))
		return "skipped"
	}

	log.Printf("[ACME] %s: issuing/renewing — reason: %s", d.Domain, reason)

	// --- Issue certificate ---
	result, err := svc.IssueCert(d.Domain)
	if err != nil {
		log.Printf("[ACME] %s: issuance failed: %v", d.Domain, err)
		if markErr := repo.MarkFailed(d.DomainSslId, err.Error()); markErr != nil {
			log.Printf("[ACME] %s: could not mark failed in DB: %v", d.Domain, markErr)
		}
		return "failed"
	}

	// --- Write files atomically ---
	if writeErr := cert.Write(sslDir, d.Domain, result.FullchainPem, result.KeyPem); writeErr != nil {
		log.Printf("[ACME] %s: disk write failed: %v", d.Domain, writeErr)
		if markErr := repo.MarkFailed(d.DomainSslId, writeErr.Error()); markErr != nil {
			log.Printf("[ACME] %s: could not mark failed in DB: %v", d.Domain, markErr)
		}
		return "failed"
	}

	// --- Persist to DB ---
	if saveErr := repo.SaveCertificate(
		d.DomainSslId,
		result.CertPem,
		result.FullchainPem,
		result.KeyPem,
		result.Expires,
		result.Issuer,
		result.SerialNumber,
	); saveErr != nil {
		log.Printf("[ACME] %s: DB save failed: %v", d.Domain, saveErr)
		return "failed"
	}

	log.Printf("[ACME] %s: certificate issued successfully, expires %s",
		d.Domain, result.Expires.Format(time.RFC3339))
	return "processed"
}

func expiresStr(t *time.Time) string {
	if t == nil {
		return "unknown"
	}
	return t.Format(time.RFC3339)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

