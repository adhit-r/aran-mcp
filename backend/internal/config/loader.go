package config

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
)

// Load loads the configuration from file and environment variables
func Load() (*Config, error) {
	v := viper.New()
	v.SetConfigName("config") // name of config file (without extension)
	v.SetConfigType("yaml")   // REQUIRED if the config file does not have the extension in the name
	v.AddConfigPath("./configs")    // path to look for the config file in
	v.AddConfigPath("../configs")   // look for config in the parent directory
	v.AddConfigPath("../../configs") // look for config in the grandparent directory

	// Enable VIPER to read Environment Variables
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Set default values
	setDefaults(v, Config{})

	// Read config file
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found; ignore error if we want to use defaults
			fmt.Println("No config file found, using defaults")
		} else {
			return nil, fmt.Errorf("fatal error config file: %w", err)
		}
	}

	// Watch for changes in the config file
	v.WatchConfig()
	v.OnConfigChange(func(e fsnotify.Event) {
		fmt.Println("Config file changed:", e.Name)
	})

	// Unmarshal config
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unable to decode into struct: %w", err)
	}

	// Override with environment variables if set
	bindEnvs(v, Config{})

	return &cfg, nil
}

// setDefaults sets default values for the configuration
func setDefaults(v *viper.Viper, iface interface{}) {
	elements := reflect.ValueOf(iface)

	// Handle pointer to struct
	if elements.Kind() == reflect.Ptr {
		elements = elements.Elem()
	}

	// Only accept structs
	if elements.Kind() != reflect.Struct {
		return
	}

	t := elements.Type()

	// Loop through the fields of the struct
	for i := 0; i < elements.NumField(); i++ {
		field := t.Field(i)
		fieldValue := elements.Field(i)

		// Skip unexported fields
		if !fieldValue.CanSet() {
			continue
		}

		// Get the tag value
		tag := field.Tag.Get("mapstructure")
		if tag == "" {
			tag = field.Name
		}

		// Handle nested structs
		if field.Type.Kind() == reflect.Struct && field.Anonymous {
			setDefaults(v, fieldValue.Interface())
			continue
		}

		// Get default value from tag
		defaultValue := field.Tag.Get("default")
		if defaultValue != "" {
			v.SetDefault(tag, defaultValue)
		}
	}
}

// bindEnvs binds environment variables to the configuration
func bindEnvs(v *viper.Viper, iface interface{}) {
	elements := reflect.ValueOf(iface)

	// Handle pointer to struct
	if elements.Kind() == reflect.Ptr {
		elements = elements.Elem()
	}

	// Only accept structs
	if elements.Kind() != reflect.Struct {
		return
	}

	t := elements.Type()

	// Loop through the fields of the struct
	for i := 0; i < elements.NumField(); i++ {
		field := t.Field(i)
		fieldValue := elements.Field(i)

		// Skip unexported fields
		if !fieldValue.CanSet() {
			continue
		}

		// Get the tag value
		tag := field.Tag.Get("mapstructure")
		if tag == "" {
			tag = field.Name
		}

		// Handle nested structs
		if field.Type.Kind() == reflect.Struct && field.Anonymous {
			bindEnvs(v, fieldValue.Interface())
			continue
		}

		// Bind environment variable
		if err := v.BindEnv(tag); err != nil {
			fmt.Printf("Failed to bind env var %s: %v\n", tag, err)
		}
	}
}
