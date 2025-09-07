# Paytm Success & Failure API Endpoints

## 🎯 **Overview**

This document describes the Paytm success and failure API endpoints that handle payment redirects from Paytm's payment gateway. These endpoints are essential for processing payment completion and handling user redirects.

## 🚀 **API Endpoints**

### **1. Payment Success Endpoint**

#### **Endpoint**
```
GET /api/v1/payments/success
```

#### **Description**
Handles successful payment redirects from Paytm. This endpoint processes the payment response, verifies the checksum, updates the payment status, and provides redirect information.

#### **Query Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ORDERID` | string | Yes | Paytm order ID |
| `TXNID` | string | Yes | Paytm transaction ID |
| `TXNAMOUNT` | string | Yes | Transaction amount |
| `STATUS` | string | Yes | Payment status (TXN_SUCCESS/TXN_FAILURE) |
| `RESPCODE` | string | Yes | Response code from Paytm |
| `RESPMSG` | string | Yes | Response message from Paytm |
| `TXNDATE` | string | No | Transaction date |
| `BANKTXNID` | string | No | Bank transaction ID |
| `GATEWAYNAME` | string | No | Gateway name |
| `BANKNAME` | string | No | Bank name |
| `PAYMENTMODE` | string | No | Payment mode |
| `CHECKSUMHASH` | string | Yes | Paytm checksum for verification |

#### **Example Request**
```bash
GET /api/v1/payments/success?ORDERID=ORDER_123&TXNID=TXN_456&TXNAMOUNT=100.00&STATUS=TXN_SUCCESS&RESPCODE=01&RESPMSG=Success&CHECKSUMHASH=abc123def456
```

#### **Success Response**
```json
{
  "success": true,
  "message": "Payment successful",
  "orderId": "ORDER_123",
  "transactionId": "TXN_456",
  "amount": "100.00",
  "status": "TXN_SUCCESS",
  "redirectUrl": "http://localhost:3000/payment/success?orderId=ORDER_123&txnId=TXN_456",
  "paytmResponse": {
    "ORDERID": "ORDER_123",
    "TXNID": "TXN_456",
    "TXNAMOUNT": "100.00",
    "STATUS": "TXN_SUCCESS",
    "RESPCODE": "01",
    "RESPMSG": "Success",
    "BANKTXNID": "BANK_TXN_789",
    "GATEWAYNAME": "PAYTM",
    "BANKNAME": "HDFC",
    "PAYMENTMODE": "UPI",
    "CHECKSUMHASH": "abc123def456"
  }
}
```

#### **Failure Response (when payment failed)**
```json
{
  "success": false,
  "message": "Payment failed",
  "orderId": "ORDER_123",
  "transactionId": "TXN_456",
  "amount": "100.00",
  "status": "TXN_FAILURE",
  "errorCode": "E001",
  "errorMessage": "Payment failed due to insufficient funds",
  "redirectUrl": "http://localhost:3000/payment/failure?orderId=ORDER_123&error=E001",
  "paytmResponse": {
    "ORDERID": "ORDER_123",
    "TXNID": "TXN_456",
    "TXNAMOUNT": "100.00",
    "STATUS": "TXN_FAILURE",
    "RESPCODE": "E001",
    "RESPMSG": "Payment failed due to insufficient funds",
    "CHECKSUMHASH": "abc123def456"
  }
}
```

---

### **2. Payment Failure Endpoint**

#### **Endpoint**
```
GET /api/v1/payments/failure
```

#### **Description**
Handles failed payment redirects from Paytm. This endpoint processes the payment failure response, verifies the checksum (if available), updates the payment status, and provides redirect information.

#### **Query Parameters**
Same as success endpoint, but typically with `STATUS=TXN_FAILURE`.

