export function productImageUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}shop/products/${encodeURIComponent(fileName)}`
}
