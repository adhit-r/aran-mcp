# Deployment Guide

This guide covers deploying Aran MCP Sentinel to production environments.

## Prerequisites

- Docker and Docker Compose
- PostgreSQL database (14+)
- Domain name (optional)
- SSL certificate (for HTTPS)

## Production Checklist

- [ ] Database backups configured
- [ ] Environment variables set
- [ ] SSL/TLS configured
- [ ] Monitoring set up
- [ ] Logging configured
- [ ] Security hardening applied

## Docker Deployment

### 1. Environment Configuration

Create `.env` file:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 2. Build and Deploy

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Run Migrations

```bash
docker-compose exec backend go run cmd/migrate/main.go
```

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace aran-mcp
```

### 2. Deploy Secrets

```bash
kubectl create secret generic aran-mcp-secrets \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=jwt-secret=$JWT_SECRET
```

### 3. Deploy Application

```bash
kubectl apply -f k8s/
```

## Configuration

### Database

- Use connection pooling
- Configure backups
- Set up replication for HA

### Security

- Enable HTTPS
- Configure CORS
- Set up rate limiting
- Enable audit logging

### Monitoring

- Set up Prometheus
- Configure Grafana dashboards
- Set up alerting

## Scaling

### Horizontal Scaling

- Deploy multiple backend instances
- Use load balancer
- Configure database connection pooling

### Vertical Scaling

- Increase container resources
- Optimize database queries
- Add caching layer

## Backup and Recovery

### Database Backups

Configure automated backups:

```bash
# Daily backup
0 2 * * * pg_dump aran_mcp > backup_$(date +\%Y\%m\%d).sql
```

### Recovery Procedure

1. Stop application
2. Restore database
3. Verify data integrity
4. Restart application

## Monitoring

### Health Checks

- Application health: `/health`
- Database connectivity
- External service availability

### Metrics

- Request rate
- Error rate
- Response times
- Resource usage

## Troubleshooting

See [Troubleshooting Guide](Troubleshooting) for common issues.

## Security Hardening

- Use strong passwords
- Enable firewall rules
- Regular security updates
- SSL/TLS configuration
- Security headers

## Support

For deployment issues, see:
- [Troubleshooting Guide](Troubleshooting)
- [FAQ](FAQ)
- GitHub Issues

