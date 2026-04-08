// Package acme handles ACME account lifecycle.
// The account's ECDSA P-256 private key is persisted to disk so that the same
// ACME account is reused across restarts, preventing Let's Encrypt rate-limit
// exhaustion caused by registering a fresh account on every run.
package acme

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
	"path/filepath"

	"github.com/go-acme/lego/v4/registration"
)

// ACMEUser implements registration.User so it can be passed directly to the
// lego client.
type ACMEUser struct {
	Email        string
	Registration *registration.Resource
	key          crypto.PrivateKey
}

func (u *ACMEUser) GetEmail() string                        { return u.Email }
func (u *ACMEUser) GetRegistration() *registration.Resource { return u.Registration }
func (u *ACMEUser) GetPrivateKey() crypto.PrivateKey        { return u.key }

// LoadOrCreateAccountKey reads an ECDSA P-256 private key from path.
// If the file does not exist, a new key is generated and written (mode 0600).
// The parent directory is created if necessary.
func LoadOrCreateAccountKey(path string) (crypto.PrivateKey, error) {
	data, err := os.ReadFile(path)
	if err == nil {
		// File exists — try to parse it.
		block, _ := pem.Decode(data)
		if block != nil {
			key, parseErr := x509.ParseECPrivateKey(block.Bytes)
			if parseErr == nil {
				return key, nil
			}
		}
		return nil, fmt.Errorf("account key file at %q is present but unreadable — delete it to regenerate", path)
	}

	// No file yet — generate fresh key.
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("generate account key: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, fmt.Errorf("create ssl dir: %w", err)
	}

	keyBytes, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		return nil, fmt.Errorf("marshal account key: %w", err)
	}

	pemData := pem.EncodeToMemory(&pem.Block{
		Type:  "EC PRIVATE KEY",
		Bytes: keyBytes,
	})

	if err := os.WriteFile(path, pemData, 0600); err != nil {
		return nil, fmt.Errorf("save account key: %w", err)
	}

	return key, nil
}

