# Aran MCP Sentinel - System Architecture

## 🏗️ Overview

Aran MCP Sentinel is built as a microservices architecture with clear separation of concerns, designed for scalability, security, and maintainability.

## 🎯 Architecture Principles

- **Microservices**: Loosely coupled, independently deployable services
- **API-First**: All components communicate via well-defined APIs
- **Security by Design**: Security considerations at every layer
- **Observability**: Comprehensive monitoring and logging
- **Scalability**: Horizontal scaling capabilities
- **Resilience**: Fault tolerance and graceful degradation

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Web UI (Next.js)  │  Mobile App  │  CLI Tool  │  API Clients  │
├─────────────────────────────────────────────────────────────────┤
│                        API Gateway                              │
├─────────────────────────────────────────────────────────────────┤
│  Load Balancer  │  Rate Limiting  │  Authentication  │  Routing  │
├─────────────────────────────────────────────────────────────────┤
│                        Service Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  MCP Manager  │  Security Engine  │  Analytics  │  User Mgmt    │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Redis Cache  │  Message Queue  │  File Storage  │
├─────────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  Kubernetes  │  Docker  │  Monitoring  │  Logging  │  CI/CD     │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Core Components

### Frontend (Next.js)
- **Framework**: Next.js 15.5.0 with App Router
- **UI Library**: React 19.1.0 with TypeScript
- **Styling**: Tailwind CSS 4.0 with custom design system
- **State Management**: React Query for server state
- **Authentication**: JWT-based with refresh tokens

### Backend (Go)
- **Framework**: Gin web framework
- **Language**: Go 1.21+
- **Database**: PostgreSQL with GORM ORM
- **Cache**: Redis for session and data caching
- **Message Queue**: RabbitMQ for async processing

### MCP Server (Node.js)
- **Runtime**: Node.js with ES modules
- **Protocol**: Model Context Protocol (MCP) SDK
- **Tools**: Filesystem operations, server info, directory listing
- **Security**: Sandboxed execution environment

### Database Layer
- **Primary**: PostgreSQL for persistent data
- **Cache**: Redis for session management and caching
- **Search**: Elasticsearch for full-text search
- **Analytics**: ClickHouse for time-series data

## 🔐 Security Architecture

### Authentication & Authorization
```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layer                           │
├─────────────────────────────────────────────────────────────┤
│  JWT Tokens  │  RBAC  │  API Keys  │  SSO Integration      │
├─────────────────────────────────────────────────────────────┤
│  Rate Limiting  │  Input Validation  │  CORS  │  CSP        │
├─────────────────────────────────────────────────────────────┤
│  TLS/SSL  │  Certificate Pinning  │  HSTS  │  Secure Headers │
└─────────────────────────────────────────────────────────────┘
```

### Threat Detection Pipeline
```
┌─────────────────────────────────────────────────────────────┐
│                Threat Detection Pipeline                    │
├─────────────────────────────────────────────────────────────┤
│  Input Sanitization  │  Pattern Matching  │  ML Detection   │
├─────────────────────────────────────────────────────────────┤
│  Behavioral Analysis  │  Anomaly Detection  │  Risk Scoring  │
├─────────────────────────────────────────────────────────────┤
│  Alert Generation  │  Response Automation  │  Forensics     │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Architecture

### Request Flow
1. **Client Request** → API Gateway
2. **Authentication** → JWT validation
3. **Authorization** → RBAC check
4. **Rate Limiting** → Request throttling
5. **Service Layer** → Business logic
6. **Data Layer** → Database operations
7. **Response** → Client

### MCP Server Communication
1. **MCP Client** → MCP Server
2. **Tool Invocation** → Sandboxed execution
3. **Result Processing** → Security validation
4. **Response** → Client with audit trail

## 🚀 Deployment Architecture

### Development Environment
```
┌─────────────────────────────────────────────────────────────┐
│                  Development Stack                          │
├─────────────────────────────────────────────────────────────┤
│  Docker Compose  │  Local DB  │  Hot Reload  │  Debug Tools │
└─────────────────────────────────────────────────────────────┘
```

### Production Environment
```
┌─────────────────────────────────────────────────────────────┐
│                   Production Stack                          │
├─────────────────────────────────────────────────────────────┤
│  Kubernetes  │  Load Balancer  │  Auto Scaling  │  Monitoring │
├─────────────────────────────────────────────────────────────┤
│  CDN  │  WAF  │  DDoS Protection  │  SSL Termination        │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Monitoring & Observability

