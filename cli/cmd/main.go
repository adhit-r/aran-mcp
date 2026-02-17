package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/fatih/color"
	"github.com/olekukonko/tablewriter"
	"github.com/radhi1991/aran-mcp-sentinel/cli/internal/client"
	"github.com/radhi1991/aran-mcp-sentinel/cli/internal/config"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

var (
	cfg        *config.Config
	apiClient  *client.Client
	outputFmt  string
	apiKey     string
	apiURL     string
	
	// Colors
	green   = color.New(color.FgGreen).SprintFunc()
	red     = color.New(color.FgRed).SprintFunc()
	yellow  = color.New(color.FgYellow).SprintFunc()
	cyan    = color.New(color.FgCyan).SprintFunc()
	bold    = color.New(color.Bold).SprintFunc()
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "aran",
		Short: "CLI tool for aran-mcp API",
		Long: `aran is a command-line interface for interacting with the aran-mcp API.
		
It allows you to manage MCP servers, view alerts, run security tests,
and more from your terminal.`,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			// Skip config for certain commands
			if cmd.Name() == "configure" || cmd.Name() == "version" || cmd.Name() == "help" {
				return nil
			}
			
			var err error
			cfg, err = config.Load()
			if err != nil {
				return fmt.Errorf("failed to load config: %w", err)
			}

			// Override with flags
			endpoint := cfg.GetEffectiveEndpoint()
			if apiURL != "" {
				endpoint = apiURL
			}
			
			key := cfg.GetEffectiveAPIKey()
			if apiKey != "" {
				key = apiKey
			}
			
			if outputFmt == "" {
				outputFmt = cfg.Format
			}

			apiClient = client.NewClient(endpoint, key, cfg.Timeout)
			return nil
		},
	}

	// Global flags
	rootCmd.PersistentFlags().StringVarP(&outputFmt, "output", "o", "", "Output format (json, yaml, table)")
	rootCmd.PersistentFlags().StringVar(&apiKey, "api-key", "", "API key (overrides config)")
	rootCmd.PersistentFlags().StringVar(&apiURL, "api-url", "", "API URL (overrides config)")

	// Add commands
	rootCmd.AddCommand(
		configureCmd(),
		healthCmd(),
		serversCmd(),
		alertsCmd(),
		searchCmd(),
		discoverCmd(),
		versionCmd(),
	)

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, red("Error:"), err)
		os.Exit(1)
	}
}

