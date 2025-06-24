# Phase 2.2: Advanced Query Features - Implementation Documentation

## Overview

Phase 2.2 implements advanced query features for the Elasticsearch-based search system, providing sophisticated search capabilities including multi-field search with boosting, fuzzy matching, phrase matching, boolean operators, and custom scoring algorithms.

## Implementation Summary

### ✅ **Status**: COMPLETED
- **Implementation Date**: January 2024
- **Development Time**: 3-4 days
- **Priority**: High

## Key Components Implemented

### 1. Extended Search DTOs (`SearchProductsQueryDto`)

Enhanced the search query DTO with advanced parameters:

```typescript
export class SearchProductsQueryDto {
  // Basic search
  q?: string;
  
  // Advanced query control
  query_type?: QueryType;          // multi_match, phrase, prefix, fuzzy, wildcard, boolean
  search_mode?: SearchMode;        // standard, strict, relaxed
  fuzzy?: boolean;                 // Enable fuzzy matching
  fuzziness?: string;              // Fuzziness level (0-2 or AUTO)
  phrase_match?: boolean;          // Enable phrase matching
  proximity?: number;              // Proximity distance (0-10)
  minimum_should_match?: number;   // Minimum should match percentage
  boolean_query?: string;          // Boolean query with operators
  
  // Custom scoring
  function_score?: boolean;        // Enable function score
  field_boosts?: Record<string, number>;  // Custom field boosts
  score_factors?: Record<string, number>; // Custom scoring factors
  
  // Standard filters (category, brand, price, etc.)
  // ... existing filters
}
```

### 2. QueryBuilder Utility (`QueryBuilder`)

Comprehensive query builder supporting all advanced query types:

#### Features:
- **Multi-Match Queries**: Cross-fields, best-fields, most-fields
- **Field Boosting**: Configurable boost values for different fields
- **Fuzzy Matching**: Typo tolerance with configurable fuzziness
- **Phrase Matching**: Exact phrase search with proximity settings
- **Boolean Queries**: Support for +, -, AND, OR operators
- **Wildcard Queries**: Pattern matching with * and ? operators
- **Function Score**: Custom relevance scoring with multiple factors

#### Example Usage:
```typescript
const queryBuilder = new QueryBuilder();

// Multi-match with custom boosts
const query = queryBuilder.buildSearchQuery({
  q: 'laptop gaming',
  query_type: QueryType.MULTI_MATCH,
  search_mode: SearchMode.STANDARD,
  field_boosts: { title: 5, brand: 3 },
  function_score: true
});

// Boolean query with operators
const boolQuery = queryBuilder.buildSearchQuery({
  q: '+laptop -refurbished',
  query_type: QueryType.BOOLEAN,
  search_mode: SearchMode.STRICT
});
```

### 3. AdvancedSearchService

Intelligent search service with query analysis and optimization:

#### Key Methods:

**Query Analysis**:
```typescript
analyzeQuery(queryText: string): QueryAnalysis
```
- Detects query complexity
- Identifies phrases, wildcards, boolean operators
- Recommends optimal query type and search mode

**Optimized Search**:
```typescript
async executeOptimizedSearch(query: SearchProductsQueryDto): Promise<AdvancedSearchResult>
```
- Analyzes query and applies optimizations
- Returns search results with explanations

**Strategy Comparison**:
```typescript
async compareQueryStrategies(query: SearchProductsQueryDto)
```
- Tests different query strategies
- Compares performance and relevance scores

**Query Validation**:
```typescript
validateAndOptimizeQuery(query: SearchProductsQueryDto)
```
- Validates query parameters
- Provides optimization suggestions

### 4. Enhanced SearchService

Updated the main search service to use the advanced QueryBuilder:

```typescript
// Advanced text query building
if (query.q) {
  const queryBuilderOptions: QueryBuilderOptions = {
    enableFunctionScore: query.function_score !== false,
    enableBoosting: true,
    enableSynonyms: true,
  };
  
  const textQuery = this.queryBuilder.buildSearchQuery(query, queryBuilderOptions);
  
  if (query.function_score !== false && textQuery.function_score) {
    // Use function score query directly
    return completeQueryWithFunctionScore;
  } else {
    must.push(textQuery);
  }
}
```

### 5. Advanced Search Endpoints

New controller endpoints for Phase 2.2 features:

#### Main Endpoints:

1. **`GET /api/search/products/advanced`**
   - Intelligent search with automatic optimization
   - Returns results with query analysis

2. **`GET /api/search/query/analyze`**
   - Analyzes query complexity and provides recommendations
   - Suggests optimal query type and search mode

3. **`GET /api/search/query/compare`**
   - Compares different query strategies
   - Returns performance metrics and recommendations

4. **`GET /api/search/query/explain/:productId`**
   - Explains why a product matches a query
   - Provides detailed scoring breakdown

5. **`GET /api/search/query/validate`**
   - Validates query parameters
   - Provides optimization suggestions

## Advanced Query Types

### 1. Multi-Match Queries