#### **Example Request**
```bash
GET /api/v1/payments/failure?ORDERID=ORDER_123&TXNID=TXN_456&TXNAMOUNT=100.00&STATUS=TXN_FAILURE&RESPCODE=E001&RESPMSG=Payment failed&CHECKSUMHASH=abc123def456
```

#### **Response**
```json
{
  "success": false,
  "message": "Payment failed",
  "orderId": "ORDER_123",
  "transactionId": "TXN_456",
  "amount": "100.00",
  "status": "TXN_FAILURE",
  "errorCode": "E001",
  "errorMessage": "Payment failed due to insufficient funds",
  "redirectUrl": "http://localhost:3000/payment/failure?orderId=ORDER_123&error=E001",
  "paytmResponse": {
    "ORDERID": "ORDER_123",
    "TXNID": "TXN_456",
    "TXNAMOUNT": "100.00",
    "STATUS": "TXN_FAILURE",
    "RESPCODE": "E001",
    "RESPMSG": "Payment failed due to insufficient funds",
    "CHECKSUMHASH": "abc123def456"
  }
}
```

## 🔧 **Configuration**

### **Environment Variables**

```bash
# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000

# Paytm Configuration
PAYTM_MERCHANT_ID=your_merchant_id
PAYTM_MERCHANT_KEY=your_merchant_key
PAYTM_CALLBACK_URL=http://localhost:3001/api/v1/payments/webhooks/paytm
```

### **Paytm Dashboard Configuration**

1. **Login to Paytm Business Dashboard**
2. **Go to Developer → Webhooks**
3. **Configure Callback URLs:**
   - **Success URL**: `http://localhost:3001/api/v1/payments/success`
   - **Failure URL**: `http://localhost:3001/api/v1/payments/failure`
   - **Webhook URL**: `http://localhost:3001/api/v1/payments/webhooks/paytm`

## 🔒 **Security Features**

### **Checksum Verification**
- All requests are verified using Paytm's checksum
- Uses HMAC-SHA256 for signature verification
- Timing-safe comparison to prevent timing attacks

### **Input Validation**
- Validates all required parameters
- Sanitizes input data
- Handles missing or invalid parameters gracefully

### **Error Handling**
- Comprehensive error handling for invalid checksums
- Graceful handling of missing parameters
- Detailed error messages for debugging

## 🧪 **Testing**

### **Test Success Flow**
```bash
# Test successful payment
curl "http://localhost:3001/api/v1/payments/success?ORDERID=TEST_ORDER_123&TXNID=TEST_TXN_456&TXNAMOUNT=100.00&STATUS=TXN_SUCCESS&RESPCODE=01&RESPMSG=Success&CHECKSUMHASH=test_checksum"
```

### **Test Failure Flow**
```bash
# Test failed payment
curl "http://localhost:3001/api/v1/payments/failure?ORDERID=TEST_ORDER_123&TXNID=TEST_TXN_456&TXNAMOUNT=100.00&STATUS=TXN_FAILURE&RESPCODE=E001&RESPMSG=Payment failed&CHECKSUMHASH=test_checksum"
```

### **Test Without Checksum (Development)**
```bash
# Test without checksum (for development)
curl "http://localhost:3001/api/v1/payments/success?ORDERID=TEST_ORDER_123&TXNID=TEST_TXN_456&TXNAMOUNT=100.00&STATUS=TXN_SUCCESS&RESPCODE=01&RESPMSG=Success"
```

## 🔄 **Payment Flow**

### **Complete Payment Flow**
1. **User initiates payment** → Paytm payment page
2. **User completes payment** → Paytm processes payment
3. **Paytm redirects to success/failure URL** → Our API endpoint
4. **API verifies checksum** → Security validation
5. **API processes payment** → Updates database
6. **API returns response** → Frontend redirect information
7. **Frontend redirects user** → Success/failure page

### **Success Flow**
```
User Payment → Paytm Success → /api/v1/payments/success → Frontend Success Page
```

