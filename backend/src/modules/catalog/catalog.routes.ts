import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { listProducts, getProductBySlug, getRelatedProducts, listCategories } from "./catalog.service";

export const catalogRouter = Router();

/** GET /api/products — catálogo público com filtros, busca e paginação. */
catalogRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const result = await listProducts(req.query as Record<string, string>);
    res.json(result);
  }),
);

/** GET /api/products/:slug — detalhe do produto. */
catalogRouter.get(
  "/products/:slug",
  asyncHandler(async (req, res) => {
    const product = await getProductBySlug(req.params.slug);
    const related = await getRelatedProducts(product.id, product.category?.id ?? "", 4);
    res.json({ product, related });
  }),
);

/** GET /api/categories — categorias ativas com contagem de produtos. */
catalogRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json({ categories: await listCategories() });
  }),
);