// configureCmd handles configuration
func configureCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "configure",
		Short: "Configure the CLI",
		Long:  "Configure API endpoint, API key, and other settings",
	}

	// Init subcommand
	initCmd := &cobra.Command{
		Use:   "init",
		Short: "Initialize configuration interactively",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg = config.DefaultConfig()

			fmt.Print("API Endpoint [http://localhost:8080]: ")
			var endpoint string
			fmt.Scanln(&endpoint)
			if endpoint != "" {
				cfg.APIEndpoint = endpoint
			}

			fmt.Print("API Key: ")
			var key string
			fmt.Scanln(&key)
			cfg.APIKey = key

			fmt.Print("Default output format [table]: ")
			var format string
			fmt.Scanln(&format)
			if format != "" {
				cfg.Format = format
			}

			if err := cfg.Save(); err != nil {
				return err
			}

			fmt.Println(green("✓"), "Configuration saved to", config.GetConfigPath())
			return nil
		},
	}

	// Show subcommand
	showCmd := &cobra.Command{
		Use:   "show",
		Short: "Show current configuration",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load()
			if err != nil {
				return err
			}

			data, err := cfg.ToYAML()
			if err != nil {
				return err
			}

			fmt.Println(data)
			return nil
		},
	}

	// Set subcommand
	setCmd := &cobra.Command{
		Use:   "set KEY VALUE",
		Short: "Set a configuration value",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load()
			if err != nil {
				return err
			}

			key := args[0]
			value := args[1]

			switch key {
			case "api-endpoint", "endpoint":
				cfg.APIEndpoint = value
			case "api-key", "key":
				cfg.APIKey = value
			case "format", "output":
				cfg.Format = value
			default:
				return fmt.Errorf("unknown config key: %s", key)
			}

			if err := cfg.Save(); err != nil {
				return err
			}

			fmt.Println(green("✓"), "Set", key, "=", value)
			return nil
		},
	}

	// Profile subcommand
	profileCmd := &cobra.Command{
		Use:   "profile",
		Short: "Manage connection profiles",
	}

	profileAddCmd := &cobra.Command{
		Use:   "add NAME",
		Short: "Add a connection profile",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load()
			if err != nil {
				return err
			}

			endpoint, _ := cmd.Flags().GetString("endpoint")
			key, _ := cmd.Flags().GetString("key")
			isDefault, _ := cmd.Flags().GetBool("default")

			cfg.AddProfile(args[0], endpoint, key, isDefault)

			if err := cfg.Save(); err != nil {
				return err
			}

			fmt.Println(green("✓"), "Profile", args[0], "added")
			return nil
		},
	}
	profileAddCmd.Flags().String("endpoint", "", "API endpoint for this profile")
	profileAddCmd.Flags().String("key", "", "API key for this profile")
	profileAddCmd.Flags().Bool("default", false, "Set as default profile")

	profileListCmd := &cobra.Command{
		Use:   "list",
		Short: "List all profiles",
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load()
			if err != nil {
				return err
			}

			if len(cfg.Profiles) == 0 {
				fmt.Println("No profiles configured")
				return nil
			}

			table := tablewriter.NewWriter(os.Stdout)
			table.SetHeader([]string{"Name", "Endpoint", "Default", "Active"})

			for name, profile := range cfg.Profiles {
				isDefault := ""
				if profile.Default {
					isDefault = "✓"
				}
				isActive := ""
				if cfg.Active == name {
					isActive = "✓"
				}
				table.Append([]string{name, profile.APIEndpoint, isDefault, isActive})
			}

			table.Render()
			return nil
		},
	}

	profileUseCmd := &cobra.Command{
		Use:   "use NAME",
		Short: "Switch to a profile",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load()
			if err != nil {
				return err
			}

			if err := cfg.SetActiveProfile(args[0]); err != nil {
				return err
			}

			if err := cfg.Save(); err != nil {
				return err
			}

			fmt.Println(green("✓"), "Switched to profile", args[0])
			return nil
		},
	}

	profileRemoveCmd := &cobra.Command{
		Use:   "remove NAME",
		Short: "Remove a profile",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			cfg, err := config.Load()
			if err != nil {
				return err
			}

			if err := cfg.RemoveProfile(args[0]); err != nil {
				return err
			}

			if err := cfg.Save(); err != nil {
				return err
			}

			fmt.Println(green("✓"), "Profile", args[0], "removed")
			return nil
		},
	}

	profileCmd.AddCommand(profileAddCmd, profileListCmd, profileUseCmd, profileRemoveCmd)

	cmd.AddCommand(initCmd, showCmd, setCmd, profileCmd)
	return cmd
}

// healthCmd checks API health
func healthCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "health",
		Short: "Check API health status",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			health, err := apiClient.Health(ctx)
			if err != nil {
				fmt.Println(red("✗"), "API is unhealthy:", err)
				return nil
			}

			if health.Status == "ok" || health.Status == "healthy" {
				fmt.Println(green("✓"), "API is healthy")
			} else {
				fmt.Println(yellow("!"), "API status:", health.Status)
			}

			if health.Message != "" {
				fmt.Println("  Message:", health.Message)
			}

			return nil
		},
	}
}

