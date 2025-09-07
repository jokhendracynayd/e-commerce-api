# 🚀 E-Commerce Backend Services & Connections Diagram

## 📊 Current Running Services Status

### **🐳 Docker Containers (Active)**
```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Services                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api (Port: 3001)                           │ │
│  │  Status: ✅ Up 2 hours (healthy)                      │ │
│  │  Image: e-commerce-api-api                             │ │
│  │  Health: ✅ API Status OK                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_redis (Port: 6379)                          │ │
│  │  Status: ✅ Up 2 hours (healthy)                       │ │
│  │  Image: redis:7-alpine                                  │ │
│  │  Health: ✅ PONG Response                               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_elasticsearch (Ports: 9200, 9300)           │ │
│  │  Status: ✅ Up 2 hours (healthy)                       │ │
│  │  Image: elasticsearch:8.11.0                           │ │
│  │  Health: ⚠️ Yellow Status (1 unassigned shard)         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_kibana (Port: 5601)                         │ │
│  │  Status: ✅ Up 2 hours                                  │ │
│  │  Image: kibana:8.11.0                                   │ │
│  │  Health: ✅ Available                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 Service Connections & Data Flow

### **1. Main Application Flow**
```
┌─────────────────────────────────────────────────────────────┐
│                Client Request Flow                          │
│                                                             │
│  Client (Frontend/Admin)                                   │
│       ↓                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api:3001                                     │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              NestJS Application                    │ │ │
│  │  │  • Global Guards (JWT Auth)                        │ │ │
│  │  │  • Rate Limiting                                   │ │ │
│  │  │  • Request Logging                                 │ │ │
│  │  │  • Exception Handling                              │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **2. Database Connections**
```
┌─────────────────────────────────────────────────────────────┐
│                Database Layer                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api:3001                                     │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Prisma ORM                             │ │ │
│  │  │  • Connection Pooling                               │ │ │
│  │  │  • Query Optimization                               │ │ │
│  │  │  • Transaction Management                           │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │          PostgreSQL Database                        │ │ │
│  │  │  • Remote Database (3.109.94.129:5432)            │ │ │
│  │  │  • User Management                                 │ │ │
│  │  │  • Product Catalog                                  │ │ │
│  │  │  • Order Management                                 │ │ │
│  │  │  • Payment Records                                  │ │ │
│  │  │  • Analytics Data                                   │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **3. Cache Layer**
```
┌─────────────────────────────────────────────────────────────┐
│                Cache Layer                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api:3001                                     │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Cache Service                          │ │ │
│  │  │  • Session Management                               │ │ │
│  │  │  • Search Result Caching                            │ │ │
│  │  │  • Rate Limiting Data                               │ │ │
│  │  │  • Background Job Queues                            │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  ecommerce_redis:6379                               │ │ │
│  │  │  • In-Memory Data Store                             │ │ │
│  │  │  • Session Storage                                  │ │ │
│  │  │  • Cache Storage                                    │ │ │
│  │  │  • Queue Management                                 │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **4. Search & Analytics Engine**
```
┌─────────────────────────────────────────────────────────────┐
│            Search & Analytics Engine                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api:3001                                     │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Search Service                         │ │ │
│  │  │  • Product Search                                  │ │ │
│  │  │  • Analytics Tracking                              │ │ │
│  │  │  • Real-time Data                                  │ │ │
│  │  │  • Aggregations                                    │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  ecommerce_elasticsearch:9200                      │ │ │
│  │  │  • Product Search Index                             │ │ │
│  │  │  • Analytics Data                                   │ │ │
│  │  │  • Real-time Search                                 │ │ │
│  │  │  • Aggregations                                     │ │ │
│  │  │  • Suggestions                                      │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  ecommerce_kibana:5601                             │ │ │
│  │  │  • Data Visualization                               │ │ │
│  │  │  • API Performance Metrics                          │ │ │
│  │  │  • User Behavior Analytics                          │ │ │
│  │  │  • Real-time Monitoring                             │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 External Service Connections

### **5. Payment Gateway Connections**
```
┌─────────────────────────────────────────────────────────────┐
│              Payment Gateway Connections                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api:3001                                     │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Payment Service                        │ │ │
│  │  │  • Payment Intent Creation                           │ │ │
│  │  │  • Payment Verification                             │ │ │
│  │  │  • Refund Processing                                 │ │ │
│  │  │  • Webhook Handling                                 │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              External Payment APIs                  │ │ │
│  │  │  • Stripe API (Credit/Debit Cards)                 │ │ │
│  │  │  • Razorpay API (UPI, Net Banking)                │ │ │
│  │  │  • UPI Direct API                                   │ │ │
│  │  │  • Cash on Delivery (COD)                           │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **6. AWS Services Connections**
```
┌─────────────────────────────────────────────────────────────┐
│                AWS Services Connections                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api:3001                                     │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              AWS Service Layer                      │ │ │
│  │  │  • File Upload Service                              │ │ │
│  │  │  • Email Service                                    │ │ │
│  │  │  • CDN Service                                      │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              AWS Cloud Services                     │ │ │
│  │  │  • S3 (File Storage)                                │ │ │
│  │  │  • CloudFront (CDN)                                │ │ │
│  │  │  • SES (Email Service)                              │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Service Health & Status

### **7. Health Check Status**
```
┌─────────────────────────────────────────────────────────────┐
│                Service Health Status                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ✅ ecommerce_api:3001                                  │ │
│  │  • Status: Healthy                                      │ │
│  │  • Uptime: 2+ hours                                     │ │
│  │  • Memory: 187MB                                        │ │
│  │  • Database: Connected                                  │ │
│  │  • Elasticsearch: Connected (degraded)                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ✅ ecommerce_redis:6379                               │ │
│  │  • Status: Healthy                                      │ │
│  │  • Response: PONG                                       │ │
│  │  • Memory: Available                                    │ │
│  │  • Persistence: Enabled                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ⚠️ ecommerce_elasticsearch:9200                       │ │
│  │  • Status: Yellow (1 unassigned shard)                 │ │
│  │  • Cluster: ecommerce-cluster                          │ │
│  │  • Nodes: 1                                             │ │
│  │  • Shards: 29 active, 1 unassigned                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ✅ ecommerce_kibana:5601                              │ │
│  │  • Status: Available                                    │ │
│  │  • Elasticsearch: Connected                             │ │
│  │  • Dashboards: Ready                                    │ │
│  │  • Visualizations: Available                            │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Architecture

