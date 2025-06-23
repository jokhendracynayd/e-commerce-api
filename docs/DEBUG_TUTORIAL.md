# VS Code Debugging Tutorial for NestJS E-commerce API

## 🎯 Quick Start Guide

### 1. Start Debugging
1. Open VS Code
2. Press `Ctrl + Shift + D` (or `Cmd + Shift + D` on Mac) to open Debug panel
3. Select "Debug NestJS API" from the dropdown
4. Click the green play button ▶️ or press `F5`

### 2. Set Breakpoints
- Click in the left margin (gutter) next to line numbers to set breakpoints
- Red dots will appear where you set breakpoints
- The code will pause execution at these points

## 🔍 Debugging Techniques

### Basic Breakpoints
```typescript
// Set breakpoint on this line to inspect the request
async getProducts(req: Request) {
  // 🔴 Set breakpoint here
  const products = await this.productService.findAll();
  return products;
}
```

### Conditional Breakpoints
1. Right-click on a breakpoint
2. Select "Edit Breakpoint"
3. Add condition: `req.query.category === 'electronics'`

### Logpoints (No Code Changes Needed)
1. Right-click on a breakpoint
2. Select "Add Logpoint"
3. Enter: `Product ID: {productId}, User: {userId}`

## 🛠️ Debugging Scenarios

### 1. Debugging API Endpoints
```typescript
@Get('products')
async getProducts(@Query() query: any) {
  // 🔴 Set breakpoint here to inspect query parameters
  console.log('Query params:', query);
  
  const products = await this.productService.findByCategory(query.category);
  // 🔴 Set breakpoint here to inspect results
  return products;
}
```

### 2. Debugging Database Queries
```typescript
async findByCategory(category: string) {
  // 🔴 Set breakpoint here to inspect the query
  const products = await this.prisma.product.findMany({
    where: { categoryId: category }
  });
  
  // 🔴 Set breakpoint here to inspect results
  return products;
}
```

### 3. Debugging Authentication
```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile(@Request() req) {
  // 🔴 Set breakpoint here to inspect user data
  console.log('User:', req.user);
  return req.user;
}
```

## 📊 Debug Console Commands

When paused at a breakpoint, you can run these commands in the Debug Console:

```javascript
// Inspect variables
console.log(req.body)
console.log(req.headers)

// Evaluate expressions
req.query.category
products.length

// Call functions
this.productService.findByCategory('electronics')

// Check object properties
Object.keys(req.body)
```

## 🔧 Debug Panel Features

### Variables Panel
- **Local**: Variables in current scope
- **Global**: Global variables
- **Watch**: Add expressions to monitor

### Call Stack
- Shows the execution path
- Click to navigate to different function calls

### Breakpoints Panel
- Manage all breakpoints
- Enable/disable breakpoints
- Edit breakpoint conditions

## 🚀 Advanced Debugging

### 1. Step Through Code
- **F10**: Step Over (execute current line)
- **F11**: Step Into (go into function)
- **Shift + F11**: Step Out (exit current function)
- **F5**: Continue execution

### 2. Watch Expressions
Add expressions to monitor:
```
req.body.price
products.filter(p => p.price > 100)
```

### 3. Debug Helper Functions
Use the DebugHelper class for better logging:

```typescript
import { DebugHelper } from '../debug-helper';

async getProducts() {
  const timer = DebugHelper.startTimer('getProducts');
  
  try {
    DebugHelper.logRequest('GET', '/products', null, req.headers);
    
    const products = await this.productService.findAll();
    
    DebugHelper.logObject('Products Found', products);
    timer();
    
    return products;
  } catch (error) {
    DebugHelper.logError(error, 'getProducts');
    throw error;
  }
}
```

## 🐛 Common Debugging Scenarios

### 1. API Not Responding
- Check if server is running
- Look for errors in Debug Console
- Verify port configuration

### 2. Database Connection Issues
- Check database URL in environment
- Verify database is running
- Look for connection errors

### 3. Authentication Problems
- Check JWT token in headers
- Verify token expiration
- Inspect user object in debugger

### 4. Validation Errors
- Check request body structure
- Verify DTO validation rules
- Look for validation error messages

## 📝 Debugging Best Practices

1. **Start Small**: Set breakpoints at entry points first
2. **Use Descriptive Names**: Name your variables clearly
3. **Log Strategically**: Use console.log for quick checks
4. **Check Network**: Use browser DevTools for API calls
5. **Read Error Messages**: Error messages often contain the solution

## 🎯 Debugging Checklist

- [ ] Server is running in debug mode
- [ ] Breakpoints are set at key locations
- [ ] Debug Console is open
- [ ] Variables panel is visible
- [ ] Call stack is being monitored
- [ ] Error messages are being logged

## 🔗 Useful Extensions

1. **REST Client**: Test API endpoints
2. **Thunder Client**: Alternative to Postman
3. **Error Lens**: Better error highlighting
4. **GitLens**: Git integration for debugging

## 🆘 Getting Help

If you're stuck:
1. Check the Debug Console for error messages
2. Look at the Call Stack to understand execution flow
3. Use `console.log()` for quick debugging
4. Check the NestJS documentation
5. Ask for help with specific error messages 