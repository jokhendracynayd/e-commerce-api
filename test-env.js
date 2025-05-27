// Test environment variables loading
require('dotenv').config();

console.log('Environment variables test:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Loaded (value hidden)' : 'Not loaded');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Loaded (value hidden)' : 'Not loaded');
console.log('JWT_EXPIRATION:', process.env.JWT_EXPIRATION);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REDIS_HOST:', process.env.REDIS_HOST);
console.log('REDIS_PORT:', process.env.REDIS_PORT); 