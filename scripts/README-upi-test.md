# UPI Collect Flow Test Script

This script tests the UPI Collect Flow implementation with Paytm integration.

## Features

- ✅ UPI ID validation testing
- ✅ UPI Collect Flow payment creation testing  
- ✅ Paytm webhook handling testing
- ✅ Comprehensive test reporting

## Usage

### Run the test script:

```bash
# Using npm script
npm run test:upi-collect-flow

# Or directly with ts-node
npx ts-node scripts/test-upi-collect-flow.ts

# Or with node (after compilation)
node dist/scripts/test-upi-collect-flow.js
```

### Prerequisites

1. **API Server Running**: Make sure your e-commerce API is running on `http://localhost:3001`
2. **Valid JWT Token**: Update the test script with a real JWT token for authentication
3. **Paytm Configuration**: Ensure Paytm credentials are configured in your `.env` file

### Test Cases

#### 1. UPI ID Validation
Tests various UPI ID formats:
- ✅ Valid: `9856253545@ybl`, `user@paytm`
- ❌ Invalid: `invalid-format`, `user@`, `@bank`

#### 2. UPI Collect Flow Creation
Tests payment intent creation with:
- UPI ID: `9856253545@ybl`
- Amount: ₹250.00
- Provider: Paytm
- Payment Method: UPI

#### 3. Paytm Webhook Handling
Tests webhook processing with mock Paytm UPI data:
- Transaction ID: `TXN_123456789`
- UPI Transaction ID: `UPI_TXN_456789`
- Status: `TXN_SUCCESS`

### Expected Output

```
🚀 Starting UPI Collect Flow Tests...

📊 Test Results:

✅ UPI ID Validation: UPI ID validation test completed
   Data: [
     {
       "upiId": "9856253545@ybl",
       "status": "PASS",
       "message": "Valid UPI ID accepted"
     },
     ...
   ]

✅ UPI Collect Flow Creation: UPI Collect Flow payment created successfully
   Data: {
     "paymentId": "payment-uuid",
     "upiId": "9856253545@ybl",
     "upiCollectFlow": true,
     "paymentUrl": "https://securegw-stage.paytm.in/theia/processTransaction...",
     "merchantId": "hyWQnP84433708275510",
     "orderId": "ORDER_test-order-upi-collect"
   }

✅ Paytm Webhook Handling: Paytm UPI webhook handled successfully
   Data: {
     "received": true,
     "provider": "paytm",
     "upiCollectFlow": true,
     "orderId": "ORDER_test-order-upi-collect",
     "txnId": "TXN_123456789"
   }

🎯 Summary: 3/3 tests passed
🎉 All UPI Collect Flow tests passed!
```

### Configuration

Update these variables in the test script:

```typescript
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const API_PREFIX = process.env.API_PREFIX || 'api/v1';

// Update with real JWT token
'Authorization': 'Bearer YOUR_REAL_JWT_TOKEN'
```

### Troubleshooting

1. **Authentication Error**: Make sure you have a valid JWT token
2. **Connection Error**: Ensure the API server is running
3. **Validation Error**: Check UPI ID format in test cases
4. **Webhook Error**: Verify webhook endpoint is accessible

### Integration with CI/CD

Add to your `package.json`:

```json
{
  "scripts": {
    "test:upi-collect-flow": "ts-node scripts/test-upi-collect-flow.ts",
    "test:upi": "npm run test:upi-collect-flow"
  }
}
```
