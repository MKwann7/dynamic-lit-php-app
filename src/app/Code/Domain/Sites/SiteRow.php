<?php

namespace Code\Domain\Sites;

/**
 * Class SiteRow
 *
 * Lightweight database row struct for the `site` table.
 *
 * @property int|null $site_id
 * @property int|null $owner_id
 * @property int|null $site_user_id
 * @property int|null $whitelabel_id
 * @property int|null $site_version_id
 * @property int|null $site_type_id
 * @property string|null $site_name
 * @property string|null $domain
 * @property bool|null $has_domain_ssl
 * @property string|null $status
 * @property bool|null $is_template
 * @property int|null $template_id
 * @property string|null $json_data
 * @property string|null $vanity_url
 * @property int|null $site_num
 * @property int|null $redirect_to
 * @property string|null $created_on
 * @property int|null $created_by
 * @property string|null $last_updated
 * @property int|null $updated_by
 * @property string|null $sys_row_id
 */
class SiteRow
{
    public ?int $site_id = null;
    public ?int $owner_id = null;
    public ?int $site_user_id = null;
    public ?int $whitelabel_id = null;
    public ?int $site_version_id = null;
    public ?int $site_type_id = null;
    public ?string $site_name = null;
    public ?string $domain = null;
    public ?bool $has_domain_ssl = null;
    public ?string $status = null;
    public ?bool $is_template = null;
    public ?int $template_id = null;
    public ?string $json_data = null;
    public ?string $vanity_url = null;
    public ?int $site_num = null;
    public ?int $redirect_to = null;
    public ?string $created_on = null;
    public ?string $avatar_url = null;
    public ?int $created_by = null;
    public ?string $last_updated = null;
    public ?int $updated_by = null;
    public ?string $sys_row_id = null;

    /**
     * @param array<string, mixed> $row
     */
    public static function fromArray(array $row): self
    {
        $site = new self();

        $site->site_id         = isset($row['site_id'])         ? (int)$row['site_id']         : null;
        $site->owner_id        = isset($row['owner_id'])        ? (int)$row['owner_id']        : null;
        $site->site_user_id    = isset($row['site_user_id'])    ? (int)$row['site_user_id']    : null;
        $site->whitelabel_id   = isset($row['whitelabel_id'])   ? (int)$row['whitelabel_id']   : null;
        $site->site_version_id = isset($row['site_version_id']) ? (int)$row['site_version_id'] : null;
        $site->site_type_id    = isset($row['site_type_id'])    ? (int)$row['site_type_id']    : null;
        $site->site_name       = array_key_exists('site_name', $row)       ? (string)$row['site_name']       : null;
        $site->domain          = array_key_exists('domain', $row)          ? (string)$row['domain']          : null;
        $site->has_domain_ssl  = isset($row['has_domain_ssl'])  ? (bool)$row['has_domain_ssl']  : null;
        $site->status          = array_key_exists('status', $row)          ? (string)$row['status']          : null;
        $site->is_template     = isset($row['is_template'])     ? (bool)$row['is_template']     : null;
        $site->template_id     = isset($row['template_id'])     ? (int)$row['template_id']     : null;
        $site->json_data       = array_key_exists('json_data', $row)       ? (string)$row['json_data']       : null;
        $site->vanity_url = array_key_exists('vanity_url', $row) ? (string)$row['vanity_url'] : null;
        $site->site_num        = isset($row['site_num'])        ? (int)$row['site_num']        : null;
        $site->redirect_to     = isset($row['redirect_to'])     ? (int)$row['redirect_to']     : null;
        $site->created_on      = array_key_exists('created_on', $row)      ? (string)$row['created_on']      : null;
        $site->created_by      = isset($row['created_by'])      ? (int)$row['created_by']      : null;
        $site->last_updated    = array_key_exists('last_updated', $row)    ? (string)$row['last_updated']    : null;
        $site->updated_by      = isset($row['updated_by'])      ? (int)$row['updated_by']      : null;
        $site->sys_row_id      = array_key_exists('sys_row_id', $row)      ? (string)$row['sys_row_id']      : null;

        return $site;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'site_id'         => $this->site_id,
            'owner_id'        => $this->owner_id,
            'site_user_id'    => $this->site_user_id,
            'whitelabel_id'   => $this->whitelabel_id,
            'site_version_id' => $this->site_version_id,
            'site_type_id'    => $this->site_type_id,
            'site_name'       => $this->site_name,
            'domain'          => $this->domain,
            'has_domain_ssl'  => $this->has_domain_ssl,
            'status'          => $this->status,
            'is_template'     => $this->is_template,
            'template_id'     => $this->template_id,
            'json_data'       => $this->json_data,
            'vanity_url' => $this->vanity_url,
            'site_num'        => $this->site_num,
            'redirect_to'     => $this->redirect_to,
            'created_on'      => $this->created_on,
            'created_by'      => $this->created_by,
            'last_updated'    => $this->last_updated,
            'updated_by'      => $this->updated_by,
            'sys_row_id'      => $this->sys_row_id,
        ];
    }

    /**
     * Full detail projection for the site dashboard / profile-manage API.
     * Maps DB columns to the field names expected by the frontend components.
     *
     * @return array<string, mixed>
     */
    public function toDetailApiArray(): array
    {
        return [
            'uuid'        => $this->sys_row_id,
            'site_num'    => $this->site_num,
            'site_name'   => $this->site_name,
            'domain'      => $this->domain,
            'vanity_url'  => $this->vanity_url,
            'template_id' => $this->template_id,
            'template'    => null,   // populated via JOIN when available
            'status'      => $this->status,
            'is_template' => $this->is_template,
            'owner_id'    => $this->owner_id,
            'owner_name'  => null,   // populated via JOIN when available
            'banner_url'  => null,   // populated via theme JOIN when available
            'logo_url'    => null,
            'favicon_url' => null,
            'created_at'  => $this->created_on,
            'updated_at'  => $this->last_updated,
        ];
    }

    /**
     * Projection for the sites list API.
     *
     * @return array<string, mixed>
     */
    public function toListApiArray(): array
    {
        return [
            'uuid'       => $this->sys_row_id,
            'site_num'   => $this->site_num,
            'site_name'  => $this->site_name,
            'vanity_url' => $this->vanity_url,
            'status'     => $this->status,
            'created_at' => $this->created_on,
            'updated_at' => $this->last_updated,
            // Require additional JOINs — stubbed until implemented
            'platform'   => null,
            'owner_name' => null,
            'product'    => null,
            'banner_url' => null,
        ];
    }
}