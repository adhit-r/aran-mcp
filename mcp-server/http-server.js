#!/usr/bin/env node

import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Server info
const serverInfo = {
  name: 'aran-filesystem-server',
  version: '1.0.0',
  capabilities: [
    'read_file',
    'write_file',
    'list_directory',
    'get_server_info'
  ],
  uptime: process.uptime(),
  memoryUsage: process.memoryUsage(),
  status: 'online'
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Server info endpoint
app.get('/info', (req, res) => {
  res.json({
    ...serverInfo,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
});

// MCP-like endpoints for testing
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'read_file',
        description: 'Read a file from the filesystem',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the file' },
            content: { type: 'string', description: 'Content to write' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the directory' }
          },
          required: ['path']
        }
      }
    ]
  });
});

// Simulate tool execution
app.post('/tools/:toolName', (req, res) => {
  const { toolName } = req.params;
  const { path, content } = req.body;

  // Simulate tool execution
  setTimeout(() => {
    switch (toolName) {
      case 'read_file':
        res.json({
          success: true,
          result: `Content of ${path}`,
          metadata: {
            size: Math.floor(Math.random() * 1000),
            modified: new Date().toISOString()
          }
        });
        break;
      case 'write_file':
        res.json({
          success: true,
          result: `File ${path} written successfully`,
          metadata: {
            bytesWritten: content?.length || 0
          }
        });
        break;
      case 'list_directory':
        res.json({
          success: true,
          result: [
            { name: 'file1.txt', type: 'file', size: 1024 },
            { name: 'file2.txt', type: 'file', size: 2048 },
            { name: 'subdir', type: 'directory' }
          ]
        });
        break;
      default:
        res.status(404).json({ error: 'Tool not found' });
    }
  }, Math.random() * 100); // Simulate response time
});

// Security test endpoint (for testing security issues)
app.post('/security-test', (req, res) => {
  const { testType, payload } = req.body;
  
  // Simulate different security test scenarios
  switch (testType) {
    case 'injection':
      // Simulate potential injection vulnerability
      if (payload && payload.includes(';')) {
        res.json({
          vulnerable: true,
          severity: 'high',
          description: 'Potential command injection detected',
          recommendation: 'Sanitize input parameters'
        });
      } else {
        res.json({
          vulnerable: false,
          description: 'No injection patterns detected'
        });
      }
      break;
    case 'auth':
      // Simulate authentication bypass
      res.json({
        vulnerable: false,
        description: 'Authentication mechanism appears secure'
      });
      break;
    case 'rate-limit':
      // Simulate rate limiting test
      res.json({
        vulnerable: true,
        severity: 'medium',
        description: 'No rate limiting detected',
        recommendation: 'Implement rate limiting'
      });
      break;
    default:
      res.status(400).json({ error: 'Invalid test type' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`MCP HTTP Server running on http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /info - Server information');
  console.log('  GET  /tools - List available tools');
  console.log('  POST /tools/:toolName - Execute tool');
  console.log('  POST /security-test - Security testing');
});


