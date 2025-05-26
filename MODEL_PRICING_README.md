# Model Pricing Integration

This feature automatically fetches and displays pricing information for AI models from OpenRouter, showing input and output costs per million tokens.

## Features

### 1. Backend API Endpoint
- **`GET /api/models/list`** - Fetches models with pricing from OpenRouter API
- **`POST /api/models/refresh`** - Clears cache to force fresh data fetch
- Includes 1-hour caching to reduce API calls
- Graceful fallback to cached data if API fails

### 2. Enhanced Model Selection Component
- Displays pricing inline in the dropdown: `Model Name - In: $X.XX/M, Out: $Y.YY/M`
- Automatically sorts models by total cost (cheapest first)
- Groups models by provider for better organization
- Shows helpful pricing context below the dropdown

### 3. Detailed Pricing Table
- **`/pricing`** page with comprehensive model comparison
- Sortable by name, provider, or price
- Shows input cost, output cost, total cost, and context length
- Refresh button to update pricing data
- Responsive table design

## Usage

### In Model Selection Dropdown
The pricing is automatically displayed when you use the `ModelSelection` component:

```tsx
import { ModelSelection } from '@/components/ui/model-selection'

<ModelSelection 
  value={selectedModel}
  onChange={setSelectedModel}
/>
```

### Standalone Pricing Table
Display the full pricing comparison table:

```tsx
import { ModelPricingInfo } from '@/components/ui/model-pricing-info'

<ModelPricingInfo />
```

## API Response Format

The backend transforms OpenRouter's API response to include:

```json
{
  "models": [
    {
      "id": "anthropic/claude-3.5-haiku",
      "name": "Claude 3.5 Haiku",
      "description": "Fast and efficient model...",
      "context_length": 200000,
      "pricing": {
        "prompt": "0.000001",
        "completion": "0.000005", 
        "prompt_per_million": 1.00,
        "completion_per_million": 5.00
      },
      "top_provider": {
        "name": "Anthropic"
      }
    }
  ]
}
```

## Configuration

### Backend Requirements
- Add `httpx` to `requirements.txt` (already done)
- Ensure `OPENROUTER_API_KEY` is set in your `.env` file
- The API key is used to fetch model pricing data

### Cache Settings
- Cache duration: 1 hour (3600 seconds)
- Cache is stored in memory (resets on server restart)
- Use `/api/models/refresh` endpoint to clear cache manually

## Error Handling

- **API Failures**: Falls back to cached data or default models
- **Network Timeouts**: Returns stale cached data if available
- **Missing Pricing**: Shows "Free" for models without pricing data
- **Invalid Data**: Gracefully handles malformed API responses

## Benefits

1. **Cost Transparency**: Users can see exact pricing before selecting models
2. **Smart Defaults**: Models sorted by cost help users choose economical options
3. **Real-time Data**: Pricing updates automatically from OpenRouter
4. **Performance**: Caching reduces API calls and improves response times
5. **Reliability**: Fallback mechanisms ensure the app works even if pricing API fails

## Future Enhancements

- [ ] Add usage tracking to show actual costs
- [ ] Implement cost alerts/budgets
- [ ] Add pricing history/trends
- [ ] Support for custom pricing tiers
- [ ] Export pricing data to CSV/JSON 