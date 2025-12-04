# Troubleshooting Guide

Common issues and solutions for Aran MCP Sentinel.

## Backend Issues

### Database Connection Errors

**Problem**: Cannot connect to database

**Solutions**:
1. Verify database is running
2. Check connection string in config
3. Verify network connectivity
4. Check firewall rules
5. Verify credentials

### Authentication Failures

**Problem**: Authentication not working

**Solutions**:
1. Verify JWT secret is set
2. Check token expiration
3. Verify provider configuration
4. Check middleware order

### High Memory Usage

**Problem**: Backend using too much memory

**Solutions**:
1. Check for memory leaks
2. Reduce connection pool size
3. Enable garbage collection tuning
4. Review query patterns

## Frontend Issues

### API Connection Errors

**Problem**: Frontend cannot connect to backend

**Solutions**:
1. Verify API URL in `.env.local`
2. Check CORS configuration
3. Verify backend is running
4. Check network connectivity

### Build Errors

**Problem**: Frontend build fails

**Solutions**:
1. Clear `.next` directory
2. Delete `node_modules` and reinstall
3. Check TypeScript errors
4. Verify Node.js version

### Performance Issues

**Problem**: Slow page loads

**Solutions**:
1. Enable production build
2. Optimize images
3. Check bundle size
4. Enable caching

## Database Issues

### Migration Errors

**Problem**: Migrations fail

**Solutions**:
1. Check database version
2. Verify migration order
3. Check for conflicts
4. Review migration SQL

### Slow Queries

**Problem**: Database queries are slow

**Solutions**:
1. Add indexes
2. Optimize queries
3. Check connection pooling
4. Review query plans

## Deployment Issues

### Container Won't Start

**Problem**: Docker container exits immediately

**Solutions**:
1. Check container logs
2. Verify environment variables
3. Check resource limits
4. Review Dockerfile

### SSL Certificate Issues

**Problem**: SSL certificate errors

**Solutions**:
1. Verify certificate validity
2. Check certificate chain
3. Verify domain configuration
4. Check certificate permissions

## Getting Help

If you cannot resolve an issue:

1. Check logs for error messages
2. Search existing issues on GitHub
3. Review documentation
4. Open a new issue with details

## Log Locations

- Backend: Check application logs
- Frontend: Browser console
- Database: PostgreSQL logs
- Docker: `docker-compose logs`

