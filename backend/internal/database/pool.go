package database

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

// PoolConfig holds advanced connection pool configuration
type PoolConfig struct {
	// Basic connection settings
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"-"` // Don't expose in JSON
	DBName   string `json:"db_name"`
	SSLMode  string `json:"ssl_mode"`

	// Connection pool settings
	MaxOpenConns    int           `json:"max_open_conns"`    // Maximum open connections (default: 25)
	MaxIdleConns    int           `json:"max_idle_conns"`    // Maximum idle connections (default: 10)
	ConnMaxLifetime time.Duration `json:"conn_max_lifetime"` // Maximum connection lifetime (default: 30m)
	ConnMaxIdleTime time.Duration `json:"conn_max_idle_time"` // Maximum idle time (default: 10m)

	// Health check settings
	HealthCheckInterval time.Duration `json:"health_check_interval"` // Interval between health checks (default: 30s)
	HealthCheckTimeout  time.Duration `json:"health_check_timeout"`  // Timeout for health checks (default: 5s)

	// Retry settings
	MaxRetries     int           `json:"max_retries"`      // Maximum connection retries (default: 3)
	RetryInterval  time.Duration `json:"retry_interval"`   // Initial retry interval (default: 1s)
	RetryMaxDelay  time.Duration `json:"retry_max_delay"`  // Maximum retry delay (default: 30s)
	RetryBackoff   float64       `json:"retry_backoff"`    // Backoff multiplier (default: 2.0)

	// Circuit breaker settings
	CircuitBreakerEnabled   bool          `json:"circuit_breaker_enabled"`    // Enable circuit breaker (default: true)
	CircuitBreakerThreshold int           `json:"circuit_breaker_threshold"`  // Failures before opening (default: 5)
	CircuitBreakerTimeout   time.Duration `json:"circuit_breaker_timeout"`    // Time before half-open (default: 30s)
}

// DefaultPoolConfig returns a PoolConfig with sensible defaults
func DefaultPoolConfig() PoolConfig {
	return PoolConfig{
		Host:    "localhost",
		Port:    5432,
		SSLMode: "disable",

		MaxOpenConns:    25,
		MaxIdleConns:    10,
		ConnMaxLifetime: 30 * time.Minute,
		ConnMaxIdleTime: 10 * time.Minute,

		HealthCheckInterval: 30 * time.Second,
		HealthCheckTimeout:  5 * time.Second,

		MaxRetries:    3,
		RetryInterval: 1 * time.Second,
		RetryMaxDelay: 30 * time.Second,
		RetryBackoff:  2.0,

		CircuitBreakerEnabled:   true,
		CircuitBreakerThreshold: 5,
		CircuitBreakerTimeout:   30 * time.Second,
	}
}

// PoolStats holds connection pool statistics
type PoolStats struct {
	// Connection counts
	MaxOpenConnections int `json:"max_open_connections"`
	OpenConnections    int `json:"open_connections"`
	InUse              int `json:"in_use"`
	Idle               int `json:"idle"`

	// Connection lifecycle
	WaitCount         int64         `json:"wait_count"`
	WaitDuration      time.Duration `json:"wait_duration"`
	MaxIdleClosed     int64         `json:"max_idle_closed"`
	MaxIdleTimeClosed int64         `json:"max_idle_time_closed"`
	MaxLifetimeClosed int64         `json:"max_lifetime_closed"`

	// Health status
	LastHealthCheck   time.Time `json:"last_health_check"`
	HealthCheckPassed bool      `json:"health_check_passed"`
	HealthCheckError  string    `json:"health_check_error,omitempty"`

	// Circuit breaker status
	CircuitBreakerState string `json:"circuit_breaker_state"`
	ConsecutiveFailures int    `json:"consecutive_failures"`

	// Request stats
	TotalQueries      int64         `json:"total_queries"`
	FailedQueries     int64         `json:"failed_queries"`
	AvgQueryDuration  time.Duration `json:"avg_query_duration"`
}

// CircuitState represents the circuit breaker state
type CircuitState int

const (
	CircuitClosed CircuitState = iota
	CircuitOpen
	CircuitHalfOpen
)

func (s CircuitState) String() string {
	switch s {
	case CircuitClosed:
		return "closed"
	case CircuitOpen:
		return "open"
	case CircuitHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

// PooledConnection is an advanced database connection pool manager
type PooledConnection struct {
	DB     *sqlx.DB
	Logger *zap.Logger
	config PoolConfig

	// Health check
	healthMu           sync.RWMutex
	lastHealthCheck    time.Time
	healthCheckPassed  bool
	healthCheckError   string
	healthCheckCancel  context.CancelFunc

	// Circuit breaker
	circuitMu           sync.RWMutex
	circuitState        CircuitState
	consecutiveFailures int
	lastFailureTime     time.Time
	circuitOpenedAt     time.Time

	// Statistics
	totalQueries     int64
	failedQueries    int64
	totalQueryTime   int64 // nanoseconds
}

// NewPooledConnection creates a new pooled database connection with advanced features
func NewPooledConnection(cfg PoolConfig, logger *zap.Logger) (*PooledConnection, error) {
	// Apply defaults for zero values
	if cfg.MaxOpenConns == 0 {
		cfg.MaxOpenConns = DefaultPoolConfig().MaxOpenConns
	}
	if cfg.MaxIdleConns == 0 {
		cfg.MaxIdleConns = DefaultPoolConfig().MaxIdleConns
	}
	if cfg.ConnMaxLifetime == 0 {
		cfg.ConnMaxLifetime = DefaultPoolConfig().ConnMaxLifetime
	}
	if cfg.ConnMaxIdleTime == 0 {
		cfg.ConnMaxIdleTime = DefaultPoolConfig().ConnMaxIdleTime
	}
	if cfg.HealthCheckInterval == 0 {
		cfg.HealthCheckInterval = DefaultPoolConfig().HealthCheckInterval
	}
	if cfg.HealthCheckTimeout == 0 {
		cfg.HealthCheckTimeout = DefaultPoolConfig().HealthCheckTimeout
	}
	if cfg.MaxRetries == 0 {
		cfg.MaxRetries = DefaultPoolConfig().MaxRetries
	}
	if cfg.RetryInterval == 0 {
		cfg.RetryInterval = DefaultPoolConfig().RetryInterval
	}
	if cfg.RetryMaxDelay == 0 {
		cfg.RetryMaxDelay = DefaultPoolConfig().RetryMaxDelay
	}
	if cfg.RetryBackoff == 0 {
		cfg.RetryBackoff = DefaultPoolConfig().RetryBackoff
	}
	if cfg.CircuitBreakerThreshold == 0 {
		cfg.CircuitBreakerThreshold = DefaultPoolConfig().CircuitBreakerThreshold
	}
	if cfg.CircuitBreakerTimeout == 0 {
		cfg.CircuitBreakerTimeout = DefaultPoolConfig().CircuitBreakerTimeout
	}

	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode)

	logger.Info("Initializing connection pool",
		zap.String("host", cfg.Host),
		zap.Int("port", cfg.Port),
		zap.String("database", cfg.DBName),
		zap.Int("max_open_conns", cfg.MaxOpenConns),
		zap.Int("max_idle_conns", cfg.MaxIdleConns),
		zap.Duration("conn_max_lifetime", cfg.ConnMaxLifetime),
	)

	// Connect with retries
	var db *sqlx.DB
	var err error
	delay := cfg.RetryInterval

	for attempt := 1; attempt <= cfg.MaxRetries; attempt++ {
		db, err = sqlx.Connect("postgres", dsn)
		if err == nil {
			break
		}

		logger.Warn("Failed to connect to database, retrying...",
			zap.Int("attempt", attempt),
			zap.Int("max_retries", cfg.MaxRetries),
			zap.Duration("next_retry_in", delay),
			zap.Error(err),
		)

		if attempt < cfg.MaxRetries {
			time.Sleep(delay)
			delay = time.Duration(float64(delay) * cfg.RetryBackoff)
			if delay > cfg.RetryMaxDelay {
				delay = cfg.RetryMaxDelay
			}
		}
	}

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database after %d attempts: %w", cfg.MaxRetries, err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	pc := &PooledConnection{
		DB:                db,
		Logger:            logger,
		config:            cfg,
		healthCheckPassed: true,
		circuitState:      CircuitClosed,
	}

	// Start background health check
	ctx, cancel := context.WithCancel(context.Background())
	pc.healthCheckCancel = cancel
	go pc.startHealthCheck(ctx)

	logger.Info("Connection pool initialized successfully")

	return pc, nil
}

// startHealthCheck runs periodic health checks in the background
func (pc *PooledConnection) startHealthCheck(ctx context.Context) {
	ticker := time.NewTicker(pc.config.HealthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			pc.performHealthCheck()
		}
	}
}

// performHealthCheck executes a health check and updates status
func (pc *PooledConnection) performHealthCheck() {
	ctx, cancel := context.WithTimeout(context.Background(), pc.config.HealthCheckTimeout)
	defer cancel()

	var result int
	err := pc.DB.GetContext(ctx, &result, "SELECT 1")

	pc.healthMu.Lock()
	defer pc.healthMu.Unlock()

	pc.lastHealthCheck = time.Now()
	if err != nil {
		pc.healthCheckPassed = false
		pc.healthCheckError = err.Error()
		pc.Logger.Warn("Database health check failed",
			zap.Error(err),
			zap.Time("timestamp", pc.lastHealthCheck),
		)

		// Update circuit breaker on health check failure
		pc.recordFailure()
	} else {
		pc.healthCheckPassed = true
		pc.healthCheckError = ""
	}
}

// recordFailure records a failure for the circuit breaker
func (pc *PooledConnection) recordFailure() {
	if !pc.config.CircuitBreakerEnabled {
		return
	}

	pc.circuitMu.Lock()
	defer pc.circuitMu.Unlock()

	pc.consecutiveFailures++
	pc.lastFailureTime = time.Now()

	if pc.circuitState == CircuitClosed && pc.consecutiveFailures >= pc.config.CircuitBreakerThreshold {
		pc.circuitState = CircuitOpen
		pc.circuitOpenedAt = time.Now()
		pc.Logger.Warn("Circuit breaker opened",
			zap.Int("consecutive_failures", pc.consecutiveFailures),
		)
	}
}

// recordSuccess records a success for the circuit breaker
func (pc *PooledConnection) recordSuccess() {
	if !pc.config.CircuitBreakerEnabled {
		return
	}

	pc.circuitMu.Lock()
	defer pc.circuitMu.Unlock()

	if pc.circuitState == CircuitHalfOpen {
		pc.circuitState = CircuitClosed
		pc.Logger.Info("Circuit breaker closed after successful request")
	}
	pc.consecutiveFailures = 0
}

// checkCircuitBreaker checks if requests should be allowed
func (pc *PooledConnection) checkCircuitBreaker() error {
	if !pc.config.CircuitBreakerEnabled {
		return nil
	}

	pc.circuitMu.Lock()
	defer pc.circuitMu.Unlock()

	switch pc.circuitState {
	case CircuitClosed:
		return nil

	case CircuitOpen:
		// Check if it's time to try half-open
		if time.Since(pc.circuitOpenedAt) >= pc.config.CircuitBreakerTimeout {
			pc.circuitState = CircuitHalfOpen
			pc.Logger.Info("Circuit breaker moved to half-open state")
			return nil
		}
		return fmt.Errorf("circuit breaker is open, request rejected")

	case CircuitHalfOpen:
		return nil
	}

	return nil
}

// Stats returns current connection pool statistics
func (pc *PooledConnection) Stats() PoolStats {
	dbStats := pc.DB.Stats()

	pc.healthMu.RLock()
	lastHealth := pc.lastHealthCheck
	healthPassed := pc.healthCheckPassed
	healthError := pc.healthCheckError
	pc.healthMu.RUnlock()

	pc.circuitMu.RLock()
	circuitState := pc.circuitState
	failures := pc.consecutiveFailures
	pc.circuitMu.RUnlock()

	totalQueries := atomic.LoadInt64(&pc.totalQueries)
	failedQueries := atomic.LoadInt64(&pc.failedQueries)
	totalQueryTime := atomic.LoadInt64(&pc.totalQueryTime)

	var avgQueryDuration time.Duration
	if totalQueries > 0 {
		avgQueryDuration = time.Duration(totalQueryTime / totalQueries)
	}

	return PoolStats{
		MaxOpenConnections: dbStats.MaxOpenConnections,
		OpenConnections:    dbStats.OpenConnections,
		InUse:              dbStats.InUse,
		Idle:               dbStats.Idle,
		WaitCount:          dbStats.WaitCount,
		WaitDuration:       dbStats.WaitDuration,
		MaxIdleClosed:      dbStats.MaxIdleClosed,
		MaxIdleTimeClosed:  dbStats.MaxIdleTimeClosed,
		MaxLifetimeClosed:  dbStats.MaxLifetimeClosed,
		LastHealthCheck:    lastHealth,
		HealthCheckPassed:  healthPassed,
		HealthCheckError:   healthError,
		CircuitBreakerState: circuitState.String(),
		ConsecutiveFailures: failures,
		TotalQueries:        totalQueries,
		FailedQueries:       failedQueries,
		AvgQueryDuration:    avgQueryDuration,
	}
}

// Close closes the connection pool and stops background tasks
func (pc *PooledConnection) Close() error {
	// Stop health check
	if pc.healthCheckCancel != nil {
		pc.healthCheckCancel()
	}

	// Close database
	if pc.DB != nil {
		return pc.DB.Close()
	}
	return nil
}

// HealthCheck performs an immediate health check
func (pc *PooledConnection) HealthCheck(ctx context.Context) error {
	if err := pc.checkCircuitBreaker(); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(ctx, pc.config.HealthCheckTimeout)
	defer cancel()

	var result int
	err := pc.DB.GetContext(ctx, &result, "SELECT 1")
	if err != nil {
		pc.recordFailure()
		return fmt.Errorf("database health check failed: %w", err)
	}

	pc.recordSuccess()
	return nil
}

// QueryContext executes a query with circuit breaker and metrics
func (pc *PooledConnection) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	if err := pc.checkCircuitBreaker(); err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		return nil, err
	}

	start := time.Now()
	rows, err := pc.DB.QueryContext(ctx, query, args...)
	duration := time.Since(start)

	atomic.AddInt64(&pc.totalQueries, 1)
	atomic.AddInt64(&pc.totalQueryTime, duration.Nanoseconds())

	if err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		pc.recordFailure()
		return nil, err
	}

	pc.recordSuccess()
	return rows, nil
}

// QueryxContext executes a query returning *sqlx.Rows
func (pc *PooledConnection) QueryxContext(ctx context.Context, query string, args ...interface{}) (*sqlx.Rows, error) {
	if err := pc.checkCircuitBreaker(); err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		return nil, err
	}

	start := time.Now()
	rows, err := pc.DB.QueryxContext(ctx, query, args...)
	duration := time.Since(start)

	atomic.AddInt64(&pc.totalQueries, 1)
	atomic.AddInt64(&pc.totalQueryTime, duration.Nanoseconds())

	if err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		pc.recordFailure()
		return nil, err
	}

	pc.recordSuccess()
	return rows, nil
}

// GetContext executes a query and scans the result into dest
func (pc *PooledConnection) GetContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	if err := pc.checkCircuitBreaker(); err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		return err
	}

	start := time.Now()
	err := pc.DB.GetContext(ctx, dest, query, args...)
	duration := time.Since(start)

	atomic.AddInt64(&pc.totalQueries, 1)
	atomic.AddInt64(&pc.totalQueryTime, duration.Nanoseconds())

	if err != nil {
		// Don't count "no rows" as a failure
		if err != sql.ErrNoRows {
			atomic.AddInt64(&pc.failedQueries, 1)
			pc.recordFailure()
		}
		return err
	}

	pc.recordSuccess()
	return nil
}

// SelectContext executes a query and scans results into dest slice
func (pc *PooledConnection) SelectContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	if err := pc.checkCircuitBreaker(); err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		return err
	}

	start := time.Now()
	err := pc.DB.SelectContext(ctx, dest, query, args...)
	duration := time.Since(start)

	atomic.AddInt64(&pc.totalQueries, 1)
	atomic.AddInt64(&pc.totalQueryTime, duration.Nanoseconds())

	if err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		pc.recordFailure()
		return err
	}

	pc.recordSuccess()
	return nil
}

// ExecContext executes a query that doesn't return rows
func (pc *PooledConnection) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	if err := pc.checkCircuitBreaker(); err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		return nil, err
	}

	start := time.Now()
	result, err := pc.DB.ExecContext(ctx, query, args...)
	duration := time.Since(start)

	atomic.AddInt64(&pc.totalQueries, 1)
	atomic.AddInt64(&pc.totalQueryTime, duration.Nanoseconds())

	if err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		pc.recordFailure()
		return nil, err
	}

	pc.recordSuccess()
	return result, nil
}

// NamedExecContext executes a named query that doesn't return rows
func (pc *PooledConnection) NamedExecContext(ctx context.Context, query string, arg interface{}) (sql.Result, error) {
	if err := pc.checkCircuitBreaker(); err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		return nil, err
	}

	start := time.Now()
	result, err := pc.DB.NamedExecContext(ctx, query, arg)
	duration := time.Since(start)

	atomic.AddInt64(&pc.totalQueries, 1)
	atomic.AddInt64(&pc.totalQueryTime, duration.Nanoseconds())

	if err != nil {
		atomic.AddInt64(&pc.failedQueries, 1)
		pc.recordFailure()
		return nil, err
	}

	pc.recordSuccess()
	return result, nil
}

// BeginTx starts a new transaction
func (pc *PooledConnection) BeginTx(ctx context.Context) (*sqlx.Tx, error) {
	if err := pc.checkCircuitBreaker(); err != nil {
		return nil, err
	}
	return pc.DB.BeginTxx(ctx, nil)
}

// WithTx executes a function within a transaction
func (pc *PooledConnection) WithTx(ctx context.Context, fn func(*sqlx.Tx) error) error {
	tx, err := pc.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			tx.Rollback()
			panic(p)
		} else if err != nil {
			tx.Rollback()
		} else {
			err = tx.Commit()
		}
	}()

	err = fn(tx)
	return err
}

// UpdateConfig updates the connection pool configuration dynamically
func (pc *PooledConnection) UpdateConfig(cfg PoolConfig) {
	pc.config = cfg

	// Update pool settings
	pc.DB.SetMaxOpenConns(cfg.MaxOpenConns)
	pc.DB.SetMaxIdleConns(cfg.MaxIdleConns)
	pc.DB.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	pc.DB.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

	pc.Logger.Info("Connection pool configuration updated",
		zap.Int("max_open_conns", cfg.MaxOpenConns),
		zap.Int("max_idle_conns", cfg.MaxIdleConns),
		zap.Duration("conn_max_lifetime", cfg.ConnMaxLifetime),
	)
}

// GetConfig returns the current configuration
func (pc *PooledConnection) GetConfig() PoolConfig {
	return pc.config
}

// ResetCircuitBreaker resets the circuit breaker to closed state
func (pc *PooledConnection) ResetCircuitBreaker() {
	pc.circuitMu.Lock()
	defer pc.circuitMu.Unlock()

	pc.circuitState = CircuitClosed
	pc.consecutiveFailures = 0
	pc.Logger.Info("Circuit breaker manually reset")
}

// WarmUp pre-establishes connections to the database
func (pc *PooledConnection) WarmUp(ctx context.Context, numConns int) error {
	if numConns <= 0 {
		numConns = pc.config.MaxIdleConns
	}
	if numConns > pc.config.MaxOpenConns {
		numConns = pc.config.MaxOpenConns
	}

	pc.Logger.Info("Warming up connection pool",
		zap.Int("target_connections", numConns),
	)

	var wg sync.WaitGroup
	errChan := make(chan error, numConns)

	for i := 0; i < numConns; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			conn, err := pc.DB.Conn(ctx)
			if err != nil {
				errChan <- err
				return
			}
			defer conn.Close()

			// Execute a simple query to ensure connection is established
			var result int
			if err := conn.QueryRowContext(ctx, "SELECT 1").Scan(&result); err != nil {
				errChan <- err
				return
			}
		}()
	}

	wg.Wait()
	close(errChan)

	var errs []error
	for err := range errChan {
		errs = append(errs, err)
	}

	if len(errs) > 0 {
		pc.Logger.Warn("Some connections failed during warmup",
			zap.Int("failed", len(errs)),
			zap.Int("succeeded", numConns-len(errs)),
		)
		return fmt.Errorf("warmup completed with %d failures", len(errs))
	}

	pc.Logger.Info("Connection pool warmup completed successfully",
		zap.Int("connections", numConns),
	)
	return nil
}
