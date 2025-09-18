# 🌍 Multi-Country E-commerce Implementation Plan

## 📋 **Project Overview**

This document outlines the complete implementation plan for adding multi-country support to our e-commerce platform. The goal is to create a scalable, robust, and maintainable system that can handle different countries with their unique requirements for currency, phone formats, postal codes, tax rates, and shipping zones.

---

## 🏗️ **Project Structure**

### **Backend Structure (NestJS)**

```
e-commerce-api/
├── src/
│   ├── config/
│   │   ├── countries/
│   │   │   ├── country-config.module.ts
│   │   │   ├── country-config.service.ts
│   │   │   ├── country-config.controller.ts
│   │   │   └── dto/
│   │   │       ├── country-config.dto.ts
│   │   │       ├── country-preference.dto.ts
│   │   │       └── create-country-config.dto.ts
│   │   ├── currency/
│   │   │   ├── currency.module.ts
│   │   │   ├── currency.service.ts
│   │   │   ├── currency.controller.ts
│   │   │   └── dto/
│   │   │       ├── currency.dto.ts
│   │   │       ├── currency-rate.dto.ts
│   │   │       └── currency-conversion.dto.ts
│   │   └── localization/
│   │       ├── localization.module.ts
│   │       ├── localization.service.ts
│   │       ├── localization.controller.ts
│   │       └── dto/
│   │           ├── localization.dto.ts
│   │           └── locale-config.dto.ts
│   ├── modules/
│   │   ├── address/
│   │   │   ├── country-address.service.ts
│   │   │   ├── address-validation.service.ts
│   │   │   ├── address.controller.ts
│   │   │   └── dto/
│   │   │       ├── country-address.dto.ts
│   │   │       ├── address-validation.dto.ts
│   │   │       └── address-format.dto.ts
│   │   ├── shipping/
│   │   │   ├── country-shipping.service.ts
│   │   │   ├── shipping-zone.service.ts
│   │   │   ├── shipping.controller.ts
│   │   │   └── dto/
│   │   │       ├── shipping.dto.ts
│   │   │       ├── shipping-zone.dto.ts
│   │   │       └── shipping-cost.dto.ts
│   │   ├── phone/
│   │   │   ├── phone-validation.service.ts
│   │   │   ├── phone.controller.ts
│   │   │   └── dto/
│   │   │       ├── phone.dto.ts
│   │   │       └── phone-validation.dto.ts
│   │   ├── pricing/
│   │   │   ├── country-pricing.service.ts
│   │   │   ├── tax-calculation.service.ts
│   │   │   ├── pricing.controller.ts
│   │   │   └── dto/
│   │   │       ├── pricing.dto.ts
│   │   │       ├── tax-calculation.dto.ts
│   │   │       └── product-pricing.dto.ts
│   │   └── payment/
│   │       ├── country-payment.service.ts
│   │       ├── payment-method.service.ts
│   │       ├── payment.controller.ts
│   │       └── dto/
│   │           ├── payment.dto.ts
│   │           ├── payment-method.dto.ts
│   │           └── country-payment.dto.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── country-aware.decorator.ts
│   │   │   └── currency-aware.decorator.ts
│   │   ├── filters/
│   │   │   └── country-exception.filter.ts
│   │   ├── guards/
│   │   │   └── country-access.guard.ts
│   │   └── interceptors/
│   │       ├── country-context.interceptor.ts
│   │       └── currency-conversion.interceptor.ts
│   ├── prisma/
│   │   ├── migrations/
│   │   │   ├── 001_create_countries_table.sql
│   │   │   ├── 002_create_country_configurations.sql
│   │   │   ├── 003_create_user_country_preferences.sql
│   │   │   ├── 004_create_country_address_formats.sql
│   │   │   ├── 005_create_shipping_zones.sql
│   │   │   ├── 006_create_currency_rates.sql
│   │   │   └── 007_create_product_country_pricing.sql
│   │   └── seeder/
│   │       ├── countries.seeder.ts
│   │       ├── country-configs.seeder.ts
│   │       ├── shipping-zones.seeder.ts
│   │       └── currency-rates.seeder.ts
│   └── types/
│       ├── country.types.ts
│       ├── currency.types.ts
│       └── localization.types.ts
├── config/
│   ├── countries/
│   │   ├── production/
│   │   │   ├── us.json
│   │   │   ├── in.json
│   │   │   ├── gb.json
│   │   │   ├── ca.json
│   │   │   └── au.json
│   │   ├── staging/
│   │   │   ├── us.json
│   │   │   └── in.json
│   │   └── development/
│   │       ├── us.json
│   │       └── in.json
│   └── currencies/
│       ├── exchange-rates.json
│       ├── supported-currencies.json
│       └── currency-symbols.json
└── tests/
    ├── country/
    │   ├── country-config.test.ts
    │   ├── currency-conversion.test.ts
    │   └── address-validation.test.ts
    ├── integration/
    │   ├── country-api.test.ts
    │   └── multi-country-flow.test.ts
    └── e2e/
        ├── us-checkout.test.ts
        ├── in-checkout.test.ts
        └── gb-checkout.test.ts
```

### **Frontend Structure (Next.js)**

