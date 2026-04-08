package domainssl

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// Repository handles all domain_ssl persistence.
type Repository struct{}

func (r *Repository) openDB() (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		os.Getenv("DB_USERNAME"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_IDENTITY_DATABASE"),
	)
	return sql.Open("mysql", dsn)
}

// GetAllForProcessing returns every domain_ssl row that has a non-empty domain,
// ordered by expires ASC so the soonest-expiring certs are processed first.
func (r *Repository) GetAllForProcessing() ([]*DomainSsl, error) {
	db, err := r.openDB()
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	defer db.Close()

	rows, err := db.Query(`
		SELECT
			domain_ssl_id,
			COALESCE(whitelabel_id, 0),
			COALESCE(site_id, 0),
			domain,
			is_lets_encrypt,
			challenge_type,
			status,
			COALESCE(cert_pem, ''),
			COALESCE(fullchain_pem, ''),
			COALESCE(key_pem, ''),
			COALESCE(issuer, ''),
			COALESCE(serial_number, ''),
			not_before,
			expires,
			last_renewed_at,
			last_checked_at,
			COALESCE(last_error, '')
		FROM domain_ssl
		WHERE domain IS NOT NULL AND domain != ''
		ORDER BY expires ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	var results []*DomainSsl
	for rows.Next() {
		d := &DomainSsl{}
		if err := rows.Scan(
			&d.DomainSslId,
			&d.WhitelabelId,
			&d.SiteId,
			&d.Domain,
			&d.IsLetsEncrypt,
			&d.ChallengeType,
			&d.Status,
			&d.CertPem,
			&d.FullchainPem,
			&d.KeyPem,
			&d.Issuer,
			&d.SerialNumber,
			&d.NotBefore,
			&d.Expires,
			&d.LastRenewedAt,
			&d.LastCheckedAt,
			&d.LastError,
		); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		results = append(results, d)
	}
	return results, rows.Err()
}

// SaveCertificate persists a newly issued or renewed certificate.
func (r *Repository) SaveCertificate(
	id int,
	certPem, fullchainPem, keyPem string,
	expires time.Time,
	issuer, serialNumber string,
) error {
	db, err := r.openDB()
	if err != nil {
		return fmt.Errorf("open db: %w", err)
	}
	defer db.Close()

	_, err = db.Exec(`
		UPDATE domain_ssl
		SET
			cert_pem        = ?,
			fullchain_pem   = ?,
			key_pem         = ?,
			expires         = ?,
			issuer          = ?,
			serial_number   = ?,
			status          = 'active',
			last_error      = NULL,
			last_renewed_at = NOW(),
			last_checked_at = NOW(),
			is_lets_encrypt = 1
		WHERE domain_ssl_id = ?
	`, certPem, fullchainPem, keyPem, expires, issuer, serialNumber, id)
	return err
}

// MarkFailed records a failed issuance attempt.
func (r *Repository) MarkFailed(id int, errMsg string) error {
	db, err := r.openDB()
	if err != nil {
		return fmt.Errorf("open db: %w", err)
	}
	defer db.Close()

	_, err = db.Exec(`
		UPDATE domain_ssl
		SET
			status          = 'failed',
			last_error      = ?,
			last_checked_at = NOW()
		WHERE domain_ssl_id = ?
	`, errMsg, id)
	return err
}

// MarkChecked stamps last_checked_at without changing anything else.
func (r *Repository) MarkChecked(id int) error {
	db, err := r.openDB()
	if err != nil {
		return fmt.Errorf("open db: %w", err)
	}
	defer db.Close()

	_, err = db.Exec(`
		UPDATE domain_ssl
		SET last_checked_at = NOW()
		WHERE domain_ssl_id = ?
	`, id)
	return err
}

