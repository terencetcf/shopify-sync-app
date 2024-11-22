import { DetailedProduct } from '../../types/product';

interface ProductImagesProps {
  product: DetailedProduct;
}

export default function ProductImages({ product }: ProductImagesProps) {
  if (!product.images?.edges.length) return null;

  return (
    <div className="border-b border-gray-700 pb-6">
      <h3 className="text-lg font-medium text-gray-200 mb-4">Images</h3>
      <div className="grid grid-cols-2 gap-4">
        {product.images.edges.map(({ node }) => (
          <div key={node.id} className="relative aspect-square">
            <img
              src={node.url}
              alt={node.altText || product.title}
              className="object-cover rounded-lg"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