```
e-commerce-frontend/
├── src/
│   ├── contexts/
│   │   ├── CountryContext.tsx
│   │   ├── CurrencyContext.tsx
│   │   ├── LocalizationContext.tsx
│   │   └── MultiCountryProvider.tsx
│   ├── hooks/
│   │   ├── useCountry.ts
│   │   ├── useCurrency.ts
│   │   ├── useLocalization.ts
│   │   ├── useAddressValidation.ts
│   │   └── useCountryConfig.ts
│   ├── services/
│   │   ├── countryService.ts
│   │   ├── currencyService.ts
│   │   ├── localizationService.ts
│   │   ├── addressValidationService.ts
│   │   └── shippingService.ts
│   ├── components/
│   │   ├── country/
│   │   │   ├── CountrySelector.tsx
│   │   │   ├── CountryConfigProvider.tsx
│   │   │   ├── CountryFlag.tsx
│   │   │   └── CountryDropdown.tsx
│   │   ├── currency/
│   │   │   ├── CurrencyDisplay.tsx
│   │   │   ├── CurrencyConverter.tsx
│   │   │   ├── CurrencySelector.tsx
│   │   │   └── PriceDisplay.tsx
│   │   ├── address/
│   │   │   ├── CountryAddressForm.tsx
│   │   │   ├── AddressValidator.tsx
│   │   │   ├── AddressField.tsx
│   │   │   └── PostalCodeInput.tsx
│   │   ├── phone/
│   │   │   ├── PhoneInput.tsx
│   │   │   ├── PhoneValidator.tsx
│   │   │   └── CountryPhoneInput.tsx
│   │   ├── shipping/
│   │   │   ├── ShippingZoneSelector.tsx
│   │   │   ├── ShippingCostDisplay.tsx
│   │   │   └── DeliveryTimeDisplay.tsx
│   │   └── forms/
│   │       ├── CountryAwareForm.tsx
│   │       ├── MultiCountryCheckout.tsx
│   │       └── CountrySpecificFields.tsx
│   ├── config/
│   │   ├── countries/
│   │   │   ├── index.ts
│   │   │   ├── us.ts
│   │   │   ├── in.ts
│   │   │   ├── gb.ts
│   │   │   ├── ca.ts
│   │   │   ├── au.ts
│   │   │   └── types.ts
│   │   ├── currencies/
│   │   │   ├── index.ts
│   │   │   ├── rates.ts
│   │   │   ├── symbols.ts
│   │   │   └── formatting.ts
│   │   └── validation/
│   │       ├── phonePatterns.ts
│   │       ├── postalCodePatterns.ts
│   │       ├── addressFormats.ts
│   │       └── countryRules.ts
│   ├── utils/
│   │   ├── countryUtils.ts
│   │   ├── currencyUtils.ts
│   │   ├── validationUtils.ts
│   │   ├── formattingUtils.ts
│   │   └── localizationUtils.ts
│   ├── types/
│   │   ├── country.types.ts
│   │   ├── currency.types.ts
│   │   ├── address.types.ts
│   │   ├── shipping.types.ts
│   │   └── localization.types.ts
│   ├── lib/
│   │   ├── api/
│   │   │   ├── countries.ts
│   │   │   ├── currency.ts
│   │   │   ├── address.ts
│   │   │   └── shipping.ts
│   │   ├── validation/
│   │   │   ├── phoneValidation.ts
│   │   │   ├── addressValidation.ts
│   │   │   └── postalCodeValidation.ts
│   │   └── formatting/
│   │       ├── currencyFormatting.ts
│   │       ├── phoneFormatting.ts
│   │       └── addressFormatting.ts
│   └── app/
│       ├── (country)/
│       │   ├── [country]/
│       │   │   ├── page.tsx
│       │   │   ├── checkout/
│       │   │   │   └── page.tsx
│       │   │   └── shipping/
│       │   │       └── page.tsx
│       │   └── layout.tsx
│       ├── api/
│       │   ├── countries/
│       │   │   ├── route.ts
│       │   │   └── [code]/
│       │   │       └── route.ts
│       │   ├── currency/
│       │   │   ├── convert/
│       │   │   │   └── route.ts
│       │   │   └── rates/
│       │   │       └── route.ts
│       │   └── address/
│       │       ├── validate/
│       │       │   └── route.ts
│       │       └── formats/
│       │           └── route.ts
│       └── checkout/
│           ├── information/
│           │   └── page.tsx
│           ├── shipping/
│           │   └── page.tsx
│           └── payment/
│               └── page.tsx
├── public/
│   ├── flags/
│   │   ├── us.svg
│   │   ├── in.svg
│   │   ├── gb.svg
│   │   ├── ca.svg
│   │   └── au.svg
│   └── locales/
│       ├── en-US.json
│       ├── hi-IN.json
│       ├── en-GB.json
│       └── fr-FR.json
└── tests/
    ├── components/
    │   ├── CountrySelector.test.tsx
    │   ├── CurrencyDisplay.test.tsx
    │   └── AddressForm.test.tsx
    ├── hooks/
    │   ├── useCountry.test.ts
    │   ├── useCurrency.test.ts
    │   └── useLocalization.test.ts
    └── utils/
        ├── countryUtils.test.ts
        ├── currencyUtils.test.ts
        └── validationUtils.test.ts
```

### **Database Schema Structure**