// serversCmd handles server operations
func serversCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "servers",
		Aliases: []string{"server", "srv"},
		Short:   "Manage MCP servers",
	}

	// List servers
	listCmd := &cobra.Command{
		Use:   "list",
		Short: "List all MCP servers",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			servers, err := apiClient.ListServers(ctx)
			if err != nil {
				return err
			}

			return outputServers(servers)
		},
	}

	// Get server
	getCmd := &cobra.Command{
		Use:   "get ID",
		Short: "Get a server by ID",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			server, err := apiClient.GetServer(ctx, args[0])
			if err != nil {
				return err
			}

			return outputServer(server)
		},
	}

	// Create server
	createCmd := &cobra.Command{
		Use:   "create",
		Short: "Create a new MCP server",
		RunE: func(cmd *cobra.Command, args []string) error {
			name, _ := cmd.Flags().GetString("name")
			url, _ := cmd.Flags().GetString("url")
			desc, _ := cmd.Flags().GetString("description")
			serverType, _ := cmd.Flags().GetString("type")

			if name == "" || url == "" {
				return fmt.Errorf("name and url are required")
			}

			req := &client.CreateServerRequest{
				Name:        name,
				URL:         url,
				Description: desc,
				Type:        serverType,
			}

			ctx := context.Background()
			server, err := apiClient.CreateServer(ctx, req)
			if err != nil {
				return err
			}

			fmt.Println(green("✓"), "Server created:", server.ID)
			return outputServer(server)
		},
	}
	createCmd.Flags().StringP("name", "n", "", "Server name")
	createCmd.Flags().StringP("url", "u", "", "Server URL")
	createCmd.Flags().StringP("description", "d", "", "Server description")
	createCmd.Flags().StringP("type", "t", "api", "Server type (filesystem, database, api, custom)")

	// Delete server
	deleteCmd := &cobra.Command{
		Use:   "delete ID",
		Short: "Delete an MCP server",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			if err := apiClient.DeleteServer(ctx, args[0]); err != nil {
				return err
			}

			fmt.Println(green("✓"), "Server deleted:", args[0])
			return nil
		},
	}

	cmd.AddCommand(listCmd, getCmd, createCmd, deleteCmd)
	return cmd
}

// alertsCmd handles alert operations
func alertsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "alerts",
		Aliases: []string{"alert"},
		Short:   "View and manage alerts",
	}

	listCmd := &cobra.Command{
		Use:   "list",
		Short: "List all alerts",
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			alerts, err := apiClient.ListAlerts(ctx)
			if err != nil {
				return err
			}

			return outputAlerts(alerts)
		},
	}

	cmd.AddCommand(listCmd)
	return cmd
}

// searchCmd handles search operations
func searchCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "search [query]",
		Short: "Search for MCP servers",
		Args:  cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			req := &client.SearchRequest{}

			if len(args) > 0 {
				req.Query = args[0]
			}

			status, _ := cmd.Flags().GetStringSlice("status")
			if len(status) > 0 {
				req.Status = status
			}

			serverType, _ := cmd.Flags().GetStringSlice("type")
			if len(serverType) > 0 {
				req.Type = serverType
			}

			sortBy, _ := cmd.Flags().GetString("sort")
			if sortBy != "" {
				req.SortBy = sortBy
			}

			limit, _ := cmd.Flags().GetInt("limit")
			if limit > 0 {
				req.Limit = limit
			}

			ctx := context.Background()
			result, err := apiClient.SearchServers(ctx, req)
			if err != nil {
				return err
			}

			fmt.Printf("Found %d results (page %d of %d)\n\n", result.Total, result.Page, result.TotalPages)

			var servers []*client.Server
			for _, r := range result.Results {
				servers = append(servers, r.Server)
			}

			return outputServers(servers)
		},
	}

	cmd.Flags().StringSlice("status", nil, "Filter by status (online, offline, error, unknown)")
	cmd.Flags().StringSlice("type", nil, "Filter by type (filesystem, database, api, custom)")
	cmd.Flags().String("sort", "", "Sort by field (name, created_at, updated_at, status)")
	cmd.Flags().Int("limit", 20, "Maximum results")

	return cmd
}

// discoverCmd discovers MCP server capabilities
func discoverCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "discover URL",
		Short: "Discover MCP server capabilities",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := context.Background()
			result, err := apiClient.DiscoverServer(ctx, args[0])
			if err != nil {
				return err
			}

			return outputJSON(result)
		},
	}
}

