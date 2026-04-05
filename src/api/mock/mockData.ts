import { CategoryPagedQueryResponse } from "@commercetools/platform-sdk";
import { MyProductsData } from "@/@types/interfaces";

type MockCategory = {
  id: string;
  key: string;
  name: { "en-US": string };
  slug: { "en-US": string };
  orderHint: string;
  parent?: { id: string };
};

type MockProductRecord = MyProductsData & {
  categoryIds: string[];
};

const categories: MockCategory[] = [
  {
    id: "cat-furniture",
    key: "furniture",
    name: { "en-US": "Furniture" },
    slug: { "en-US": "furniture" },
    orderHint: "0.1",
  },
  {
    id: "cat-kitchen",
    key: "kitchen",
    name: { "en-US": "Kitchen" },
    slug: { "en-US": "kitchen" },
    orderHint: "0.2",
  },
  {
    id: "cat-home-decor",
    key: "home-decor",
    name: { "en-US": "Home Decor" },
    slug: { "en-US": "home-decor" },
    orderHint: "0.3",
  },
  {
    id: "cat-new-arrivals",
    key: "new-arrivals",
    name: { "en-US": "New Arrivals" },
    slug: { "en-US": "new-arrivals" },
    orderHint: "0.4",
  },
  {
    id: "cat-bakeware",
    key: "bakeware",
    name: { "en-US": "Bakeware" },
    slug: { "en-US": "bakeware" },
    orderHint: "0.5",
    parent: { id: "cat-kitchen" },
  },
  {
    id: "cat-bowls",
    key: "bowls",
    name: { "en-US": "Bowls" },
    slug: { "en-US": "bowls" },
    orderHint: "0.6",
    parent: { id: "cat-kitchen" },
  },
  {
    id: "cat-living-room",
    key: "living-room-furniture",
    name: { "en-US": "Living Room Furniture" },
    slug: { "en-US": "living-room-furniture" },
    orderHint: "0.7",
    parent: { id: "cat-furniture" },
  },
  {
    id: "cat-bedroom-furniture",
    key: "bedroom-furniture",
    name: { "en-US": "Bedroom Furniture" },
    slug: { "en-US": "bedroom-furniture" },
    orderHint: "0.8",
    parent: { id: "cat-furniture" },
  },
  {
    id: "cat-sofas",
    key: "sofas",
    name: { "en-US": "Sofas" },
    slug: { "en-US": "sofas" },
    orderHint: "0.9",
    parent: { id: "cat-furniture" },
  },
  {
    id: "cat-tables",
    key: "tables",
    name: { "en-US": "Tables" },
    slug: { "en-US": "tables" },
    orderHint: "1.0",
    parent: { id: "cat-furniture" },
  },
  {
    id: "cat-bar-accessories",
    key: "bar-accessories",
    name: { "en-US": "Bar Accessories" },
    slug: { "en-US": "bar-accessories" },
    orderHint: "1.1",
    parent: { id: "cat-kitchen" },
  },
  {
    id: "cat-bar-glass",
    key: "bar-and-glassware",
    name: { "en-US": "Bar and Glassware" },
    slug: { "en-US": "bar-and-glassware" },
    orderHint: "1.2",
    parent: { id: "cat-kitchen" },
  },
  {
    id: "cat-room-decor",
    key: "room-decor",
    name: { "en-US": "Room Decor" },
    slug: { "en-US": "room-decor" },
    orderHint: "1.3",
    parent: { id: "cat-home-decor" },
  },
  {
    id: "cat-minimalist",
    key: "the-minimalist",
    name: { "en-US": "The Minimalist" },
    slug: { "en-US": "the-minimalist" },
    orderHint: "1.4",
    parent: { id: "cat-home-decor" },
  },
];

