const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Log all available models
console.log('Available models in PrismaClient:');
const models = Object.keys(prisma).filter(key => 
  !key.startsWith('_') && 
  !key.startsWith('$') && 
  typeof prisma[key] === 'object'
);

console.log(models);

// Try to access all models from the schema
console.log('\nTrying to access models from schema:');
const modelNames = [
  'user', 'brand', 'category', 'tag', 'product', 
  'productImage', 'productVariant', 'productTag', 
  'productDeal', 'productReview', 'cart', 'cartItem',
  'order', 'orderItem', 'inventory', 'inventoryLog',
  'address', 'wishlistItem', 'coupon', 'couponCategory',
  'couponProduct', 'couponUsage', 
  'productSpecification', 'specificationTemplate'
];

for (const modelName of modelNames) {
  try {
    // Just check if the model exists by trying to access it
    const hasModel = !!prisma[modelName];
    console.log(`${modelName}: ${hasModel ? 'Available' : 'Not available'}`);
  } catch (error) {
    console.log(`${modelName}: Error - ${error.message}`);
  }
} 