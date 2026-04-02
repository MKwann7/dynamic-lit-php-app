package auth

import (
	"errors"
	"github.com/MKwann7/zgEXCELL-3-Media/app/media/dtos"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"os"
	"strings"
)

// jwtUserClaim mirrors the data.user object in the PHP-issued JWT payload.
type jwtUserClaim struct {
	UserId int    `json:"user_id"`
	Email  string `json:"email"`
	Status string `json:"status"`
}

type jwtDataClaim struct {
	User        *jwtUserClaim `json:"user"`
	Permissions []string      `json:"permissions"`
}

// mediaClaims is the full JWT payload structure used by the PHP app.
type mediaClaims struct {
	TokenType string        `json:"token_type"`
	Data      *jwtDataClaim `json:"data"`
	jwt.RegisteredClaims
}

// AuthorizeRequest validates the Bearer JWT, rejects session tokens, and
// returns the database user record for the authenticated user.
// Also returns the token_type ("user" or "admin") for callers that need it.
func AuthorizeRequest(webRequest *http.Request) (*dtos.User, string, error) {
	authHeader := webRequest.Header.Get("Authorization")

	parts := strings.SplitN(authHeader, "Bearer ", 2)
	if len(parts) != 2 {
		return nil, "", errors.New("authorization token malformed")
	}

	tokenStr := strings.TrimSpace(parts[1])
	if len(tokenStr) < 1 {
		return nil, "", errors.New("authorization token malformed")
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, "", errors.New("JWT_SECRET not configured")
	}

	claims := &mediaClaims{}
	parsedToken, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil || !parsedToken.Valid {
		return nil, "", errors.New("invalid or expired token")
	}

	if claims.TokenType != "user" && claims.TokenType != "admin" {
		return nil, "", errors.New("token type not authorized for media operations")
	}

	if claims.Data == nil || claims.Data.User == nil {
		return nil, "", errors.New("token missing user data")
	}

	userId := claims.Data.User.UserId
	if userId <= 0 {
		return nil, "", errors.New("invalid user_id in token")
	}

	users := dtos.Users{}
	user, err := users.GetById(userId)
	if err != nil {
		return nil, "", errors.New("user lookup failed: " + err.Error())
	}

	return user, claims.TokenType, nil
}
