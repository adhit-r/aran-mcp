package security

import (
	"time"

	"github.com/google/uuid"
)

// ThreatTactic represents a SAFE-MCP tactic (e.g., Initial Access, Execution)
type ThreatTactic struct {
	ID          string    `json:"id"`           // e.g., "ATK-TA0001"
	Name        string    `json:"name"`         // e.g., "Initial Access"
	Description string    `json:"description"`  // Full description
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ThreatTechnique represents a SAFE-MCP technique
type ThreatTechnique struct {
	ID               string    `json:"id"`                 // e.g., "SAFE-T1001"
	TacticID         string    `json:"tactic_id"`          // References ThreatTactic.ID
	Name             string    `json:"name"`               // e.g., "Tool Poisoning Attack"
	Description      string    `json:"description"`        // Full description
	Severity         string    `json:"severity"`           // CRITICAL, HIGH, MEDIUM, LOW
	MITREMapping     string    `json:"mitre_mapping"`      // Corresponding MITRE ATT&CK technique
	AttackVectors    []string  `json:"attack_vectors"`     // List of attack vectors
	Prerequisites    []string  `json:"prerequisites"`      // Prerequisites for the attack
	DetectionMethods []string  `json:"detection_methods"`  // How to detect this technique
	Examples         []string  `json:"examples"`           // Example scenarios
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// ThreatMitigation represents a SAFE-MCP mitigation control
type ThreatMitigation struct {
	ID              string    `json:"id"`                 // e.g., "SAFE-M-1"
	Name            string    `json:"name"`               // e.g., "Control/Data Flow Separation"
	Description     string    `json:"description"`        // Full description
	Category        string    `json:"category"`           // e.g., "Architectural Defense"
	Effectiveness   string    `json:"effectiveness"`      // HIGH, MEDIUM-HIGH, MEDIUM, LOW
	Implementation  string    `json:"implementation"`     // Implementation details
	TechniqueIDs    []string  `json:"technique_ids"`      // TTPs this mitigation addresses
	CostComplexity  string    `json:"cost_complexity"`    // Implementation cost/complexity
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ThreatDetection represents a detected threat instance
type ThreatDetection struct {
	ID            uuid.UUID              `json:"id"`
	ServerID      uuid.UUID              `json:"server_id"`
	TechniqueID   string                 `json:"technique_id"`    // References ThreatTechnique.ID
	Confidence    float64                `json:"confidence"`      // 0.0 to 1.0
	Severity      string                 `json:"severity"`        // CRITICAL, HIGH, MEDIUM, LOW
	Status        string                 `json:"status"`          // DETECTED, INVESTIGATING, MITIGATED, FALSE_POSITIVE
	Evidence      map[string]interface{} `json:"evidence"`        // Supporting evidence
	Indicators    []string               `json:"indicators"`      // IoCs
	Mitigations   []string               `json:"mitigations"`     // Applied mitigation IDs
	Notes         string                 `json:"notes"`
	DetectedAt    time.Time              `json:"detected_at"`
	UpdatedAt     time.Time              `json:"updated_at"`
	MitigatedAt   *time.Time             `json:"mitigated_at,omitempty"`
}

// ThreatAlert represents a security alert based on threat detection
type ThreatAlert struct {
	ID          uuid.UUID `json:"id"`
	DetectionID uuid.UUID `json:"detection_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Severity    string    `json:"severity"`
	Status      string    `json:"status"`           // OPEN, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE
	Priority    string    `json:"priority"`         // P0, P1, P2, P3, P4
	AssignedTo  string    `json:"assigned_to,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	ResolvedAt  *time.Time `json:"resolved_at,omitempty"`
}

// RiskAssessment represents a risk assessment for a server
type RiskAssessment struct {
	ID              uuid.UUID              `json:"id"`
	ServerID        uuid.UUID              `json:"server_id"`
	OverallRisk     string                 `json:"overall_risk"`    // CRITICAL, HIGH, MEDIUM, LOW
	RiskScore       int                    `json:"risk_score"`      // 0-100
	ThreatCount     int                    `json:"threat_count"`
	MitigationCount int                    `json:"mitigation_count"`
	CoverageScore   float64                `json:"coverage_score"`  // 0.0 to 1.0
	Details         map[string]interface{} `json:"details"`
	Recommendations []string               `json:"recommendations"`
	AssessedAt      time.Time              `json:"assessed_at"`
}

// ThreatIntelligence represents threat intelligence data
type ThreatIntelligence struct {
	ID          uuid.UUID              `json:"id"`
	Source      string                 `json:"source"`      // e.g., "SAFE-MCP", "Internal", "Community"
	Type        string                 `json:"type"`        // e.g., "TTP", "IOC", "Campaign"
	Data        map[string]interface{} `json:"data"`
	Confidence  float64                `json:"confidence"`  // 0.0 to 1.0
	Severity    string                 `json:"severity"`
	Description string                 `json:"description"`
	References  []string               `json:"references"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	ExpiresAt   *time.Time             `json:"expires_at,omitempty"`
}

// GetDefaultTactics returns the SAFE-MCP threat tactics
func GetDefaultTactics() []ThreatTactic {
	now := time.Now()
	return []ThreatTactic{
		{
			ID:          "ATK-TA0043",
			Name:        "Reconnaissance",
			Description: "The adversary is trying to gather information they can use to plan future operations",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0042",
			Name:        "Resource Development",
			Description: "The adversary is trying to establish resources they can use to support operations",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0001",
			Name:        "Initial Access",
			Description: "The adversary is trying to get into your MCP environment",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0002",
			Name:        "Execution",
			Description: "The adversary is trying to run malicious code via MCP",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0003",
			Name:        "Persistence",
			Description: "The adversary is trying to maintain their foothold in MCP",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0004",
			Name:        "Privilege Escalation",
			Description: "The adversary is trying to gain higher-level permissions",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0005",
			Name:        "Defense Evasion",
			Description: "The adversary is trying to avoid being detected",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0006",
			Name:        "Credential Access",
			Description: "The adversary is trying to steal account names and passwords",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0007",
			Name:        "Discovery",
			Description: "The adversary is trying to figure out your MCP environment",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0008",
			Name:        "Lateral Movement",
			Description: "The adversary is trying to move through your environment",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0009",
			Name:        "Collection",
			Description: "The adversary is trying to gather data of interest",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0011",
			Name:        "Command and Control",
			Description: "The adversary is trying to communicate with compromised systems",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0010",
			Name:        "Exfiltration",
			Description: "The adversary is trying to steal data",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "ATK-TA0040",
			Name:        "Impact",
			Description: "The adversary is trying to manipulate, interrupt, or destroy systems and data",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}
}

// GetDefaultTechniques returns key SAFE-MCP threat techniques
func GetDefaultTechniques() []ThreatTechnique {
	now := time.Now()
	return []ThreatTechnique{
		{
			ID:          "SAFE-T1001",
			TacticID:    "ATK-TA0001",
			Name:        "Tool Poisoning Attack (TPA)",
			Description: "Attackers embed malicious instructions within MCP tool descriptions that are invisible to users but processed by LLMs",
			Severity:    "CRITICAL",
			AttackVectors: []string{
				"Malicious tool description injection",
				"Supply chain compromise",
				"Social engineering",
			},
			Prerequisites: []string{
				"Write access to MCP tool descriptions",
				"Knowledge of target LLM instruction syntax",
			},
			DetectionMethods: []string{
				"Unicode sanitization and filtering",
				"AI-powered content analysis",
				"Cryptographic integrity verification",
			},
			Examples: []string{
				"HTML comments with hidden instructions",
				"Zero-width Unicode characters",
				"Bidirectional text overrides",
			},
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "SAFE-T1102",
			TacticID:    "ATK-TA0002",
			Name:        "Prompt Injection (Multiple Vectors)",
			Description: "Malicious instructions injected through various vectors to manipulate AI behavior via MCP",
			Severity:    "CRITICAL",
			AttackVectors: []string{
				"Direct prompt injection",
				"Indirect prompt injection via data sources",
				"Context poisoning",
			},
			Prerequisites: []string{
				"Access to user input channels",
				"Understanding of LLM prompt processing",
			},
			DetectionMethods: []string{
				"Prompt validation",
				"Context isolation",
				"Behavioral monitoring",
			},
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "SAFE-T1501",
			TacticID:    "ATK-TA0006",
			Name:        "Full-Schema Poisoning (FSP)",
			Description: "Exploitation of entire MCP tool schema beyond descriptions for credential theft",
			Severity:    "HIGH",
			AttackVectors: []string{
				"Parameter name poisoning",
				"Type definition manipulation",
				"Output schema exploitation",
			},
			Prerequisites: []string{
				"Access to tool schema definitions",
				"Understanding of MCP protocol",
			},
			DetectionMethods: []string{
				"Schema validation",
				"Metadata sanitization",
				"Cryptographic signing",
			},
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "SAFE-T1201",
			TacticID:    "ATK-TA0003",
			Name:        "MCP Rug Pull Attack",
			Description: "Time-delayed malicious tool definition changes after initial approval",
			Severity:    "HIGH",
			AttackVectors: []string{
				"Dynamic tool redefinition",
				"Update mechanism hijacking",
				"Version rollback exploitation",
			},
			Prerequisites: []string{
				"Update mechanism access",
				"Initial trust establishment",
			},
			DetectionMethods: []string{
				"Tool version monitoring",
				"Change detection",
				"Behavioral baseline tracking",
			},
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}
}

// GetDefaultMitigations returns key SAFE-MCP mitigations
func GetDefaultMitigations() []ThreatMitigation {
	now := time.Now()
	return []ThreatMitigation{
		{
			ID:          "SAFE-M-1",
			Name:        "Control/Data Flow Separation",
			Description: "Fundamental design pattern that separates control flow from data flow to prevent entire classes of attacks",
			Category:    "Architectural Defense",
			Effectiveness: "HIGH",
			Implementation: "Implement strict separation between control instructions and user data. Process control flow separately from data flow.",
			TechniqueIDs: []string{"SAFE-T1001", "SAFE-T1102", "SAFE-T1501"},
			CostComplexity: "HIGH",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "SAFE-M-2",
			Name:        "Cryptographic Integrity for Tool Descriptions",
			Description: "Use cryptographic signatures to verify integrity of tool descriptions",
			Category:    "Cryptographic Control",
			Effectiveness: "HIGH",
			Implementation: "Sign all tool descriptions with cryptographic keys. Verify signatures before processing.",
			TechniqueIDs: []string{"SAFE-T1001", "SAFE-T1501", "SAFE-T1201"},
			CostComplexity: "MEDIUM",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "SAFE-M-3",
			Name:        "AI-Powered Content Analysis",
			Description: "Use AI/ML models to detect malicious patterns in tool descriptions and prompts",
			Category:    "AI-Based Defense",
			Effectiveness: "MEDIUM-HIGH",
			Implementation: "Deploy ML models trained on known attack patterns to analyze tool metadata and prompts.",
			TechniqueIDs: []string{"SAFE-T1001", "SAFE-T1102", "SAFE-T1402"},
			CostComplexity: "HIGH",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "SAFE-M-4",
			Name:        "Unicode Sanitization and Filtering",
			Description: "Remove or normalize potentially dangerous Unicode characters",
			Category:    "Input Validation",
			Effectiveness: "MEDIUM-HIGH",
			Implementation: "Filter zero-width characters, bidirectional overrides, and other dangerous Unicode sequences.",
			TechniqueIDs: []string{"SAFE-T1001", "SAFE-T1402"},
			CostComplexity: "LOW",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			ID:          "SAFE-M-11",
			Name:        "Behavioral Monitoring",
			Description: "Monitor and analyze behavior patterns to detect anomalies",
			Category:    "Detective Control",
			Effectiveness: "HIGH",
			Implementation: "Establish behavioral baselines and alert on deviations. Monitor tool usage patterns.",
			TechniqueIDs: []string{"SAFE-T1201", "SAFE-T1104", "SAFE-T1106"},
			CostComplexity: "MEDIUM",
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}
}