```
Database: ecommerce_db
├── Tables
│   ├── countries
│   │   ├── id (UUID, PK)
│   │   ├── code (VARCHAR(2), UNIQUE)
│   │   ├── name (VARCHAR(100))
│   │   ├── currency_code (VARCHAR(3))
│   │   ├── phone_code (VARCHAR(10))
│   │   ├── timezone (VARCHAR(50))
│   │   ├── locale (VARCHAR(10))
│   │   ├── is_active (BOOLEAN)
│   │   ├── created_at (TIMESTAMP)
│   │   └── updated_at (TIMESTAMP)
│   ├── country_configurations
│   │   ├── id (UUID, PK)
│   │   ├── country_id (UUID, FK)
│   │   ├── config_key (VARCHAR(100))
│   │   ├── config_value (JSONB)
│   │   ├── created_at (TIMESTAMP)
│   │   └── updated_at (TIMESTAMP)
│   ├── user_country_preferences
│   │   ├── id (UUID, PK)
│   │   ├── user_id (UUID, FK)
│   │   ├── country_id (UUID, FK)
│   │   ├── is_primary (BOOLEAN)
│   │   └── created_at (TIMESTAMP)
│   ├── country_address_formats
│   │   ├── id (UUID, PK)
│   │   ├── country_id (UUID, FK)
│   │   ├── field_order (JSONB)
│   │   ├── required_fields (JSONB)
│   │   ├── validation_rules (JSONB)
│   │   └── created_at (TIMESTAMP)
│   ├── shipping_zones
│   │   ├── id (UUID, PK)
│   │   ├── country_id (UUID, FK)
│   │   ├── name (VARCHAR(100))
│   │   ├── delivery_time_min (INTEGER)
│   │   ├── delivery_time_max (INTEGER)
│   │   ├── is_active (BOOLEAN)
│   │   └── created_at (TIMESTAMP)
│   ├── currency_rates
│   │   ├── id (UUID, PK)
│   │   ├── from_currency (VARCHAR(3))
│   │   ├── to_currency (VARCHAR(3))
│   │   ├── rate (DECIMAL(10,6))
│   │   └── updated_at (TIMESTAMP)
│   └── product_country_pricing
│       ├── id (UUID, PK)
│       ├── product_id (UUID, FK)
│       ├── country_id (UUID, FK)
│       ├── base_price (DECIMAL(10,2))
│       ├── currency_code (VARCHAR(3))
│       ├── tax_rate (DECIMAL(5,2))
│       ├── is_available (BOOLEAN)
│       └── created_at (TIMESTAMP)
├── Indexes
│   ├── idx_countries_code
│   ├── idx_countries_active
│   ├── idx_country_configs_country_id
│   ├── idx_country_configs_key
│   ├── idx_user_country_prefs_user_id
│   ├── idx_user_country_prefs_primary
│   ├── idx_address_formats_country_id
│   ├── idx_shipping_zones_country_id
│   ├── idx_shipping_zones_active
│   ├── idx_currency_rates_from
│   ├── idx_currency_rates_to
│   ├── idx_product_pricing_product_id
│   └── idx_product_pricing_country_id
└── Constraints
    ├── UNIQUE(countries.code)
    ├── UNIQUE(country_configurations.country_id, config_key)
    ├── UNIQUE(currency_rates.from_currency, to_currency)
    ├── UNIQUE(product_country_pricing.product_id, country_id)
    └── Foreign Key Constraints
```

### **Configuration Files Structure**

```
config/
├── countries/
│   ├── us.json
│   │   ├── code: "US"
│   │   ├── name: "United States"
│   │   ├── currency: "USD"
│   │   ├── phone: { pattern, format }
│   │   ├── address: { fields, required, validation }
│   │   ├── shipping: { zones, delivery_times }
│   │   └── tax: { rate, inclusive }
│   ├── in.json
│   │   ├── code: "IN"
│   │   ├── name: "India"
│   │   ├── currency: "INR"
│   │   ├── phone: { pattern, format }
│   │   ├── address: { fields, required, validation }
│   │   ├── shipping: { zones, delivery_times }
│   │   └── tax: { rate, inclusive }
│   └── gb.json
│       ├── code: "GB"
│       ├── name: "United Kingdom"
│       ├── currency: "GBP"
│       ├── phone: { pattern, format }
│       ├── address: { fields, required, validation }
│       ├── shipping: { zones, delivery_times }
│       └── tax: { rate, inclusive }
├── currencies/
│   ├── exchange-rates.json
│   │   ├── USD: { INR: 83.50, GBP: 0.79, EUR: 0.92 }
│   │   ├── INR: { USD: 0.012, GBP: 0.009, EUR: 0.011 }
│   │   └── GBP: { USD: 1.27, INR: 105.70, EUR: 1.17 }
│   ├── supported-currencies.json
│   │   ├── USD: { symbol: "$", decimal_places: 2 }
│   │   ├── INR: { symbol: "₹", decimal_places: 2 }
│   │   └── GBP: { symbol: "£", decimal_places: 2 }
│   └── currency-symbols.json
│       ├── USD: "$"
│       ├── INR: "₹"
│       ├── GBP: "£"
│       ├── EUR: "€"
│       └── CAD: "C$"
└── validation/
    ├── phonePatterns.json
    │   ├── US: "^\\+1[0-9]{10}$"
    │   ├── IN: "^\\+91[0-9]{10}$"
    │   └── GB: "^\\+44[0-9]{10}$"
    ├── postalCodePatterns.json
    │   ├── US: "^[0-9]{5}(-[0-9]{4})?$"
    │   ├── IN: "^[1-9][0-9]{5}$"
    │   └── GB: "^[A-Z]{1,2}[0-9]{1,2}[A-Z]? [0-9][A-Z]{2}$"
    └── addressFormats.json
        ├── US: { fields: ["street", "city", "state", "zip"], required: ["street", "city", "state", "zip"] }
        ├── IN: { fields: ["street", "area", "city", "state", "pincode"], required: ["street", "city", "state", "pincode"] }
        └── GB: { fields: ["street", "city", "county", "postcode"], required: ["street", "city", "postcode"] }
```

