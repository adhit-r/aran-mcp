# 🚀 Production Deployment Checklist

## Pre-Deployment Requirements

### ✅ Security
- [ ] All default passwords changed
- [ ] API keys generated and secured
- [ ] SSL certificates obtained and configured
- [ ] Environment variables properly set
- [ ] Database credentials secured
- [ ] CORS origins configured for production domains
- [ ] Rate limiting configured appropriately
- [ ] Input validation enabled on all endpoints

### ✅ Infrastructure
- [ ] Production server provisioned
- [ ] Docker and Docker Compose installed
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] Backup storage configured
- [ ] Monitoring infrastructure ready
- [ ] Log aggregation setup
- [ ] SSL/TLS certificates installed

### ✅ Database
- [ ] Production database created
- [ ] Database migrations tested
- [ ] Backup strategy implemented
- [ ] Connection pooling configured
- [ ] Performance tuning applied
- [ ] Monitoring enabled

### ✅ Application
- [ ] Environment-specific configuration files created
- [ ] Production Docker images built and tested
- [ ] Health checks implemented
- [ ] Graceful shutdown handling
- [ ] Error handling and logging
- [ ] Performance optimization applied

## Deployment Steps

### 1. Environment Setup
```bash
# Copy and configure environment
cp .env.example .env.production
# Edit .env.production with production values

# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 16  # For database passwords
```

### 2. SSL Certificate Setup
```bash
# Using Let's Encrypt (example)
sudo certbot certonly --standalone -d yourdomain.com
# Copy certificates to nginx/ssl/
```

### 3. Database Setup
```bash
# Create production database
createdb aran_mcp_prod
# Run migrations
./scripts/migrate.sh
```

### 4. Deploy Application
```bash
# Run production deployment
./scripts/deploy-production.sh production
```

### 5. Post-Deployment Verification
```bash
# Run health checks
./scripts/health-check.sh

# Run integration tests
./scripts/test-mcp-features.sh

# Verify monitoring
curl http://localhost:9090  # Prometheus
curl http://localhost:3002  # Grafana
```

## Production URLs

### Application
- **Frontend**: https://yourdomain.com
- **API**: https://api.yourdomain.com
- **Health Check**: https://api.yourdomain.com/health

### Monitoring
- **Grafana**: https://monitoring.yourdomain.com:3002
- **Prometheus**: https://monitoring.yourdomain.com:9090 (internal)

## Security Configuration

### Environment Variables (Production)
```bash
# Database
POSTGRES_DB=aran_mcp_prod
POSTGRES_USER=aran_user
POSTGRES_PASSWORD=<secure-password>

# JWT
JWT_SECRET=<32-character-secret>

# API Security
API_KEY=<secure-api-key>
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# SSL
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60

# Monitoring
GRAFANA_PASSWORD=<secure-password>
```

### Firewall Rules
```bash
# Allow SSH (change port if needed)
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow monitoring (restrict to internal network)
ufw allow from 10.0.0.0/8 to any port 9090
ufw allow from 10.0.0.0/8 to any port 3002

# Enable firewall
ufw enable
```

## Monitoring & Alerting

### Key Metrics to Monitor
- [ ] Application uptime and response times
- [ ] Database connection pool usage
- [ ] Memory and CPU usage
- [ ] Disk space usage
- [ ] MCP server availability
- [ ] Tool execution success rates
- [ ] Security events and failed authentications

### Alert Thresholds
- **Critical**: Service down, high error rate (>10%), disk space >90%
- **Warning**: High response time (>1s), memory usage >80%, connection pool >80%
- **Info**: Deployment events, configuration changes

### Alert Channels
- [ ] Email notifications configured
- [ ] Slack/Discord webhooks setup
- [ ] PagerDuty integration (if applicable)
- [ ] SMS alerts for critical issues

## Backup Strategy

### Database Backups
```bash
# Daily automated backup
0 2 * * * docker exec aran-mcp-postgres-prod pg_dump -U aran_user aran_mcp_prod > /backups/daily/$(date +\%Y\%m\%d).sql

# Weekly full backup
0 1 * * 0 docker exec aran-mcp-postgres-prod pg_dumpall -U aran_user > /backups/weekly/$(date +\%Y\%m\%d).sql
```

### Application Backups
- [ ] Configuration files backed up
- [ ] SSL certificates backed up
- [ ] Docker images tagged and stored
- [ ] Log files archived

## Performance Optimization

### Database
- [ ] Connection pooling configured (25 max connections)
- [ ] Query performance analyzed
- [ ] Indexes optimized
- [ ] Vacuum and analyze scheduled

### Application
- [ ] Response compression enabled
- [ ] Static asset caching configured
- [ ] Database query optimization
- [ ] Memory usage profiled

### Infrastructure
- [ ] Load balancing configured (if multiple instances)
- [ ] CDN setup for static assets
- [ ] Caching layers implemented
- [ ] Auto-scaling configured (if cloud deployment)

## Disaster Recovery

### Recovery Procedures
1. **Database Recovery**
   ```bash
   # Restore from backup
   docker exec -i aran-mcp-postgres-prod psql -U aran_user aran_mcp_prod < backup.sql
   ```

2. **Application Recovery**
   ```bash
   # Rollback to previous version
   docker-compose -f docker-compose.prod.yml down
   docker tag aran-mcp-backend:previous aran-mcp-backend:latest
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Full System Recovery**
   - Restore from infrastructure backup
   - Redeploy application
   - Restore database
   - Verify all services

### Recovery Time Objectives
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Data Loss Tolerance**: Maximum 1 hour of data

## Compliance & Security

### Security Auditing
- [ ] Regular security scans scheduled
- [ ] Dependency vulnerability checks
- [ ] Access logs monitored
- [ ] Failed authentication attempts tracked

### Compliance Requirements
- [ ] GDPR compliance (if applicable)
- [ ] SOC2 requirements met
- [ ] Data retention policies implemented
- [ ] Audit trail maintained

## Maintenance Schedule

### Daily
- [ ] Monitor system health
- [ ] Check error logs
- [ ] Verify backup completion
- [ ] Review security alerts

### Weekly
- [ ] Update dependencies
- [ ] Review performance metrics
- [ ] Test backup restoration
- [ ] Security scan

### Monthly
- [ ] Full system backup
- [ ] Performance review
- [ ] Capacity planning
- [ ] Security audit

## Support & Documentation

### Runbooks
- [ ] Incident response procedures
- [ ] Deployment procedures
- [ ] Backup and recovery procedures
- [ ] Troubleshooting guides

### Contact Information
- **Primary On-Call**: [Your contact]
- **Secondary On-Call**: [Backup contact]
- **Infrastructure Team**: [Team contact]
- **Security Team**: [Security contact]

---

## ✅ Final Verification

Before going live, verify:
- [ ] All checklist items completed
- [ ] Load testing performed
- [ ] Security testing completed
- [ ] Monitoring and alerting working
- [ ] Backup and recovery tested
- [ ] Documentation updated
- [ ] Team trained on procedures

**Deployment Approved By**: _________________ **Date**: _________

**Production Go-Live**: _________________ **Time**: _________