const products: MockProductRecord[] = [
  {
    id: "p-lamp-01",
    key: "cozy-floor-lamp",
    date: "2026-01-05",
    name: "Cozy Floor Lamp",
    description: "Warm and minimal floor lamp for living rooms.",
    sku: "LAMP-001",
    price: 79.99,
    priceDiscounted: 59.99,
    images: [{ url: "https://picsum.photos/seed/lamp-1/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/lamp-1/600/600", dimensions: { w: 600, h: 600 } }] },
      { id: 2, key: "2", images: [{ url: "https://picsum.photos/seed/lamp-2/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-living-room", "cat-room-decor"],
  },
  {
    id: "p-chair-01",
    key: "ergonomic-chair",
    date: "2026-01-07",
    name: "Ergonomic Chair",
    description: "Adjustable office chair with lumbar support.",
    sku: "CHAIR-001",
    price: 149.0,
    priceDiscounted: 0,
    images: [{ url: "https://picsum.photos/seed/chair-1/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/chair-1/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-bedroom-furniture"],
  },
  {
    id: "p-table-01",
    key: "oak-dining-table",
    date: "2026-01-08",
    name: "Oak Dining Table",
    description: "Solid oak table for six people.",
    sku: "TABLE-001",
    price: 329.0,
    priceDiscounted: 279.0,
    images: [{ url: "https://picsum.photos/seed/table-1/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/table-1/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-kitchen", "cat-tables"],
  },
  {
    id: "p-mug-01",
    key: "ceramic-mug-set",
    date: "2026-01-09",
    name: "Ceramic Mug Set",
    description: "Set of four handcrafted ceramic mugs.",
    sku: "MUG-001",
    price: 24.5,
    priceDiscounted: 19.9,
    images: [{ url: "https://picsum.photos/seed/mug-1/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/mug-1/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-kitchen", "cat-bowls"],
  },
  {
    id: "p-rug-01",
    key: "wool-rug",
    date: "2026-01-11",
    name: "Soft Wool Rug",
    description: "Neutral wool rug for cozy interiors.",
    sku: "RUG-001",
    price: 119.0,
    priceDiscounted: 0,
    images: [{ url: "https://picsum.photos/seed/rug-1/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/rug-1/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-home-decor", "cat-room-decor"],
  },
  {
    id: "p-shelf-01",
    key: "wall-shelf",
    date: "2026-01-12",
    name: "Wall Shelf",
    description: "Floating wall shelf in matte black.",
    sku: "SHELF-001",
    price: 39.0,
    priceDiscounted: 29.0,
    images: [{ url: "https://picsum.photos/seed/shelf-1/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/shelf-1/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-furniture", "cat-new-arrivals"],
  },
  {
    id: "p-vase-01",
    key: "ceramic-vase",
    date: "2026-01-15",
    name: "Ceramic Vase",
    description: "Hand-painted ceramic vase for fresh flowers.",
    sku: "VASE-001",
    price: 45.0,
    priceDiscounted: 35.0,
    images: [{ url: "https://picsum.photos/seed/vase-1/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/vase-1/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-home-decor", "cat-new-arrivals"],
  },
  {
    id: "p-bowl-01",
    key: "mixing-bowl-set",
    date: "2026-01-18",
    name: "Mixing Bowl Set",
    description: "Set of three mixing bowls in different sizes.",
    sku: "BOWL-001",
    price: 29.99,
    priceDiscounted: 24.99,
    images: [{ url: "https://picsum.photos/seed/bowl-1/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/bowl-1/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-kitchen", "cat-bowls"],
  },
  {
    id: "p-sofa-01",
    key: "modern-sofa",
    date: "2026-01-20",
    name: "Modern Sofa",
    description: "Sleek three-seater sofa in gray fabric.",
    sku: "SOFA-001",
    price: 899.0,
    priceDiscounted: 799.0,
    images: [{ url: "https://picsum.photos/seed/sofa-1/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/sofa-1/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-living-room", "cat-sofas"],
  },
  {
    id: "p-lamp-02",
    key: "minimalist-table-lamp",
    date: "2026-01-22",
    name: "Minimalist Table Lamp",
    description: "Compact table lamp with a modern design.",
    sku: "LAMP-002",
    price: 49.99,
    priceDiscounted: 39.99,
    images: [{ url: "https://picsum.photos/seed/lamp-2/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/lamp-2/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-living-room", "cat-new-arrivals"],
  },
  {
    id: "p-chair-02",
    key: "accent-chair",
    date: "2026-01-25",
    name: "Accent Chair",
    description: "Stylish accent chair with a velvet finish.",
    sku: "CHAIR-002",
    price: 199.0,
    priceDiscounted: 149.0,
    images: [{ url: "https://picsum.photos/seed/chair-2/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
      { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/chair-2/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-bedroom-furniture", "cat-new-arrivals"],
  },
  {
    id: "p-decor-01",
    key: "geometric-wall-art",
    date: "2026-01-28",
    name: "Geometric Wall Art",
    description: "Abstract geometric print for modern interiors.",
    sku: "DECOR-001",
    price: 59.0,
    priceDiscounted: 49.0,
    images: [{ url: "https://picsum.photos/seed/decor-1/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
        { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/decor-1/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-home-decor", "cat-new-arrivals"],
  },
  {
    id: "p-decor-02",
    key: "abstract-sculpture",
    date: "2026-01-30",
    name: "Abstract Sculpture",
    description: "Modern abstract sculpture for living spaces.",
    sku: "DECOR-002",
    price: 89.0,
    priceDiscounted: 69.0,
    images: [{ url: "https://picsum.photos/seed/decor-2/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
        { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/decor-2/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-home-decor", "cat-new-arrivals", "cat-minimalist"],
  },
  {
    id: "p-decor-03",
    key: "ceramic-figurine",
    date: "2026-02-01",
    name: "Ceramic Figurine",
    description: "Handcrafted ceramic figurine for shelf decor.",
    sku: "DECOR-003",
    price: 34.0,
    priceDiscounted: 24.0,
    images: [{ url: "https://picsum.photos/seed/decor-3/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
        { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/decor-3/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-home-decor", "cat-new-arrivals"],
  },
  {
    id: "p-decor-04",
    key: "wooden-candle-holder",
    date: "2026-02-03",
    name: "Wooden Candle Holder",
    description: "Rustic wooden candle holder for cozy ambiance.",
    sku: "DECOR-004",
    price: 27.0,
    priceDiscounted: 17.0,
    images: [{ url: "https://picsum.photos/seed/decor-4/600/600", dimensions: { w: 600, h: 600 } }],
    variants: [
        { id: 1, key: "1", images: [{ url: "https://picsum.photos/seed/decor-4/600/600", dimensions: { w: 600, h: 600 } }] },
    ],
    categoryIds: ["cat-home-decor", "cat-new-arrivals"],
  }
];

const byNameAsc = (a: MyProductsData, b: MyProductsData): number =>
  a.name.localeCompare(b.name);

const byNameDesc = (a: MyProductsData, b: MyProductsData): number =>
  b.name.localeCompare(a.name);

const byPriceAsc = (a: MyProductsData, b: MyProductsData): number => a.price - b.price;

const byPriceDesc = (a: MyProductsData, b: MyProductsData): number => b.price - a.price;

export const mockProducts: MyProductsData[] = products.map((p) => ({ ...p }));

export function getMockProductByKey(key: string): MyProductsData | undefined {
  const found = products.find((p) => p.key === key || p.id === key);
  return found ? { ...found } : undefined;
}

export function searchMockProductsByName(query: string): MyProductsData[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  return products
    .filter((p) => p.name.toLowerCase().includes(normalizedQuery))
    .map((p) => ({ ...p }));
}

export function searchMockProductsByCategory(categoryId: string): MyProductsData[] {
  return products
    .filter((p) => p.categoryIds.includes(categoryId))
    .map((p) => ({ ...p }));
}

export function getMockProducts(args?: {
  limit?: number;
  sort?: string | string[];
  offset?: number;
}): { products: MyProductsData[]; total: number } {
  const total = products.length;
  const sortArg = Array.isArray(args?.sort) ? args?.sort[0] : args?.sort;
  const offset = args?.offset ?? 0;
  const limit = args?.limit ?? total;

  let sorted = products.map((p) => ({ ...p }));

  if (sortArg?.includes("name") && sortArg?.toLowerCase().includes("desc")) {
    sorted = sorted.sort(byNameDesc);
  } else if (sortArg?.includes("name")) {
    sorted = sorted.sort(byNameAsc);
  } else if (sortArg?.includes("price") && sortArg?.toLowerCase().includes("desc")) {
    sorted = sorted.sort(byPriceDesc);
  } else if (sortArg?.includes("price")) {
    sorted = sorted.sort(byPriceAsc);
  }

  const paged = sorted.slice(offset, offset + limit);
  return { products: paged, total };
}

export function getMockCategories(args?: {
  limit?: number;
  sort?: string;
  where?: string;
}): CategoryPagedQueryResponse {
  let results = [...categories];

  const where = args?.where;
  if (where) {
    const slugMatch = where.match(/slug\(en-US="([^"]+)"\)/);
    if (slugMatch?.[1]) {
      results = results.filter((c) => c.slug["en-US"] === slugMatch[1]);
    }
  }

  if (args?.sort?.includes("name") && args.sort.toLowerCase().includes("desc")) {
    results.sort((a, b) => b.name["en-US"].localeCompare(a.name["en-US"]));
  } else if (args?.sort?.includes("name")) {
    results.sort((a, b) => a.name["en-US"].localeCompare(b.name["en-US"]));
  }

  const limited = typeof args?.limit === "number" ? results.slice(0, args.limit) : results;

  return {
    limit: args?.limit ?? limited.length,
    offset: 0,
    count: limited.length,
    total: limited.length,
    results: limited as unknown as CategoryPagedQueryResponse["results"],
  };
}