### Metrics Collection
- **Application Metrics**: Prometheus + Grafana
- **Infrastructure Metrics**: Node Exporter + cAdvisor
- **Business Metrics**: Custom dashboards
- **Security Metrics**: Threat detection rates

### Logging Strategy
- **Centralized Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: DEBUG, INFO, WARN, ERROR, FATAL
- **Retention**: 90 days for application logs, 1 year for audit logs

### Distributed Tracing
- **Tracing**: Jaeger for request tracing
- **Correlation**: Request IDs across services
- **Performance**: Latency and throughput monitoring
- **Debugging**: Error tracking and root cause analysis

## 🔄 CI/CD Pipeline

### Build Pipeline
1. **Code Commit** → GitHub
2. **Build Trigger** → GitHub Actions
3. **Tests** → Unit, Integration, E2E
4. **Security Scan** → SAST, DAST, Dependency scan
5. **Build Images** → Docker containers
6. **Push Registry** → Container registry

### Deployment Pipeline
1. **Staging Deploy** → Automated testing
2. **Security Review** → Manual approval
3. **Production Deploy** → Blue-green deployment
4. **Health Check** → Automated validation
5. **Rollback** → Automatic on failure

## 📈 Scalability Considerations

### Horizontal Scaling
- **Stateless Services**: All services designed for horizontal scaling
- **Load Balancing**: Round-robin with health checks
- **Auto Scaling**: Kubernetes HPA based on CPU/memory
- **Database Scaling**: Read replicas and connection pooling

### Performance Optimization
- **Caching Strategy**: Multi-level caching (Redis, CDN, Browser)
- **Database Optimization**: Indexing, query optimization
- **CDN**: Static asset delivery
- **Compression**: Gzip/Brotli for API responses

## 🛡️ Security Considerations

### Network Security
- **VPC**: Isolated network segments
- **Firewall**: Restrictive ingress/egress rules
- **WAF**: Web Application Firewall
- **DDoS Protection**: Cloud-based protection

### Data Security
- **Encryption at Rest**: AES-256 for databases
- **Encryption in Transit**: TLS 1.3 for all communications
- **Key Management**: Hardware Security Modules (HSM)
- **Data Classification**: Sensitive data handling policies

### Application Security
- **Input Validation**: All inputs sanitized
- **Output Encoding**: XSS prevention
- **SQL Injection**: Parameterized queries
- **CSRF Protection**: Token-based protection

## 🔧 Technology Decisions

### Why Go for Backend?
- **Performance**: High concurrency and low latency
- **Simplicity**: Easy to maintain and deploy
- **Ecosystem**: Rich libraries for security and monitoring
- **Team Expertise**: Existing Go knowledge

### Why Next.js for Frontend?
- **Performance**: Server-side rendering and optimization
- **Developer Experience**: Hot reload and TypeScript support
- **Ecosystem**: Rich component libraries
- **SEO**: Better search engine optimization

### Why PostgreSQL?
- **ACID Compliance**: Strong consistency guarantees
- **JSON Support**: Flexible schema for MCP metadata
- **Performance**: Excellent query performance
- **Ecosystem**: Rich tooling and monitoring

## 📋 Future Architecture Considerations

### Microservices Evolution
- **Service Mesh**: Istio for service-to-service communication
- **Event Sourcing**: CQRS pattern for audit trails
- **GraphQL**: Unified API for complex queries
- **gRPC**: High-performance inter-service communication

### AI/ML Integration
- **Model Serving**: TensorFlow Serving for ML models
- **Feature Store**: Centralized feature management
- **MLOps**: Automated model training and deployment
- **Edge Computing**: Local model inference

---

*This architecture document is maintained alongside the codebase and updated as the system evolves.*