### **API Endpoints Structure**

```
API Routes
├── /api/countries
│   ├── GET /                    # List all countries
│   ├── GET /:code               # Get country details
│   ├── GET /:code/config        # Get country configuration
│   ├── PUT /:code/config        # Update country configuration
│   └── GET /:code/validation    # Get validation rules
├── /api/currency
│   ├── GET /                    # List supported currencies
│   ├── GET /rates               # Get exchange rates
│   ├── POST /convert            # Convert currency
│   └── GET /symbols             # Get currency symbols
├── /api/address
│   ├── GET /formats/:country    # Get address format
│   ├── POST /validate           # Validate address
│   └── GET /fields/:country     # Get address fields
├── /api/shipping
│   ├── GET /zones/:country      # Get shipping zones
│   ├── POST /calculate          # Calculate shipping cost
│   └── GET /delivery-times      # Get delivery times
├── /api/pricing
│   ├── GET /:productId/:country # Get country-specific pricing
│   ├── POST /calculate-tax      # Calculate tax
│   └── GET /currency/:country   # Get country currency
└── /api/payment
    ├── GET /methods/:country     # Get available payment methods
    ├── POST /process             # Process payment
    └── GET /gateways/:country    # Get payment gateways
```

---

## 🎯 **Implementation Phases**

### **Phase 1: Foundation (Weeks 1-2)**
**Goal**: Set up core infrastructure and basic country support

#### **Week 1: Database & Backend Foundation**

##### **Day 1-2: Database Schema Setup**
- [ ] **Create Countries Master Table**
  - [ ] Design `countries` table with ISO 3166-1 alpha-2 codes
  - [ ] Add fields: code, name, currency_code, phone_code, timezone, locale
  - [ ] Create migration file
  - [ ] Add indexes for performance

- [ ] **Create Country Configuration Table**
  - [ ] Design `country_configurations` table
  - [ ] Add fields: country_id, config_key, config_value (JSONB)
  - [ ] Create migration file
  - [ ] Add unique constraint on (country_id, config_key)

- [ ] **Create User Country Preferences Table**
  - [ ] Design `user_country_preferences` table
  - [ ] Add fields: user_id, country_id, is_primary
  - [ ] Create migration file
  - [ ] Add foreign key constraints

##### **Day 3-4: Address & Shipping Schema**
- [ ] **Create Country Address Formats Table**
  - [ ] Design `country_address_formats` table
  - [ ] Add fields: country_id, field_order, required_fields, validation_rules
  - [ ] Create migration file

- [ ] **Create Shipping Zones Table**
  - [ ] Design `shipping_zones` table
  - [ ] Add fields: country_id, name, delivery_time_min, delivery_time_max
  - [ ] Create migration file

##### **Day 5: Currency & Pricing Schema**
- [ ] **Create Currency Exchange Rates Table**
  - [ ] Design `currency_rates` table
  - [ ] Add fields: from_currency, to_currency, rate, updated_at
  - [ ] Create migration file

- [ ] **Create Country-Specific Product Pricing Table**
  - [ ] Design `product_country_pricing` table
  - [ ] Add fields: product_id, country_id, base_price, currency_code, tax_rate
  - [ ] Create migration file

#### **Week 2: Backend Services**

##### **Day 1-2: Country Configuration Service**
- [ ] **Create Country Config Module**
  - [ ] Create `src/config/countries/country-config.module.ts`
  - [ ] Create `src/config/countries/country-config.service.ts`
  - [ ] Add CRUD operations for country configurations
  - [ ] Add caching with Redis

- [ ] **Create DTOs**
  - [ ] Create `src/config/countries/dto/country-config.dto.ts`
  - [ ] Create `src/config/countries/dto/country-preference.dto.ts`
  - [ ] Add validation decorators

##### **Day 3-4: Currency Service**
- [ ] **Create Currency Module**
  - [ ] Create `src/config/currency/currency.module.ts`
  - [ ] Create `src/config/currency/currency.service.ts`
  - [ ] Add currency conversion logic
  - [ ] Integrate with external currency API

- [ ] **Create Currency DTOs**
  - [ ] Create `src/config/currency/dto/currency.dto.ts`
  - [ ] Add validation for currency codes

