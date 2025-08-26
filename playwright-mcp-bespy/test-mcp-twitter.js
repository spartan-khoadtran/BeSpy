#!/usr/bin/env node

/**
 * Test MCP server with Twitter tools
 */

const { spawn } = require('child_process');
const readline = require('readline');

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
    console.log('MCP Server:', data.toString());
  });

  mcpProcess.stderr.on('data', (data) => {
    console.error('MCP Error:', data.toString());
  });

  mcpProcess.on('close', (code) => {
    console.log(`MCP server exited with code ${code}`);
    rl.close();
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

  // Wait a bit for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  // List available tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  console.log('Listing available tools...');
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Test Twitter search tool
  const twitterSearchRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'twitter_search',
      arguments: {
        keyword: 'AI technology',
        sortBy: 'latest'
      }
    }
  };

  console.log('Testing Twitter search...');
  mcpProcess.stdin.write(JSON.stringify(twitterSearchRequest) + '\n');

  // Interactive prompt
  console.log('\nMCP server is running. You can send commands or type "exit" to quit.\n');
  
  rl.on('line', (input) => {
    if (input.toLowerCase() === 'exit') {
      mcpProcess.kill();
      rl.close();
    } else {
      try {
        const request = JSON.parse(input);
        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      } catch (e) {
        console.error('Invalid JSON:', e.message);
      }
    }
  });
}

testMCPServer().catch(console.error);