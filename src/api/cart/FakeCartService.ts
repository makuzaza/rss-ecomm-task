import { ICartService } from "@/@types/interfaces";
import { Cart, Customer, MyCartUpdate } from "@commercetools/platform-sdk";
import { getMockProductByKey, mockProducts } from "@/api/mock/mockData";

type PriceValue = {
  type: "centPrecision";
  currencyCode: "EUR";
  centAmount: number;
  fractionDigits: 2;
};

type MockLineItem = {
  id: string;
  productId: string;
  name: { "en-US": string };
  price: { value: PriceValue };
  discountedPricePerQuantity?: Array<{ discountedPrice: { value: PriceValue } }>;
  quantity: number;
  variant: {
    id: number;
    key: string;
    images?: Array<{ url: string }>;
  };
};

type MockCart = {
  id: string;
  version: number;
  lineItems: MockLineItem[];
  discountCodes: Array<{ discountCode: { id: string; typeId: "discount-code" } }>;
  totalPrice: PriceValue;
};

const STORAGE_KEY = "mockCart";
const PROMO_CODE = "PROMO20";
const PROMO_ID = "promo20-id";

const createPrice = (centAmount: number): PriceValue => ({
  type: "centPrecision",
  currencyCode: "EUR",
  centAmount,
  fractionDigits: 2,
});

const toCart = (cart: MockCart): Cart => cart as unknown as Cart;

const makeEmptyCart = (): MockCart => ({
  id: `mock-cart-${Date.now()}`,
  version: 1,
  lineItems: [],
  discountCodes: [],
  totalPrice: createPrice(0),
});

const getVariantData = (productId: string, variantId: number) => {
  const product = mockProducts.find((p) => p.id === productId);
  const variant = product?.variants?.find((v) => v.id === variantId);

  return {
    key: variant?.key || String(variantId),
    images: variant?.images || product?.images || [],
  };
};

const getProductData = (productId: string) => {
  const byId = mockProducts.find((p) => p.id === productId);
  if (byId) return byId;

  return getMockProductByKey(productId);
};

export class FakeCartService implements ICartService {
  private readCart(): MockCart | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as MockCart;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private writeCart(cart: MockCart): void {
    const normalized = this.recalculateTotals(cart);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  private recalculateTotals(cart: MockCart): MockCart {
    const subtotal = cart.lineItems.reduce((sum, item) => {
      const perItem = item.discountedPricePerQuantity?.[0]?.discountedPrice?.value?.centAmount
        ?? item.price.value.centAmount;
      return sum + perItem * item.quantity;
    }, 0);

    const hasPromo = cart.discountCodes.some((d) => d.discountCode.id === PROMO_ID);
    const totalCentAmount = hasPromo ? Math.round(subtotal * 0.8) : subtotal;

    return {
      ...cart,
      totalPrice: createPrice(totalCentAmount),
    };
  }

  async getActiveCart(): Promise<Cart> {
    const cart = this.readCart();
    if (!cart) {
      throw new Error("No active cart found");
    }

    return toCart(this.recalculateTotals(cart));
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createCart(_customer?: Customer): Promise<Cart> {
    const cart = makeEmptyCart();
    this.writeCart(cart);
    return toCart(cart);
  }

  async updateCart(cartId: string, payload: MyCartUpdate): Promise<Cart> {
    const cart = this.readCart();
    if (!cart || cart.id !== cartId) {
      throw new Error("Cart not found");
    }

    const nextCart: MockCart = {
      ...cart,
      version: cart.version + 1,
      lineItems: [...cart.lineItems],
      discountCodes: [...cart.discountCodes],
    };

    const actions = (payload.actions || []) as Array<{
      action: string;
      productId?: string;
      variantId?: number;
      quantity?: number;
      lineItemId?: string;
      code?: string;
      discountCode?: { id?: string };
    }>;

    for (const action of actions) {
      if (action.action === "addLineItem" && action.productId) {
        const product = getProductData(action.productId);
        if (!product) continue;

        const variantId = action.variantId || 1;
        const existing = nextCart.lineItems.find(
          (li) => li.productId === action.productId && li.variant.id === variantId,
        );

        if (existing) {
          existing.quantity += action.quantity || 1;
          continue;
        }

        const centAmount = Math.round((product.priceDiscounted || product.price) * 100);
        const baseCentAmount = Math.round(product.price * 100);
        const variantData = getVariantData(action.productId, variantId);

        const lineItem: MockLineItem = {
          id: `li-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          productId: product.id,
          name: { "en-US": product.name },
          price: { value: createPrice(baseCentAmount) },
          quantity: action.quantity || 1,
          variant: {
            id: variantId,
            key: variantData.key,
            images: variantData.images,
          },
        };

        if (product.priceDiscounted > 0) {
          lineItem.discountedPricePerQuantity = [
            { discountedPrice: { value: createPrice(centAmount) } },
          ];
        }

        nextCart.lineItems.push(lineItem);
      }

      if (action.action === "removeLineItem" && action.lineItemId) {
        nextCart.lineItems = nextCart.lineItems.filter((li) => li.id !== action.lineItemId);
      }

      if (action.action === "changeLineItemQuantity" && action.lineItemId) {
        nextCart.lineItems = nextCart.lineItems
          .map((li) =>
            li.id === action.lineItemId
              ? { ...li, quantity: Math.max(1, action.quantity || 1) }
              : li,
          )
          .filter((li) => li.quantity > 0);
      }

      if (action.action === "addDiscountCode" && action.code?.toUpperCase() === PROMO_CODE) {
        const exists = nextCart.discountCodes.some((d) => d.discountCode.id === PROMO_ID);
        if (!exists) {
          nextCart.discountCodes.push({
            discountCode: {
              id: PROMO_ID,
              typeId: "discount-code",
            },
          });
        }
      }

      if (action.action === "removeDiscountCode") {
        const discountCodeId = action.discountCode?.id;
        nextCart.discountCodes = nextCart.discountCodes.filter(
          (d) => d.discountCode.id !== discountCodeId,
        );
      }
    }

    this.writeCart(nextCart);
    return toCart(this.recalculateTotals(nextCart));
  }

  async changeLineItemQuantity(
    cartId: string,
    version: number,
    lineItemId: string,
    quantity: number,
  ): Promise<Cart> {
    return this.updateCart(cartId, {
      version,
      actions: [
        {
          action: "changeLineItemQuantity",
          lineItemId,
          quantity,
        },
      ],
    });
  }

  async addDiscountCode(cartId: string, version: number, code: string): Promise<Cart> {
    if (code.toUpperCase() !== PROMO_CODE) {
      throw new Error("Invalid promo code");
    }

    return this.updateCart(cartId, {
      version,
      actions: [
        {
          action: "addDiscountCode",
          code,
        },
      ],
    });
  }

  async removeDiscountCode(
    cartId: string,
    version: number,
    discountCodeId: string,
  ): Promise<Cart> {
    return this.updateCart(cartId, {
      version,
      actions: [
        {
          action: "removeDiscountCode",
          discountCode: {
            typeId: "discount-code",
            id: discountCodeId,
          },
        },
      ],
    });
  }
}