##### **Day 5: Localization Service**
- [ ] **Create Localization Module**
  - [ ] Create `src/config/localization/localization.module.ts`
  - [ ] Create `src/config/localization/localization.service.ts`
  - [ ] Add locale detection and formatting
  - [ ] Create `src/config/localization/dto/localization.dto.ts`

### **Phase 2: Core Features (Weeks 3-4)**
**Goal**: Implement country-specific functionality

#### **Week 3: Address Management**

##### **Day 1-2: Country Address Service**
- [ ] **Create Address Module**
  - [ ] Create `src/modules/address/country-address.service.ts`
  - [ ] Add country-specific address validation
  - [ ] Create `src/modules/address/address-validation.service.ts`

- [ ] **Create Address DTOs**
  - [ ] Create `src/modules/address/dto/country-address.dto.ts`
  - [ ] Add validation for different address formats

##### **Day 3-4: Address Validation**
- [ ] **Implement Validation Rules**
  - [ ] Add postal code validation per country
  - [ ] Add state/province validation
  - [ ] Add address format validation
  - [ ] Create validation utility functions

##### **Day 5: Address API Endpoints**
- [ ] **Create Address Controllers**
  - [ ] Create `src/modules/address/address.controller.ts`
  - [ ] Add endpoints for address validation
  - [ ] Add endpoints for country-specific address formats

#### **Week 4: Phone & Shipping**

##### **Day 1-2: Phone Validation Service**
- [ ] **Create Phone Module**
  - [ ] Create `src/modules/phone/phone-validation.service.ts`
  - [ ] Integrate with libphonenumber
  - [ ] Add country-specific phone formatting

- [ ] **Create Phone DTOs**
  - [ ] Create `src/modules/phone/dto/phone.dto.ts`
  - [ ] Add validation for international phone numbers

##### **Day 3-4: Shipping Service**
- [ ] **Create Shipping Module**
  - [ ] Create `src/modules/shipping/country-shipping.service.ts`
  - [ ] Create `src/modules/shipping/shipping-zone.service.ts`
  - [ ] Add shipping cost calculation per country

- [ ] **Create Shipping DTOs**
  - [ ] Create `src/modules/shipping/dto/shipping.dto.ts`
  - [ ] Add validation for shipping zones

##### **Day 5: Shipping API Endpoints**
- [ ] **Create Shipping Controllers**
  - [ ] Create `src/modules/shipping/shipping.controller.ts`
  - [ ] Add endpoints for shipping zones
  - [ ] Add endpoints for shipping cost calculation

### **Phase 3: Advanced Features (Weeks 5-6)**
**Goal**: Implement advanced country-specific features

#### **Week 5: Tax & Pricing**

##### **Day 1-2: Tax Calculation Service**
- [ ] **Create Tax Module**
  - [ ] Create `src/modules/pricing/tax-calculation.service.ts`
  - [ ] Add country-specific tax rates
  - [ ] Add tax calculation logic

- [ ] **Create Pricing Service**
  - [ ] Create `src/modules/pricing/country-pricing.service.ts`
  - [ ] Add country-specific product pricing
  - [ ] Add currency conversion for pricing

##### **Day 3-4: Pricing DTOs & Controllers**
- [ ] **Create Pricing DTOs**
  - [ ] Create `src/modules/pricing/dto/pricing.dto.ts`
  - [ ] Add validation for pricing data

- [ ] **Create Pricing Controllers**
  - [ ] Create `src/modules/pricing/pricing.controller.ts`
  - [ ] Add endpoints for country-specific pricing
  - [ ] Add endpoints for tax calculation

##### **Day 5: Integration Testing**
- [ ] **Test Tax Calculation**
  - [ ] Test tax calculation for different countries
  - [ ] Test edge cases and error handling
  - [ ] Add unit tests for tax service

#### **Week 6: Payment & Integration**

##### **Day 1-2: Payment Methods**
- [ ] **Create Payment Module**
  - [ ] Create `src/modules/payment/country-payment.service.ts`
  - [ ] Add country-specific payment methods
  - [ ] Add payment gateway integration per country

- [ ] **Create Payment DTOs**
  - [ ] Create `src/modules/payment/dto/payment.dto.ts`
  - [ ] Add validation for payment methods

##### **Day 3-4: Payment Controllers**
- [ ] **Create Payment Controllers**
  - [ ] Create `src/modules/payment/payment.controller.ts`
  - [ ] Add endpoints for available payment methods
  - [ ] Add endpoints for payment processing

##### **Day 5: End-to-End Testing**
- [ ] **Integration Testing**
  - [ ] Test complete checkout flow for different countries
  - [ ] Test address validation, shipping, tax, and payment
  - [ ] Add integration tests

---

## 🎨 **Frontend Implementation Plan**

### **Phase 1: Context & Hooks (Week 7)**

#### **Day 1-2: Context Providers**
- [ ] **Create Country Context**
  - [ ] Create `src/contexts/CountryContext.tsx`
  - [ ] Add country state management
  - [ ] Add country selection logic

- [ ] **Create Currency Context**
  - [ ] Create `src/contexts/CurrencyContext.tsx`
  - [ ] Add currency state management
  - [ ] Add currency conversion logic

#### **Day 3-4: Custom Hooks**
- [ ] **Create Country Hooks**
  - [ ] Create `src/hooks/useCountry.ts`
  - [ ] Add country detection and selection
  - [ ] Create `src/hooks/useCurrency.ts`
  - [ ] Add currency conversion and formatting

