// Package cert — expiry parsing helpers.
package cert

import (
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"time"
)

// ParseExpiry returns the NotAfter timestamp of the first certificate found in
// the supplied PEM bundle.  Returns an error if no valid certificate is present.
func ParseExpiry(certPem string) (time.Time, error) {
	block, _ := pem.Decode([]byte(certPem))
	if block == nil {
		return time.Time{}, fmt.Errorf("no PEM block found")
	}
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return time.Time{}, fmt.Errorf("x509 parse: %w", err)
	}
	return cert.NotAfter, nil
}