// versionCmd shows version info
func versionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Show version information",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("aran CLI v1.0.0")
			fmt.Println("Build: " + time.Now().Format("2006-01-02"))
		},
	}
}

// Output helpers
func outputServers(servers []*client.Server) error {
	switch outputFmt {
	case "json":
		return outputJSON(servers)
	case "yaml":
		return outputYAML(servers)
	default:
		return outputServersTable(servers)
	}
}

func outputServer(server *client.Server) error {
	switch outputFmt {
	case "json":
		return outputJSON(server)
	case "yaml":
		return outputYAML(server)
	default:
		return outputServerDetail(server)
	}
}

func outputAlerts(alerts []*client.Alert) error {
	switch outputFmt {
	case "json":
		return outputJSON(alerts)
	case "yaml":
		return outputYAML(alerts)
	default:
		return outputAlertsTable(alerts)
	}
}

func outputJSON(data interface{}) error {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	return enc.Encode(data)
}

func outputYAML(data interface{}) error {
	out, err := yaml.Marshal(data)
	if err != nil {
		return err
	}
	fmt.Println(string(out))
	return nil
}

func outputServersTable(servers []*client.Server) error {
	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"ID", "Name", "Type", "Status", "URL"})
	table.SetBorder(false)
	table.SetHeaderAlignment(tablewriter.ALIGN_LEFT)
	table.SetAlignment(tablewriter.ALIGN_LEFT)

	for _, s := range servers {
		status := s.Status
		switch s.Status {
		case "online":
			status = green(s.Status)
		case "offline":
			status = red(s.Status)
		case "error":
			status = red(s.Status)
		default:
			status = yellow(s.Status)
		}

		id := s.ID
		if len(id) > 8 {
			id = id[:8] + "..."
		}

		table.Append([]string{id, s.Name, s.Type, status, s.URL})
	}

	table.Render()
	return nil
}

func outputServerDetail(server *client.Server) error {
	fmt.Println(bold("Server Details"))
	fmt.Println(strings.Repeat("-", 40))
	fmt.Println("ID:         ", server.ID)
	fmt.Println("Name:       ", server.Name)
	fmt.Println("URL:        ", server.URL)
	fmt.Println("Type:       ", server.Type)

	status := server.Status
	switch server.Status {
	case "online":
		status = green(server.Status)
	case "offline", "error":
		status = red(server.Status)
	default:
		status = yellow(server.Status)
	}
	fmt.Println("Status:     ", status)

	if server.Description != nil {
		fmt.Println("Description:", *server.Description)
	}
	if server.Version != nil {
		fmt.Println("Version:    ", *server.Version)
	}
	if server.ResponseTimeMs != nil {
		fmt.Printf("Response:    %dms\n", *server.ResponseTimeMs)
	}
	if server.UptimePercentage != nil {
		fmt.Printf("Uptime:      %.2f%%\n", *server.UptimePercentage)
	}

	fmt.Println("Created:    ", server.CreatedAt.Format(time.RFC3339))
	fmt.Println("Updated:    ", server.UpdatedAt.Format(time.RFC3339))

	return nil
}

func outputAlertsTable(alerts []*client.Alert) error {
	table := tablewriter.NewWriter(os.Stdout)
	table.SetHeader([]string{"ID", "Type", "Severity", "Title", "Created"})
	table.SetBorder(false)

	for _, a := range alerts {
		severity := a.Severity
		switch a.Severity {
		case "critical":
			severity = red(a.Severity)
		case "high":
			severity = red(a.Severity)
		case "medium":
			severity = yellow(a.Severity)
		default:
			severity = cyan(a.Severity)
		}

		id := a.ID
		if len(id) > 8 {
			id = id[:8] + "..."
		}

		table.Append([]string{
			id,
			a.Type,
			severity,
			a.Title,
			a.CreatedAt.Format("2006-01-02 15:04"),
		})
	}

	table.Render()
	return nil
}
