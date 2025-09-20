package supabase

import (
	"context"
	"log"
	"os"

	"github.com/supabase-community/supabase-go"
)

// Client wraps the Supabase client with additional methods
type Client struct {
	*supabase.Client
}

// NewClient creates a new Supabase client
func NewClient() (*Client, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		log.Fatal("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
	}

	supabaseClient, err := supabase.NewClient(supabaseURL, supabaseKey, nil)
	if err != nil {
		return nil, err
	}

	return &Client{
		Client: supabaseClient,
	}, nil
}

// NewClientWithConfig creates a new Supabase client with provided configuration
func NewClientWithConfig(url, key string) (*Client, error) {
	supabaseClient, err := supabase.NewClient(url, key, nil)
	if err != nil {
		return nil, err
	}

	return &Client{
		Client: supabaseClient,
	}, nil
}

// HealthCheck verifies the connection to Supabase
func (c *Client) HealthCheck(ctx context.Context) error {
	// Simple query to verify connection
	_, _, err := c.From("pg_settings").Select("name", "", false).ExecuteString()
	return err
}
