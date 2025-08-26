#!/usr/bin/env node

/**
 * Test MCP server with Twitter tools
 */

import { spawn } from 'child_process';
import readline from 'readline';

async function testMCPServer() {
  console.log('Starting Playwright MCP server...');
  
  // Start the MCP server
  const mcpProcess = spawn('node', ['cli.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      DEBUG: 'pw:mcp:*'
    }
  });

  // Create readline interface for interactive communication
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Handle server output
  mcpProcess.stdout.on('data', (data) => {
    const output = data.toString();
    try {
      const json = JSON.parse(output);
      console.log('MCP Response:', JSON.stringify(json, null, 2));
    } catch {
      console.log('MCP Server:', output);
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    console.error('MCP Debug:', data.toString());
  });

  mcpProcess.on('close', (code) => {
    console.log(`MCP server exited with code ${code}`);
    rl.close();
    process.exit(code);
  });

  // Send initialization request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  console.log('Sending initialization request...');
  mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 3000));

  // List available tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  console.log('\nListing available tools...');
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Wait to see tools
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test if twitter tools are available
  const twitterFetchRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'twitter_fetch_and_report',
      arguments: {
        keyword: 'technology',
        maxPosts: 3,
        sortBy: 'latest',
        format: 'both'
      }
    }
  };

  console.log('\nTesting Twitter fetch and report...');
  mcpProcess.stdin.write(JSON.stringify(twitterFetchRequest) + '\n');

  // Wait for completion
  await new Promise(resolve => setTimeout(resolve, 30000));

  console.log('\nTest completed. Shutting down...');
  mcpProcess.kill();
}

testMCPServer().catch(console.error);