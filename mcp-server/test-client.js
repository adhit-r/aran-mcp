#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCPServer() {
  console.log('🚀 Testing Aran MCP Filesystem Server...\n');

  // Create client transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['server.js'],
  });

  // Create client
  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    // Connect to server
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // List available tools
    const tools = await client.listTools();
    console.log('📋 Available tools:');
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Test get_server_info
    console.log('🔍 Testing get_server_info...');
    const serverInfo = await client.callTool({
      name: 'get_server_info',
      arguments: {}
    });
    console.log('Server Info:', serverInfo.content[0].text);
    console.log('');

    // Test list_directory
    console.log('📁 Testing list_directory...');
    const dirListing = await client.callTool({
      name: 'list_directory',
      arguments: { path: '.' }
    });
    console.log('Directory Listing:', dirListing.content[0].text);
    console.log('');

    console.log('✅ All tests passed! MCP server is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await client.close();
  }
}

testMCPServer().catch(console.error);