### **8. Complete Data Flow**
```
┌─────────────────────────────────────────────────────────────┐
│                Complete Data Flow                           │
│                                                             │
│  Client Request                                             │
│       ↓                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api:3001                                     │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Request Processing                     │ │ │
│  │  │  • Authentication (JWT)                             │ │ │
│  │  │  • Rate Limiting (Redis)                           │ │ │
│  │  │  • Request Logging                                  │ │ │
│  │  │  • Business Logic                                    │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Data Access Layer                      │ │ │
│  │  │  • Database Queries (PostgreSQL)                   │ │ │
│  │  │  • Cache Operations (Redis)                        │ │ │
│  │  │  • Search Operations (Elasticsearch)               │ │ │
│  │  │  • Analytics Tracking (Elasticsearch)              │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Response Processing                    │ │ │
│  │  │  • Data Transformation                             │ │ │
│  │  │  • Response Logging                                 │ │ │
│  │  │  • Analytics Tracking                               │ │ │
│  │  │  • Error Handling                                   │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│       ↓                                                     │
│  Client Response                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Background Processing

### **9. Background Job Processing**
```
┌─────────────────────────────────────────────────────────────┐
│              Background Job Processing                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api:3001                                     │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Background Services                     │ │ │
│  │  │  • Recommendation Jobs                              │ │ │
│  │  │  • Email Notifications                              │ │ │
│  │  │  • Data Synchronization                             │ │ │
│  │  │  • Analytics Processing                             │ │ │
│  │  │  • Scheduled Tasks                                  │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  ecommerce_redis:6379                               │ │ │
│  │  │  • Bull Queue System                                │ │ │
│  │  │  • Job Scheduling                                   │ │ │
│  │  │  • Task Management                                  │ │ │
│  │  │  • Queue Monitoring                                 │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Monitoring & Observability

### **10. Monitoring Stack**
```
┌─────────────────────────────────────────────────────────────┐
│                Monitoring & Observability                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api:3001                                     │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │              Monitoring Services                    │ │ │
│  │  │  • Health Checks (/health)                         │ │ │
│  │  │  • Performance Metrics (/metrics)                 │ │ │
│  │  │  • Winston Logging                                  │ │ │
│  │  │  • Error Tracking                                   │ │ │
│  │  │  • Audit Logging                                    │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │       ↓                                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  ecommerce_kibana:5601                              │ │ │
│  │  │  • Data Visualization                               │ │ │
│  │  │  • Performance Dashboards                          │ │ │
│  │  │  • Real-time Monitoring                             │ │ │
│  │  │  • Analytics Reports                                │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Port Configuration

### **11. Service Ports**
```
┌─────────────────────────────────────────────────────────────┐
│                    Service Ports                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_api:3001                                     │ │
│  │  • Main API Endpoint                                    │ │
│  │  • Health Checks                                        │ │
│  │  • Metrics Endpoint                                     │ │
│  │  • Admin Interface                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_redis:6379                                  │ │
│  │  • Cache Operations                                    │ │
│  │  • Session Storage                                     │ │
│  │  • Queue Management                                    │ │
│  │  • Rate Limiting                                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_elasticsearch:9200                          │ │
│  │  • REST API (Search)                                   │ │
│  │  • Analytics Data                                      │ │
│  │  • Index Management                                    │ │
│  │  • Cluster Management                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_elasticsearch:9300                          │ │
│  │  • Transport Protocol                                  │ │
│  │  • Internal Communication                             │ │
│  │  • Cluster Coordination                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ecommerce_kibana:5601                                 │ │
│  │  • Web Interface                                       │ │
│  │  • Data Visualization                                  │ │
│  │  • Dashboard Management                                │ │
│  │  • Analytics Reports                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Summary

### **✅ Currently Running Services:**
1. **ecommerce_api:3001** - Main NestJS application (Healthy)
2. **ecommerce_redis:6379** - Cache and session storage (Healthy)
3. **ecommerce_elasticsearch:9200** - Search engine (Yellow status)
4. **ecommerce_kibana:5601** - Data visualization (Available)

### **🔗 Key Connections:**
- **API ↔ PostgreSQL** - Primary data storage
- **API ↔ Redis** - Caching and sessions
- **API ↔ Elasticsearch** - Search and analytics
- **Kibana ↔ Elasticsearch** - Data visualization
- **API ↔ External APIs** - Payment gateways, AWS services

### **📊 Health Status:**
- **Overall System**: ✅ Healthy
- **API Performance**: ✅ Good (187MB memory)
- **Database**: ✅ Connected
- **Cache**: ✅ Responsive
- **Search**: ⚠️ Degraded (1 unassigned shard)
- **Monitoring**: ✅ Available

Your e-commerce backend is **fully operational** with all core services running and properly connected! 🚀