- [ ] **Create Localization Hooks**
  - [ ] Create `src/hooks/useLocalization.ts`
  - [ ] Add locale detection and formatting

#### **Day 5: Services**
- [ ] **Create Frontend Services**
  - [ ] Create `src/services/countryService.ts`
  - [ ] Create `src/services/currencyService.ts`
  - [ ] Create `src/services/localizationService.ts`

### **Phase 2: Components (Week 8)**

#### **Day 1-2: Country Components**
- [ ] **Create Country Selector**
  - [ ] Create `src/components/country/CountrySelector.tsx`
  - [ ] Add country selection UI
  - [ ] Add country flag display

- [ ] **Create Country Config Provider**
  - [ ] Create `src/components/country/CountryConfigProvider.tsx`
  - [ ] Add country configuration context

#### **Day 3-4: Currency Components**
- [ ] **Create Currency Display**
  - [ ] Create `src/components/currency/CurrencyDisplay.tsx`
  - [ ] Add currency formatting
  - [ ] Create `src/components/currency/CurrencyConverter.tsx`
  - [ ] Add currency conversion UI

#### **Day 5: Address Components**
- [ ] **Create Country Address Form**
  - [ ] Create `src/components/address/CountryAddressForm.tsx`
  - [ ] Add dynamic address fields based on country
  - [ ] Create `src/components/address/AddressValidator.tsx`
  - [ ] Add real-time address validation

### **Phase 3: Integration (Week 9)**

#### **Day 1-2: Form Integration**
- [ ] **Update Address Form**
  - [ ] Modify existing `AddressForm.tsx` to use country-specific fields
  - [ ] Add country selection to address form
  - [ ] Add dynamic validation based on country

#### **Day 3-4: Checkout Integration**
- [ ] **Update Checkout Page**
  - [ ] Modify checkout to use country-specific shipping
  - [ ] Add country-specific tax calculation
  - [ ] Add country-specific payment methods

#### **Day 5: Testing & Refinement**
- [ ] **Frontend Testing**
  - [ ] Test country selection and switching
  - [ ] Test address validation for different countries
  - [ ] Test currency conversion and display

---

## 🗄️ **Database Migration Plan**

### **Migration 1: Countries Master Table**
```sql
-- Migration: 001_create_countries_table.sql
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  phone_code VARCHAR(10) NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_countries_active ON countries(is_active);
```

### **Migration 2: Country Configurations**
```sql
-- Migration: 002_create_country_configurations.sql
CREATE TABLE country_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID REFERENCES countries(id),
  config_key VARCHAR(100) NOT NULL,
  config_value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(country_id, config_key)
);

CREATE INDEX idx_country_configs_country_id ON country_configurations(country_id);
CREATE INDEX idx_country_configs_key ON country_configurations(config_key);
```

### **Migration 3: User Country Preferences**
```sql
-- Migration: 003_create_user_country_preferences.sql
CREATE TABLE user_country_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  country_id UUID REFERENCES countries(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_country_prefs_user_id ON user_country_preferences(user_id);
CREATE INDEX idx_user_country_prefs_primary ON user_country_preferences(is_primary);
```

### **Migration 4: Address Formats**
```sql
-- Migration: 004_create_country_address_formats.sql
CREATE TABLE country_address_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID REFERENCES countries(id),
  field_order JSONB NOT NULL,
  required_fields JSONB NOT NULL,
  validation_rules JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_address_formats_country_id ON country_address_formats(country_id);
```

### **Migration 5: Shipping Zones**
```sql
-- Migration: 005_create_shipping_zones.sql
CREATE TABLE shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID REFERENCES countries(id),
  name VARCHAR(100) NOT NULL,
  delivery_time_min INTEGER NOT NULL,
  delivery_time_max INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shipping_zones_country_id ON shipping_zones(country_id);
CREATE INDEX idx_shipping_zones_active ON shipping_zones(is_active);
```

### **Migration 6: Currency Rates**
```sql
-- Migration: 006_create_currency_rates.sql
CREATE TABLE currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);

CREATE INDEX idx_currency_rates_from ON currency_rates(from_currency);
CREATE INDEX idx_currency_rates_to ON currency_rates(to_currency);
```

### **Migration 7: Product Country Pricing**
```sql
-- Migration: 007_create_product_country_pricing.sql
CREATE TABLE product_country_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  country_id UUID REFERENCES countries(id),
  base_price DECIMAL(10,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, country_id)
);

CREATE INDEX idx_product_pricing_product_id ON product_country_pricing(product_id);
CREATE INDEX idx_product_pricing_country_id ON product_country_pricing(country_id);
```

---

## 🌱 **Data Seeding Plan**

