<?php

namespace Code\Domain\Users;

/**
 * Class UserRow
 *
 * Lightweight database row struct for the `user` table.
 *
 * @property int|null $user_id
 * @property int|null $whitelabel_id
 * @property string|null $first_name
 * @property string|null $last_name
 * @property string|null $email
 * @property string|null $username
 * @property string|null $password
 * @property string|null $status
 * @property string|null $avatar_url
 * @property string|null $created_on
 * @property int|null $created_by
 * @property string|null $last_updated
 * @property int|null $updated_by
 * @property string|null $sys_row_id
 */
class UserRow
{
    public ?int $user_id = null;
    public ?int $whitelabel_id = null;
    public ?string $first_name = null;
    public ?string $last_name = null;
    public ?string $email = null;
    public ?string $username = null;
    public ?string $password = null;
    public ?string $status = null;
    public ?string $avatar_url = null;
    public ?string $created_on = null;
    public ?int $created_by = null;
    public ?string $last_updated = null;
    public ?int $updated_by = null;
    public ?string $sys_row_id = null;

    /**
     * @param array<string, mixed> $row
     */
    public static function fromArray(array $row): self
    {
        $user = new self();

        $user->user_id = isset($row['user_id']) ? (int)$row['user_id'] : null;
        $user->whitelabel_id = isset($row['whitelabel_id']) ? (int)$row['whitelabel_id'] : null;
        $user->first_name = array_key_exists('first_name', $row) ? (string)$row['first_name'] : null;
        $user->last_name = array_key_exists('last_name', $row) ? (string)$row['last_name'] : null;
        $user->email = array_key_exists('email', $row) ? (string)$row['email'] : null;
        $user->username = array_key_exists('username', $row) ? (string)$row['username'] : null;
        $user->password = array_key_exists('password', $row) ? (string)$row['password'] : null;
        $user->status = array_key_exists('status', $row) ? (string)$row['status'] : null;
        $user->avatar_url = array_key_exists('avatar_url', $row) ? (string)$row['avatar_url'] : null;
        $user->created_on = array_key_exists('created_on', $row) ? (string)$row['created_on'] : null;
        $user->created_by = isset($row['created_by']) ? (int)$row['created_by'] : null;
        $user->last_updated = array_key_exists('last_updated', $row) ? (string)$row['last_updated'] : null;
        $user->updated_by = isset($row['updated_by']) ? (int)$row['updated_by'] : null;
        $user->sys_row_id = array_key_exists('sys_row_id', $row) ? (string)$row['sys_row_id'] : null;

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'user_id' => $this->user_id,
            'whitelabel_id' => $this->whitelabel_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'username' => $this->username,
            'password' => $this->password,
            'status' => $this->status,
            'created_on' => $this->created_on,
            'created_by' => $this->created_by,
            'last_updated' => $this->last_updated,
            'updated_by' => $this->updated_by,
            'sys_row_id' => $this->sys_row_id,
        ];
    }

    /**
     * Projection for the users list API.
     * Password is intentionally omitted.
     *
     * @return array<string, mixed>
     */
    public function toListApiArray(): array
    {
        return [
            'uuid'       => $this->sys_row_id,
            'first_name' => $this->first_name,
            'last_name'  => $this->last_name,
            'email'      => $this->email,
            'username'   => $this->username,
            'status'     => $this->status,
            'created_at' => $this->created_on,
            'updated_at' => $this->last_updated,
        ];
    }

    /**
     * Full detail projection for the user dashboard / profile API.
     * Password is intentionally omitted.
     *
     * @return array<string, mixed>
     */
    public function toDetailApiArray(): array
    {
        return [
            'uuid'          => $this->sys_row_id,
            'whitelabel_id' => $this->whitelabel_id,
            'first_name'    => $this->first_name,
            'last_name'     => $this->last_name,
            'email'         => $this->email,
            'username'      => $this->username,
            'status'        => $this->status,
            'avatar_url'    => $this->avatar_url,
            'created_at'    => $this->created_on,
            'updated_at'    => $this->last_updated,
        ];
    }
}