### **Failure Flow**
```
User Payment → Paytm Failure → /api/v1/payments/failure → Frontend Failure Page
```

## 📊 **Response Codes**

### **Paytm Response Codes**
| Code | Description |
|------|-------------|
| `01` | Success |
| `E001` | Insufficient funds |
| `E002` | Invalid card |
| `E003` | Transaction timeout |
| `E004` | Network error |
| `E005` | Bank declined |

### **API Response Codes**
| Code | Description |
|------|-------------|
| `200` | Success |
| `400` | Bad Request (missing parameters) |
| `401` | Unauthorized (invalid checksum) |
| `500` | Internal Server Error |

## 🚨 **Error Handling**

### **Common Errors**

#### **1. Invalid Checksum**
```json
{
  "statusCode": 401,
  "message": "Invalid Paytm response signature",
  "error": "Unauthorized"
}
```

#### **2. Missing Parameters**
```json
{
  "statusCode": 400,
  "message": "Missing required parameters",
  "error": "Bad Request"
}
```

#### **3. Invalid Amount**
```json
{
  "statusCode": 400,
  "message": "Invalid transaction amount",
  "error": "Bad Request"
}
```

## 🔧 **Integration Examples**

### **Frontend Integration**

#### **Success Page**
```javascript
// Handle success redirect
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');
const txnId = urlParams.get('txnId');

if (orderId && txnId) {
  // Show success message
  showSuccessMessage(`Payment successful! Order ID: ${orderId}`);
  
  // Redirect to order details
  window.location.href = `/orders/${orderId}`;
}
```

#### **Failure Page**
```javascript
// Handle failure redirect
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('orderId');
const error = urlParams.get('error');

if (orderId && error) {
  // Show error message
  showErrorMessage(`Payment failed! Error: ${error}`);
  
  // Redirect to payment retry
  window.location.href = `/payment/retry?orderId=${orderId}`;
}
```

### **Backend Integration**

#### **Payment Processing**
```typescript
// The API automatically processes payments
// No additional integration needed
// Just configure the callback URLs in Paytm dashboard
```

## 📈 **Monitoring & Logging**

### **Logging**
- All payment success/failure events are logged
- Checksum verification results are logged
- Error details are logged for debugging

### **Monitoring**
- Track payment success rates
- Monitor API response times
- Alert on high failure rates

## 🎯 **Best Practices**

### **1. Security**
- Always verify checksums
- Use HTTPS in production
- Validate all input parameters
- Implement rate limiting

### **2. Error Handling**
- Handle all possible error scenarios
- Provide meaningful error messages
- Log errors for debugging
- Implement retry mechanisms

### **3. Performance**
- Keep response times low
- Implement caching where appropriate
- Monitor API performance
- Optimize database queries

### **4. User Experience**
- Provide clear success/failure messages
- Implement proper redirects
- Show loading states
- Handle network errors gracefully

## 🚀 **Production Checklist**

- [ ] **Configure HTTPS** - Use HTTPS for all endpoints
- [ ] **Set up monitoring** - Monitor API performance and errors
- [ ] **Configure logging** - Set up comprehensive logging
- [ ] **Test thoroughly** - Test all success/failure scenarios
- [ ] **Set up alerts** - Alert on high failure rates
- [ ] **Backup strategy** - Implement data backup
- [ ] **Security audit** - Review security measures
- [ ] **Performance testing** - Load test the endpoints

---

## 🎉 **Summary**

The Paytm success and failure API endpoints provide:

✅ **Secure Payment Processing** - Checksum verification and validation
✅ **Comprehensive Error Handling** - Graceful handling of all scenarios
✅ **Frontend Integration** - Easy redirect handling
✅ **Production Ready** - Robust, scalable, and secure
✅ **Well Documented** - Complete documentation and examples
✅ **Easy Testing** - Simple test scenarios and examples

These endpoints are essential for completing the Paytm payment integration and providing a seamless user experience.
