import { DetailedProduct } from '../../types/product';

interface ProductPricingProps {
  product: DetailedProduct;
}

export default function ProductPricing({ product }: ProductPricingProps) {
  return (
    <div className="border-b border-gray-700 pb-6">
      <h3 className="text-lg font-medium text-gray-200 mb-4">Pricing</h3>
      <div>
        <h4 className="text-sm font-medium text-gray-400">Price Range</h4>
        <p className="mt-1 text-sm text-gray-200">
          {`${product.priceRangeV2.minVariantPrice.currencyCode} ${product.priceRangeV2.minVariantPrice.amount}`}
          {product.priceRangeV2.maxVariantPrice.amount !==
            product.priceRangeV2.minVariantPrice.amount &&
            ` - ${product.priceRangeV2.maxVariantPrice.amount}`}
        </p>
      </div>
    </div>
  );
}
