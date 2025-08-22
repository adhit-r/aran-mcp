package config

type Config struct {
	Server   ServerConfig   `mapstructure:",squash"`
	Logging  LoggingConfig  `mapstructure:",squash"`
	Security SecurityConfig `mapstructure:",squash"`
}

type ServerConfig struct {
	Port         string `mapstructure:"SERVER_PORT" default:"8080"`
	Environment  string `mapstructure:"ENV" default:"development"`
	ReadTimeout  int    `mapstructure:"READ_TIMEOUT" default:"30"`
	WriteTimeout int    `mapstructure:"WRITE_TIMEOUT" default:"30"`
}

type LoggingConfig struct {
	Level string `mapstructure:"LOG_LEVEL" default:"info"`
}

type SecurityConfig struct {
	JWTSecret   string `mapstructure:"JWT_SECRET"`
	RateLimit   int    `mapstructure:"RATE_LIMIT" default:"100"`
	EnableHTTPS bool   `mapstructure:"ENABLE_HTTPS" default:"false"`
}
