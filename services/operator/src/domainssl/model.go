package domainssl

import "time"

// DomainSsl mirrors the domain_ssl table in dynlit_identity.
// All pointer fields map to nullable DB columns.
type DomainSsl struct {
	DomainSslId   int
	WhitelabelId  int
	SiteId        int
	Domain        string
	IsLetsEncrypt bool
	ChallengeType string
	Status        string // pending | active | failed | expired
	CertPem       string
	FullchainPem  string
	KeyPem        string
	Issuer        string
	SerialNumber  string
	NotBefore     *time.Time
	Expires       *time.Time
	LastRenewedAt *time.Time
	LastCheckedAt *time.Time
	LastError     string
}

// NeedsIssuance returns true when the domain has no stored certificate at all.
func (d *DomainSsl) NeedsIssuance() bool {
	return d.FullchainPem == "" || d.KeyPem == ""
}

// NeedsRenewal returns true when the cert will expire within the 30-day renewal
// window, or when the expiry timestamp is unknown.
// A domain that NeedsIssuance() is NOT considered to need renewal — issue it first.
func (d *DomainSsl) NeedsRenewal() bool {
	if d.NeedsIssuance() {
		return false
	}
	if d.Expires == nil {
		return true
	}
	return time.Until(*d.Expires) < 30*24*time.Hour
}

