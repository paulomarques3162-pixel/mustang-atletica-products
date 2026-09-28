export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  productCount: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: string | null;
  stock: number;
  active: boolean;
  available: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  position: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  sku: string;
  category: { id: string; name: string; slug: string } | null;
  price: string;
  compareAtPrice: string | null;
  onSale: boolean;
  badge: string | null;
  featured: boolean;
  active: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  totalStock: number;
  available: boolean;
  stockLevel: "in" | "low" | "out";
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  size: string | null;
  color: string | null;
  sku: string;
  image: string | null;
  unitPrice: string;
  quantity: number;
  total: string;
  availableStock: number;
  active: boolean;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: string;
  currency: string;
}

export interface OrderSummary {
  id: string;
  number: string;
  status: string;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
  currency: string;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    variantLabel: string | null;
    sku: string;
    unitPrice: string;
    quantity: number;
    total: string;
  }>;
  payments: Array<{ id: string; method: string; status: string; amount: string; provider: string }>;
}

export interface PaymentView {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: string;
  provider: string;
  qrCodeImage?: string | null;
  qrCodeText?: string | null;
  boletoUrl?: string | null;
  boletoLine?: string | null;
  expiresAt?: string | null;
  sandbox: boolean;
}

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
}
