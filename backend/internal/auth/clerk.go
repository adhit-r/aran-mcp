package auth

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

// jwksCache holds a simple in-memory cache of JWKS keys
type jwksCache struct {
	mu      sync.RWMutex
	keys    map[string]*rsa.PublicKey
	fetched time.Time
	jwksURL string
	ttl     time.Duration
}

func newJwksCache(jwksURL string, ttl time.Duration) *jwksCache {
	return &jwksCache{
		keys:    make(map[string]*rsa.PublicKey),
		jwksURL: jwksURL,
		ttl:     ttl,
	}
}

// fetch JWKS and populate cache
func (c *jwksCache) fetch() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.jwksURL == "" {
		return errors.New("jwks url not configured")
	}

	resp, err := http.Get(c.jwksURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var data struct {
		Keys []map[string]interface{} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return err
	}

	keys := make(map[string]*rsa.PublicKey)
	for _, k := range data.Keys {
		kid, _ := k["kid"].(string)
		kty, _ := k["kty"].(string)
		if kid == "" || kty != "RSA" {
			continue
		}

		// Parse modulus (n) and exponent (e) from JWK
		nStr, _ := k["n"].(string)
		eStr, _ := k["e"].(string)
		if nStr == "" || eStr == "" {
			continue
		}

		nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
		if err != nil {
			// try StdEncoding just in case
			nBytes, err = base64.StdEncoding.DecodeString(nStr)
			if err != nil {
				continue
			}
		}

		eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
		if err != nil {
			eBytes, err = base64.StdEncoding.DecodeString(eStr)
			if err != nil {
				continue
			}
		}

		n := new(big.Int).SetBytes(nBytes)
		// Convert exponent bytes to int
		e := 0
		for _, b := range eBytes {
			e = e<<8 + int(b)
		}

		pub := &rsa.PublicKey{N: n, E: e}
		keys[kid] = pub
	}

	c.keys = keys
	c.fetched = time.Now()
	return nil
}

// ClerkMiddleware returns a Gin middleware that validates Clerk JWTs.
// It expects an Authorization: Bearer <token> header.
func ClerkMiddleware(jwksURL, expectedIssuer, expectedAudience string, logger *zap.Logger) gin.HandlerFunc {
	cache := newJwksCache(jwksURL, 5*time.Minute)

	return func(c *gin.Context) {
		// Skip public endpoints
		if c.Request.Method == "OPTIONS" || c.Request.URL.Path == "/health" || strings.HasPrefix(c.Request.URL.Path, "/api/v1/auth/") {
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		tokenStr := parts[1]

		// Ensure JWKS fetched
		if time.Since(cache.fetched) > cache.ttl || len(cache.keys) == 0 {
			if err := cache.fetch(); err != nil {
				logger.Error("failed to fetch JWKS", zap.Error(err))
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate token"})
				c.Abort()
				return
			}
		}

		// Keyfunc uses the token header's kid to select the correct public key
		keyFunc := func(token *jwt.Token) (interface{}, error) {
			kidVal, ok := token.Header["kid"].(string)
			if !ok || kidVal == "" {
				return nil, errors.New("token kid missing")
			}

			cache.mu.RLock()
			pk := cache.keys[kidVal]
			cache.mu.RUnlock()

			if pk == nil {
				// Re-fetch JWKS and retry
				if err := cache.fetch(); err != nil {
					return nil, err
				}
				cache.mu.RLock()
				pk = cache.keys[kidVal]
				cache.mu.RUnlock()
				if pk == nil {
					return nil, fmt.Errorf("public key for kid %s not found", kidVal)
				}
			}
			return pk, nil
		}

		// Define expected claims
		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, keyFunc)
		if err != nil || !token.Valid {
			logger.Warn("invalid token", zap.Error(err))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Basic claim checks
		if expectedIssuer != "" {
			if iss, ok := claims["iss"].(string); !ok || iss != expectedIssuer {
				logger.Warn("token issuer mismatch", zap.String("iss", fmt.Sprintf("%v", claims["iss"])))
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token issuer"})
				c.Abort()
				return
			}
		}

		if expectedAudience != "" {
			if aud, ok := claims["aud"].(string); !ok || aud != expectedAudience {
				// aud can be array
				if audArr, ok2 := claims["aud"].([]interface{}); ok2 {
					found := false
					for _, a := range audArr {
						if as, ok3 := a.(string); ok3 && as == expectedAudience {
							found = true
							break
						}
					}
					if !found {
						logger.Warn("token audience mismatch")
						c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token audience"})
						c.Abort()
						return
					}
				} else {
					logger.Warn("token audience mismatch")
					c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token audience"})
					c.Abort()
					return
				}
			}
		}

		// Extract user info from common Clerk claims
		var userID string
		if sub, ok := claims["sub"].(string); ok {
			userID = sub
		}
		if email, ok := claims["email"].(string); ok {
			c.Set("user_email", email)
		}
		if userID != "" {
			c.Set("user_id", userID)
		}

		// Optionally extract role or other custom claims
		if role, ok := claims["role"].(string); ok {
			c.Set("user_role", role)
		}

		c.Set("authenticated", true)
		logger.Debug("User authenticated via Clerk", zap.String("user_id", userID))

		c.Next()
	}
}