**Standard Mode** (Combines multiple query types):
```json
{
  "bool": {
    "should": [
      {
        "multi_match": {
          "query": "smartphone samsung",
          "fields": ["title^3", "description^1", "brand^2"],
          "type": "best_fields",
          "fuzziness": "AUTO"
        }
      },
      {
        "multi_match": {
          "query": "smartphone samsung",
          "fields": ["title^5", "keywords^3"],
          "type": "phrase",
          "boost": 2
        }
      },
      {
        "multi_match": {
          "query": "smartphone samsung",
          "fields": ["title.keyword", "brand.keyword"],
          "type": "phrase_prefix",
          "boost": 1.5
        }
      }
    ]
  }
}
```

### 2. Fuzzy Matching

```json
{
  "bool": {
    "should": [
      {
        "match": {
          "title": {
            "query": "smartfone",
            "fuzziness": "AUTO",
            "prefix_length": 1,
            "max_expansions": 50,
            "boost": 3
          }
        }
      }
    ]
  }
}
```

### 3. Boolean Queries

Input: `+smartphone -refurbished android OR ios`
```json
{
  "bool": {
    "must": [
      { "multi_match": { "query": "smartphone", "fields": ["title^3", "description^1"] } }
    ],
    "must_not": [
      { "multi_match": { "query": "refurbished", "fields": ["title^3", "description^1"] } }
    ],
    "should": [
      { "multi_match": { "query": "android", "fields": ["title^3", "description^1"] } },
      { "multi_match": { "query": "ios", "fields": ["title^3", "description^1"] } }
    ]
  }
}
```

### 4. Function Score Queries

```json
{
  "function_score": {
    "query": { "multi_match": { ... } },
    "functions": [
      {
        "filter": { "term": { "is_featured": true } },
        "weight": 1.5
      },
      {
        "field_value_factor": {
          "field": "popularity_score",
          "factor": 1.2,
          "modifier": "log1p"
        }
      },
      {
        "gauss": {
          "created_at": {
            "origin": "now",
            "scale": "30d",
            "decay": 0.5
          }
        }
      }
    ],
    "score_mode": "multiply",
    "boost_mode": "multiply"
  }
}
```

## Search Modes

### 1. Standard Mode
- **Use Case**: General search with balanced precision and recall
- **Behavior**: Combines multiple query types for best results
- **Operator**: `and`
- **Minimum Should Match**: 75%

### 2. Strict Mode
- **Use Case**: Precise searches where all terms should match
- **Behavior**: Uses `most_fields` and `and` operator
- **Operator**: `and`
- **Minimum Should Match**: 100%

### 3. Relaxed Mode
- **Use Case**: Broad searches for maximum recall
- **Behavior**: Uses `best_fields` and `or` operator
- **Operator**: `or`
- **Minimum Should Match**: 50%

## Performance Optimizations

### 1. Query Optimization
- Automatic fuzziness settings based on query complexity
- Field boost optimization for relevance
- Query type selection based on content analysis

### 2. Caching Strategy
- Function score results cached separately
- Query analysis results cached for repeated patterns
- Performance metrics cached for strategy comparison

### 3. Resource Management
- Maximum query complexity limits
- Timeout settings for all query types
- Bulk query optimization for comparisons

## API Examples

### Basic Advanced Search
```bash
GET /api/search/products/advanced?q=laptop&query_type=multi_match&fuzzy=true
```

### Boolean Search
```bash
GET /api/search/products/advanced?q=+laptop -refurbished&query_type=boolean
```

### Phrase Search with Proximity
```bash
GET /api/search/products/advanced?q="gaming laptop"&query_type=phrase&proximity=2
```

### Custom Field Boosting
```bash
GET /api/search/products/advanced?q=samsung&field_boosts[title]=5&field_boosts[brand]=3
```

### Query Analysis
```bash
GET /api/search/query/analyze?q="+smartphone -android 'latest model'"
```

### Strategy Comparison
```bash
GET /api/search/query/compare?q=laptop gaming
```

## Testing and Validation

### Unit Tests
- QueryBuilder functionality for all query types
- AdvancedSearchService query analysis
- Parameter validation and optimization

### Integration Tests
- End-to-end search with different query types
- Performance comparison between strategies
- Error handling for invalid queries

### Performance Tests
- Query execution time benchmarks
- Memory usage for complex queries
- Concurrent search handling

## Monitoring and Analytics

### Metrics Tracked
- Query complexity distribution
- Query type usage patterns
- Performance metrics by query type
- Optimization success rates

### Performance Indicators
- Average response time by query type
- Cache hit rates for query analysis
- Function score computation time
- Strategy comparison overhead

## Security Considerations

### Input Validation
- Query length limits (max 1000 characters)
- Parameter range validation
- SQL injection prevention for boolean queries

### Resource Protection
- Query complexity limits
- Timeout settings
- Rate limiting for expensive operations

## Future Enhancements

### Phase 3 Preparations
- Machine learning integration hooks
- Personalization query modifications
- A/B testing framework setup

### Performance Improvements
- Query result clustering
- Semantic similarity matching
- Advanced caching strategies

---

## Conclusion

Phase 2.2 successfully implements comprehensive advanced query features, providing:

- **6 different query types** with intelligent selection
- **3 search modes** for different use cases
- **Automatic query optimization** with analysis
- **Performance monitoring** and comparison tools
- **Comprehensive validation** and error handling

The implementation is production-ready and provides a solid foundation for Phase 3 advanced features like autocomplete and real-time synchronization.

**Next Steps**: Ready to proceed with Phase 2.3 (Faceted Search & Aggregations) or Phase 3.1 (Autocomplete & Search Suggestions). 