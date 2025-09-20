package config

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	Logging  LoggingConfig  `mapstructure:"logging"`
	Security SecurityConfig `mapstructure:"security"`
	Supabase SupabaseConfig `mapstructure:"supabase"`
}

type ServerConfig struct {
	Port         int    `mapstructure:"port" default:"8080"`
	Environment  string `mapstructure:"environment" default:"development"`
	ReadTimeout  int    `mapstructure:"read_timeout" default:"30"`
	WriteTimeout int    `mapstructure:"write_timeout" default:"30"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host" default:"localhost"`
	Port     int    `mapstructure:"port" default:"5432"`
	User     string `mapstructure:"user" default:"postgres"`
	Password string `mapstructure:"password" default:"password"`
	Name     string `mapstructure:"name" default:"aran_mcp"`
	SSLMode  string `mapstructure:"ssl_mode" default:"disable"`
}

type JWTConfig struct {
	SecretKey     string `mapstructure:"secret" default:"your-secret-key"`
	AccessExpiry  int    `mapstructure:"access_expiry" default:"15"`  // minutes
	RefreshExpiry int    `mapstructure:"refresh_expiry" default:"168"` // hours (7 days)
}

type LoggingConfig struct {
	Level string `mapstructure:"level" default:"info"`
}

type SecurityConfig struct {
	RateLimit   int  `mapstructure:"rate_limit" default:"100"`
	EnableHTTPS bool `mapstructure:"enable_https" default:"false"`
}

type SupabaseConfig struct {
	URL string `mapstructure:"url" default:"http://localhost:8000"`
	Key string `mapstructure:"key" default:"dummy-key-for-development"`
}
