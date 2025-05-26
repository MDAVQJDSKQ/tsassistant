import { ModelPricingInfo } from '@/components/ui/model-pricing-info'

export default function PricingPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">AI Model Pricing</h1>
        <p className="text-gray-600 max-w-2xl">
          Compare pricing across different AI models available through OpenRouter. 
          All prices are shown per million tokens and are updated automatically from the OpenRouter API.
        </p>
      </div>
      
      <ModelPricingInfo />
    </div>
  )
} 