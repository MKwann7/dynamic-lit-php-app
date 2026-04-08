// Package cert handles writing TLS certificate material to disk.
package cert

import (
	"fmt"
	"os"
	"path/filepath"
)

// Write atomically writes the full-chain certificate and private key for
// domain to sslDir.
//
// Output files:
//
//	{sslDir}/{domain}.crt   — full-chain PEM  (0644)
//	{sslDir}/{domain}.key   — private key PEM (0600)
//
// Atomicity is guaranteed by:
//  1. Writing to a temp file in the same directory
//  2. fsync'ing the temp file
//  3. Renaming to the final path (atomic on POSIX systems)
//
// This prevents NGINX from ever reading a partial file during a TLS handshake.
func Write(sslDir, domain, fullchainPem, keyPem string) error {
	if err := os.MkdirAll(sslDir, 0755); err != nil {
		return fmt.Errorf("create ssl dir %q: %w", sslDir, err)
	}

	certPath := filepath.Join(sslDir, domain+".crt")
	keyPath := filepath.Join(sslDir, domain+".key")

	if err := atomicWrite(certPath, []byte(fullchainPem), 0644); err != nil {
		return fmt.Errorf("write cert for %s: %w", domain, err)
	}
	if err := atomicWrite(keyPath, []byte(keyPem), 0600); err != nil {
		return fmt.Errorf("write key for %s: %w", domain, err)
	}
	return nil
}

// atomicWrite writes data to a temp file, syncs, then renames to path.
func atomicWrite(path string, data []byte, perm os.FileMode) error {
	dir := filepath.Dir(path)

	tmp, err := os.CreateTemp(dir, ".ssl-tmp-*")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmp.Name()

	// Always remove the temp file on any failure path.
	ok := false
	defer func() {
		if !ok {
			os.Remove(tmpPath)
		}
	}()

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return fmt.Errorf("write temp file: %w", err)
	}

	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return fmt.Errorf("fsync temp file: %w", err)
	}

	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close temp file: %w", err)
	}

	if err := os.Chmod(tmpPath, perm); err != nil {
		return fmt.Errorf("chmod temp file: %w", err)
	}

	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("rename to final path: %w", err)
	}

	ok = true
	return nil
}

