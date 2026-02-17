package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Config represents the CLI configuration
type Config struct {
	APIEndpoint string            `json:"api_endpoint" yaml:"api_endpoint"`
	APIKey      string            `json:"api_key" yaml:"api_key"`
	Format      string            `json:"format" yaml:"format"` // json, yaml, table
	Timeout     int               `json:"timeout" yaml:"timeout"`
	Profiles    map[string]Profile `json:"profiles" yaml:"profiles"`
	Active      string            `json:"active" yaml:"active"` // Active profile name
}

// Profile represents a connection profile
type Profile struct {
	Name        string `json:"name" yaml:"name"`
	APIEndpoint string `json:"api_endpoint" yaml:"api_endpoint"`
	APIKey      string `json:"api_key" yaml:"api_key"`
	Default     bool   `json:"default" yaml:"default"`
}

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		APIEndpoint: "http://localhost:8080",
		Format:      "table",
		Timeout:     30,
		Profiles:    make(map[string]Profile),
		Active:      "default",
	}
}

// GetConfigPath returns the path to the config file
func GetConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ".aran-mcp.yaml"
	}
	return filepath.Join(home, ".aran-mcp", "config.yaml")
}

// Load loads the configuration from disk
func Load() (*Config, error) {
	configPath := GetConfigPath()

	// Check if config file exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// Return default config if file doesn't exist
		return DefaultConfig(), nil
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return &config, nil
}

// Save saves the configuration to disk
func (c *Config) Save() error {
	configPath := GetConfigPath()

	// Ensure directory exists
	dir := filepath.Dir(configPath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	data, err := yaml.Marshal(c)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0600); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// GetActiveProfile returns the active profile settings
func (c *Config) GetActiveProfile() *Profile {
	if c.Active != "" {
		if profile, exists := c.Profiles[c.Active]; exists {
			return &profile
		}
	}

	// Check for default profile
	for _, profile := range c.Profiles {
		if profile.Default {
			return &profile
		}
	}

	return nil
}

// GetEffectiveEndpoint returns the API endpoint to use
func (c *Config) GetEffectiveEndpoint() string {
	if profile := c.GetActiveProfile(); profile != nil {
		return profile.APIEndpoint
	}
	return c.APIEndpoint
}

// GetEffectiveAPIKey returns the API key to use
func (c *Config) GetEffectiveAPIKey() string {
	if profile := c.GetActiveProfile(); profile != nil {
		return profile.APIKey
	}
	return c.APIKey
}

// AddProfile adds a new connection profile
func (c *Config) AddProfile(name, endpoint, apiKey string, isDefault bool) {
	if c.Profiles == nil {
		c.Profiles = make(map[string]Profile)
	}

	// If this is the default, unset other defaults
	if isDefault {
		for n, p := range c.Profiles {
			p.Default = false
			c.Profiles[n] = p
		}
	}

	c.Profiles[name] = Profile{
		Name:        name,
		APIEndpoint: endpoint,
		APIKey:      apiKey,
		Default:     isDefault,
	}
}

// RemoveProfile removes a connection profile
func (c *Config) RemoveProfile(name string) error {
	if _, exists := c.Profiles[name]; !exists {
		return fmt.Errorf("profile %s not found", name)
	}

	delete(c.Profiles, name)

	// If we removed the active profile, clear it
	if c.Active == name {
		c.Active = ""
	}

	return nil
}

// SetActiveProfile sets the active profile
func (c *Config) SetActiveProfile(name string) error {
	if _, exists := c.Profiles[name]; !exists {
		return fmt.Errorf("profile %s not found", name)
	}

	c.Active = name
	return nil
}

// ToJSON returns the config as JSON
func (c *Config) ToJSON() (string, error) {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// ToYAML returns the config as YAML
func (c *Config) ToYAML() (string, error) {
	data, err := yaml.Marshal(c)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
