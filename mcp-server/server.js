#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the server
const server = new Server(
  {
    name: 'aran-filesystem-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file to read',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file to write',
            },
            content: {
              type: 'string',
              description: 'The content to write to the file',
            },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'list_directory',
        description: 'List the contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the directory to list',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'get_server_info',
        description: 'Get information about this MCP server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'read_file': {
        const { path: filePath } = args;
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: `File contents of ${filePath}:\n\n${content}`,
            },
          ],
        };
      }

      case 'write_file': {
        const { path: filePath, content } = args;
        await fs.writeFile(filePath, content, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: `Successfully wrote content to ${filePath}`,
            },
          ],
        };
      }

      case 'list_directory': {
        const { path: dirPath } = args;
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        const listing = items.map(item => ({
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
          path: path.join(dirPath, item.name),
        }));
        
        return {
          content: [
            {
              type: 'text',
              text: `Directory listing for ${dirPath}:\n\n${listing.map(item => 
                `${item.type === 'directory' ? '📁' : '📄'} ${item.name}`
              ).join('\n')}`,
            },
          ],
        };
      }

      case 'get_server_info': {
        return {
          content: [
            {
              type: 'text',
              text: `Aran MCP Filesystem Server v1.0.0
              
Server Status: ✅ Online
Capabilities: File operations, directory listing
Uptime: ${process.uptime().toFixed(2)} seconds
Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
Available Tools: read_file, write_file, list_directory, get_server_info

This is a real MCP server providing filesystem operations for the Aran MCP Sentinel platform.`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Aran MCP Filesystem Server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
