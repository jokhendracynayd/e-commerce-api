const { PrismaClient } = require('@prisma/client');

// This script tests if the Payment model is properly available in the Prisma client
async function testPrismaModels() {
  try {
    console.log('Creating Prisma Client instance...');
    const prisma = new PrismaClient();
    
    console.log('Available models in Prisma client:');
    const models = Object.keys(prisma).filter(key => 
      !key.startsWith('_') && 
      !key.startsWith('$') && 
      typeof prisma[key] === 'object'
    );
    
    console.log(models);
    
    // Check if payment model exists
    if (models.includes('payment')) {
      console.log('\nPayment model exists in Prisma client!');
      
      // Try to access payment model
      try {
        console.log('Attempting to query Payment model...');
        const paymentCount = await prisma.payment.count();
        console.log(`Number of Payment records: ${paymentCount}`);
      } catch (error) {
        console.error('\nError accessing Payment model:', error.message);
      }
    } else {
      console.error('\nPayment model does NOT exist in Prisma client!');
      console.log('\nThis could be because:');
      console.log('1. The model is not properly defined in schema.prisma');
      console.log('2. Prisma client was not regenerated after adding the model');
      console.log('3. There might be a caching issue with the Prisma client');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error testing Prisma models:', error);
  }
}

testPrismaModels();

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