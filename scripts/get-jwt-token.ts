#!/usr/bin/env node

/**
 * Get JWT Token Script
 * Creates a new JWT token for testing
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const API_PREFIX = process.env.API_PREFIX || 'api/v1';

interface LoginResponse {
  statusCode: number;
  message: string;
  data: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      phone: string | null;
      is_email_verified: boolean;
      is_phone_verified: boolean;
      status: string;
    };
  };
  timestamp: string;
  path: string;
}

class TokenGenerator {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/${API_PREFIX}`;
  }

  /**
   * Create a new user account
   */
  async createUser(email: string, password: string): Promise<LoginResponse | null> {
    try {
      console.log('👤 Creating user account...');
      
      const response = await axios.post(`${this.baseUrl}/auth/register`, {
        email: email,
        password: password,
        fullName: 'Test User'
      });

      console.log('✅ User created successfully');
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  User already exists, proceeding to login...');
        return null;
      }
      console.error('❌ Error creating user:', error.response?.data?.message || error.message);
      return null;
    }
  }

  /**
   * Login user and get JWT token
   */
  async loginUser(email: string, password: string): Promise<LoginResponse | null> {
    try {
      console.log('🔐 Logging in user...');
      
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        email: email,
        password: password
      });

      console.log('✅ Login successful');
      console.log('📋 Login response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data?.message || error.message);
      return null;
    }
  }

  /**
   * Get JWT token (create user if needed, then login)
   */
  async getJWTToken(email: string, password: string): Promise<string | null> {
    try {
      // Try to create user first
      await this.createUser(email, password);
      
      // Login to get token
      const loginResponse = await this.loginUser(email, password);
      
      if (loginResponse && loginResponse.data && loginResponse.data.accessToken) {
        console.log('🎉 JWT Token obtained successfully!');
        console.log('📋 Token Details:');
        console.log(`   User ID: ${loginResponse.data.user.id}`);
        console.log(`   Email: ${loginResponse.data.user.email}`);
        console.log(`   Role: ${loginResponse.data.user.role}`);
        console.log(`   Token: ${loginResponse.data.accessToken}`);
        
        return loginResponse.data.accessToken;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get JWT token:', error.message);
      return null;
    }
  }
}

// Main execution
async function main() {
  const email = 'nothing@nothing.com';
  const password = 'Nothing@123';
  
  console.log('🚀 Getting JWT Token for UPI Simulator...\n');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`🌐 API URL: ${API_BASE_URL}/${API_PREFIX}\n`);

  const tokenGenerator = new TokenGenerator();
  const token = await tokenGenerator.getJWTToken(email, password);

  if (token) {
    console.log('\n🎯 Next Steps:');
    console.log('1. Copy the token above');
    console.log('2. Update the JWT_TOKEN variable in upi-simulator.html');
    console.log('3. Refresh the simulator page');
    console.log('\n💡 Or run: node -r ts-node/register scripts/update-simulator-token.ts');
  } else {
    console.log('\n❌ Failed to get JWT token. Please check:');
    console.log('1. API server is running on', API_BASE_URL);
    console.log('2. Email and password are correct');
    console.log('3. Network connection is working');
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script execution failed:', error.message);
    process.exit(1);
  });
}

export { TokenGenerator };