### **Seed 1: Countries Data**
```sql
-- Seed: 001_countries_data.sql
INSERT INTO countries (code, name, currency_code, phone_code, timezone, locale) VALUES
('US', 'United States', 'USD', '+1', 'America/New_York', 'en-US'),
('IN', 'India', 'INR', '+91', 'Asia/Kolkata', 'hi-IN'),
('GB', 'United Kingdom', 'GBP', '+44', 'Europe/London', 'en-GB'),
('CA', 'Canada', 'CAD', '+1', 'America/Toronto', 'en-CA'),
('AU', 'Australia', 'AUD', '+61', 'Australia/Sydney', 'en-AU'),
('DE', 'Germany', 'EUR', '+49', 'Europe/Berlin', 'de-DE'),
('FR', 'France', 'EUR', '+33', 'Europe/Paris', 'fr-FR'),
('JP', 'Japan', 'JPY', '+81', 'Asia/Tokyo', 'ja-JP'),
('CN', 'China', 'CNY', '+86', 'Asia/Shanghai', 'zh-CN'),
('BR', 'Brazil', 'BRL', '+55', 'America/Sao_Paulo', 'pt-BR');
```

### **Seed 2: Country Configurations**
```sql
-- Seed: 002_country_configurations.sql
-- US Configuration
INSERT INTO country_configurations (country_id, config_key, config_value) VALUES
((SELECT id FROM countries WHERE code = 'US'), 'phone_format', '{"pattern": "^\\\\+1[0-9]{10}$", "format": "(XXX) XXX-XXXX"}'),
((SELECT id FROM countries WHERE code = 'US'), 'postal_code', '{"pattern": "^[0-9]{5}(-[0-9]{4})?$", "required": true}'),
((SELECT id FROM countries WHERE code = 'US'), 'address_format', '{"fields": ["street", "city", "state", "zip", "country"], "required": ["street", "city", "state", "zip"]}'),
((SELECT id FROM countries WHERE code = 'US'), 'tax_rate', '{"rate": 0.08, "inclusive": false}');

-- India Configuration
INSERT INTO country_configurations (country_id, config_key, config_value) VALUES
((SELECT id FROM countries WHERE code = 'IN'), 'phone_format', '{"pattern": "^\\\\+91[0-9]{10}$", "format": "XXXXX XXXXX"}'),
((SELECT id FROM countries WHERE code = 'IN'), 'postal_code', '{"pattern": "^[1-9][0-9]{5}$", "required": true}'),
((SELECT id FROM countries WHERE code = 'IN'), 'address_format', '{"fields": ["street", "area", "city", "state", "pincode", "country"], "required": ["street", "city", "state", "pincode"]}'),
((SELECT id FROM countries WHERE code = 'IN'), 'tax_rate', '{"rate": 0.18, "inclusive": true}');
```

### **Seed 3: Shipping Zones**
```sql
-- Seed: 003_shipping_zones.sql
-- US Shipping Zones
INSERT INTO shipping_zones (country_id, name, delivery_time_min, delivery_time_max) VALUES
((SELECT id FROM countries WHERE code = 'US'), 'Continental US', 3, 5),
((SELECT id FROM countries WHERE code = 'US'), 'Alaska & Hawaii', 7, 10);

-- India Shipping Zones
INSERT INTO shipping_zones (country_id, name, delivery_time_min, delivery_time_max) VALUES
((SELECT id FROM countries WHERE code = 'IN'), 'Metro Cities', 2, 3),
((SELECT id FROM countries WHERE code = 'IN'), 'Other Cities', 4, 6);
```

### **Seed 4: Currency Rates**
```sql
-- Seed: 004_currency_rates.sql
INSERT INTO currency_rates (from_currency, to_currency, rate) VALUES
('USD', 'INR', 83.50),
('USD', 'GBP', 0.79),
('USD', 'EUR', 0.92),
('USD', 'CAD', 1.35),
('USD', 'AUD', 1.52),
('INR', 'USD', 0.012),
('GBP', 'USD', 1.27),
('EUR', 'USD', 1.09);
```

---

## 🧪 **Testing Strategy**

### **Unit Tests**
- [ ] **Country Configuration Tests**
  - [ ] Test country config CRUD operations
  - [ ] Test country config validation
  - [ ] Test country config caching

- [ ] **Currency Service Tests**
  - [ ] Test currency conversion logic
  - [ ] Test currency rate updates
  - [ ] Test currency formatting

- [ ] **Address Validation Tests**
  - [ ] Test postal code validation per country
  - [ ] Test address format validation
  - [ ] Test required field validation

- [ ] **Phone Validation Tests**
  - [ ] Test international phone validation
  - [ ] Test country-specific phone formatting
  - [ ] Test phone number parsing

### **Integration Tests**
- [ ] **Country API Tests**
  - [ ] Test country configuration endpoints
  - [ ] Test country-specific address validation
  - [ ] Test country-specific shipping calculation

- [ ] **Multi-Country Flow Tests**
  - [ ] Test complete checkout flow for US
  - [ ] Test complete checkout flow for India
  - [ ] Test country switching during checkout

### **End-to-End Tests**
- [ ] **US Checkout Flow**
  - [ ] Test address validation with US format
  - [ ] Test shipping calculation for US
  - [ ] Test tax calculation for US
  - [ ] Test payment processing for US

- [ ] **India Checkout Flow**
  - [ ] Test address validation with India format
  - [ ] Test shipping calculation for India
  - [ ] Test tax calculation for India
  - [ ] Test payment processing for India

- [ ] **Country Switching**
  - [ ] Test switching countries during checkout
  - [ ] Test currency conversion when switching
  - [ ] Test address format changes when switching

---

## 📊 **Performance Optimization**

