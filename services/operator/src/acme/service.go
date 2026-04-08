// Package acme wraps the lego ACME client and exposes a simple IssueCert call.
package acme

import (
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"time"

	"github.com/go-acme/lego/v4/certificate"
	"github.com/go-acme/lego/v4/certcrypto"
	"github.com/go-acme/lego/v4/challenge/http01"
	"github.com/go-acme/lego/v4/lego"
	"github.com/go-acme/lego/v4/registration"
)

// CertResult holds the PEM-encoded certificate material returned after a
// successful ACME order.
type CertResult struct {
	// CertPem is the leaf certificate only.
	CertPem string
	// FullchainPem is the leaf + intermediate chain (use this for NGINX).
	FullchainPem string
	// KeyPem is the RSA 2048 private key for the certificate.
	KeyPem       string
	Expires      time.Time
	Issuer       string
	SerialNumber string
}

// Service is a thin wrapper around lego that issues and renews certificates.
// A single Service instance should be created per renewal cycle; it is NOT
// safe for concurrent use across goroutines.
type Service struct {
	email   string
	staging bool
	keyPath string // path to the persisted ACME account private key
}

// NewService constructs an ACME Service.
//
//   - email    — contact address registered with Let's Encrypt
//   - staging  — when true, use the ACME staging directory (no rate limits)
//   - keyPath  — file path where the account key is persisted (e.g. /app/ssl/acme-account.key)
func NewService(email string, staging bool, keyPath string) *Service {
	return &Service{email: email, staging: staging, keyPath: keyPath}
}

// IssueCert obtains a new certificate for domain via HTTP-01 challenge.
// The challenge is served by lego's built-in HTTP server on :8099, which
// NGINX must proxy for /.well-known/acme-challenge/* → http://127.0.0.1:8099.
func (s *Service) IssueCert(domain string) (*CertResult, error) {
	privateKey, err := LoadOrCreateAccountKey(s.keyPath)
	if err != nil {
		return nil, fmt.Errorf("account key: %w", err)
	}

	user := &ACMEUser{Email: s.email, key: privateKey}

	config := lego.NewConfig(user)
	config.Certificate.KeyType = certcrypto.RSA2048
	if s.staging {
		config.CADirURL = lego.LEDirectoryStaging
	} else {
		config.CADirURL = lego.LEDirectoryProduction
	}

	client, err := lego.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("lego client: %w", err)
	}

	// HTTP-01 challenge server on port 8099.
	// lego binds this port only during the challenge window (Present → CleanUp).
	if err := client.Challenge.SetHTTP01Provider(
		http01.NewProviderServer("", "8099"),
	); err != nil {
		return nil, fmt.Errorf("set http01 provider: %w", err)
	}

	// Register or recover the account.  lego caches the registration inside
	// the user struct, so passing the same key always hits the same account.
	reg, err := client.Registration.Register(registration.RegisterOptions{
		TermsOfServiceAgreed: true,
	})
	if err != nil {
		return nil, fmt.Errorf("acme registration: %w", err)
	}
	user.Registration = reg

	certs, err := client.Certificate.Obtain(certificate.ObtainRequest{
		Domains: []string{domain},
		Bundle:  true, // include the full chain in Certificate field
	})
	if err != nil {
		return nil, fmt.Errorf("obtain certificate: %w", err)
	}

	expires, issuer, serial, err := parseCertMeta(certs.Certificate)
	if err != nil {
		return nil, fmt.Errorf("parse certificate: %w", err)
	}

	return &CertResult{
		CertPem:      string(certs.Certificate),
		FullchainPem: string(certs.Certificate), // Bundle=true → already full chain
		KeyPem:       string(certs.PrivateKey),
		Expires:      expires,
		Issuer:       issuer,
		SerialNumber: serial,
	}, nil
}

// parseCertMeta extracts NotAfter, Issuer CN, and serial number from the first
// PEM block in the supplied bundle.
func parseCertMeta(certPEM []byte) (expires time.Time, issuer, serial string, err error) {
	block, _ := pem.Decode(certPEM)
	if block == nil {
		return time.Time{}, "", "", fmt.Errorf("no PEM block found in certificate")
	}
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return time.Time{}, "", "", fmt.Errorf("x509 parse: %w", err)
	}
	return cert.NotAfter, cert.Issuer.CommonName, cert.SerialNumber.String(), nil
}

