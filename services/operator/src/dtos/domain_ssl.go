package dtos

import (
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/db"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/libraries/helper"
)

// DomainSsl mirrors the relevant columns of the domain_ssl table.
// Each row represents one domain. The operator writes two files from it:
//   {Domain}.crt  ← FullchainPem  (certificate + intermediates, used by NGINX)
//   {Domain}.key  ← KeyPem        (private key)
type DomainSsl struct {
	DomainSslId  int    `field:"domain_ssl_id"`
	WhitelabelId int    `field:"whitelabel_id"`
	SiteId       int    `field:"site_id"`
	Domain       string `field:"domain"`
	FullchainPem string `field:"fullchain_pem"`
	KeyPem       string `field:"key_pem"`
}

type DomainSsls struct{}

// GetAll returns every active domain_ssl row that has both a fullchain_pem and key_pem.
func (d *DomainSsls) GetAll() ([]*DomainSsl, error) {
	var conn db.Connection
	connection := conn.GetIdentity("domain_ssl", "domain_ssl_id", "")

	rows, err := db.MysqlGetWhere(
		connection,
		"domain IS NOT NULL AND fullchain_pem IS NOT NULL AND key_pem IS NOT NULL",
		"ASC",
		0,
	)
	if err != nil {
		return nil, err
	}

	var result []*DomainSsl
	for _, row := range rows {
		ssl := &DomainSsl{
			DomainSslId:  helper.CastAsNullableInt(row["domain_ssl_id"]),
			WhitelabelId: helper.CastAsNullableInt(row["whitelabel_id"]),
			SiteId:       helper.CastAsNullableInt(row["site_id"]),
			Domain:       helper.CastAsNullableString(row["domain"]),
			FullchainPem: helper.CastAsNullableString(row["fullchain_pem"]),
			KeyPem:       helper.CastAsNullableString(row["key_pem"]),
		}
		result = append(result, ssl)
	}

	return result, nil
}