### **Caching Strategy**
- [ ] **Redis Caching**
  - [ ] Cache country configurations (1 hour TTL)
  - [ ] Cache currency rates (30 minutes TTL)
  - [ ] Cache shipping zones (1 hour TTL)
  - [ ] Cache address validation rules (1 hour TTL)

### **Database Optimization**
- [ ] **Indexes**
  - [ ] Add indexes on frequently queried fields
  - [ ] Add composite indexes for complex queries
  - [ ] Monitor query performance

### **Frontend Optimization**
- [ ] **Lazy Loading**
  - [ ] Lazy load country-specific components
  - [ ] Lazy load country-specific validation rules
  - [ ] Lazy load country-specific address formats

- [ ] **Bundle Optimization**
  - [ ] Split country-specific code into separate chunks
  - [ ] Use dynamic imports for country-specific features
  - [ ] Optimize bundle size per country

---

## 🔒 **Security Considerations**

### **Data Protection**
- [ ] **GDPR Compliance**
  - [ ] Add data protection notices per country
  - [ ] Add consent management per country
  - [ ] Add data deletion per country

### **Input Validation**
- [ ] **Country-Specific Validation**
  - [ ] Validate all country-specific inputs
  - [ ] Sanitize country-specific data
  - [ ] Add rate limiting per country

### **API Security**
- [ ] **Country-Based Access Control**
  - [ ] Add country-based API access control
  - [ ] Add country-specific rate limiting
  - [ ] Add country-specific authentication

---

## 📈 **Monitoring & Analytics**

### **Country-Specific Metrics**
- [ ] **Conversion Tracking**
  - [ ] Track conversion rates per country
  - [ ] Track checkout completion per country
  - [ ] Track cart abandonment per country

### **Performance Monitoring**
- [ ] **Country Performance**
  - [ ] Monitor API response times per country
  - [ ] Monitor page load times per country
  - [ ] Monitor error rates per country

### **Business Analytics**
- [ ] **Country Analytics**
  - [ ] Track revenue per country
  - [ ] Track customer acquisition per country
  - [ ] Track product performance per country

---

## 🚀 **Deployment Strategy**

### **Environment Configuration**
- [ ] **Production Environment**
  - [ ] Set up country configuration for production
  - [ ] Set up currency API keys for production
  - [ ] Set up monitoring for production

### **Staging Environment**
- [ ] **Staging Setup**
  - [ ] Set up country configuration for staging
  - [ ] Set up test data for staging
  - [ ] Set up testing environment

### **Development Environment**
- [ ] **Development Setup**
  - [ ] Set up local country configuration
  - [ ] Set up local currency rates
  - [ ] Set up local testing data

---

## 📚 **Documentation Plan**

### **API Documentation**
- [ ] **Country API Docs**
  - [ ] Document country configuration endpoints
  - [ ] Document country-specific validation endpoints
  - [ ] Document country-specific shipping endpoints

### **User Documentation**
- [ ] **Country Support Docs**
  - [ ] Document supported countries
  - [ ] Document country-specific features
  - [ ] Document country-specific requirements

### **Developer Documentation**
- [ ] **Implementation Guide**
  - [ ] Document country configuration setup
  - [ ] Document country-specific feature implementation
  - [ ] Document testing procedures

---

## 🎯 **Success Metrics**

### **Technical Metrics**
- [ ] **Performance**
  - [ ] API response time < 200ms
  - [ ] Page load time < 3 seconds
  - [ ] Error rate < 0.1%

### **Business Metrics**
- [ ] **Conversion**
  - [ ] Checkout completion rate > 80%
  - [ ] Cart abandonment rate < 20%
  - [ ] Customer satisfaction > 4.5/5

### **Operational Metrics**
- [ ] **Reliability**
  - [ ] Uptime > 99.9%
  - [ ] Country switching success rate > 99%
  - [ ] Address validation accuracy > 95%

---

## 📅 **Timeline Summary**

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| **Phase 1** | Weeks 1-2 | Database schema, basic country services |
| **Phase 2** | Weeks 3-4 | Address validation, phone formatting, shipping |
| **Phase 3** | Weeks 5-6 | Tax calculation, payment methods, integration |
| **Frontend** | Weeks 7-9 | Country context, components, integration |
| **Testing** | Weeks 10-11 | Unit tests, integration tests, E2E tests |
| **Deployment** | Week 12 | Production deployment, monitoring setup |

**Total Duration**: 12 weeks
**Team Size**: 2-3 developers
**Budget**: Medium (focused on infrastructure and core features)

---

## 🎉 **Conclusion**

This implementation plan provides a comprehensive roadmap for adding multi-country support to our e-commerce platform. The phased approach ensures that we build a solid foundation while gradually adding advanced features. The focus on scalability, maintainability, and operational excellence will ensure that the system can grow with our business needs.

**Key Success Factors:**
1. **Strong Foundation**: Solid database schema and backend services
2. **Incremental Development**: Phased approach with clear milestones
3. **Comprehensive Testing**: Unit, integration, and E2E tests
4. **Performance Optimization**: Caching and optimization strategies
5. **Operational Excellence**: Monitoring, analytics, and documentation

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular progress reviews and adjustments

---

*This document will be updated as the implementation progresses and new requirements are identified.*
