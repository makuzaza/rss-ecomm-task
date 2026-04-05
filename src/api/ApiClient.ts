import CreateApiClient from "./CreateApiClient";
import {
  productProjectionNormalization,
  productDataNormalization,
  productSearchNormalization,
} from "@/utils/dataNormalization";
import {
  getMockCategories,
  getMockProductByKey,
  getMockProducts,
  searchMockProductsByCategory,
  searchMockProductsByName,
} from "@/api/mock/mockData";

// types
import {
  type CategoryPagedQueryResponse,
  type CustomerSignInResult,
  type MyCustomerDraft,
  type MyCustomerUpdate,
  type Customer,
  Cart,
  ProductProjectionPagedQueryResponse,
  MyCartUpdateAction,
  MyCartUpdate,
} from "@commercetools/platform-sdk";
import {
  SearchTypes,
  type CommerceToolsError,
  type MyProductsData,
  TokenStore as AppTokenStore,
} from "../@types/interfaces";
import {
  AuthMiddlewareOptions,
  ClientBuilder,
  ClientResponse,
  TokenStore,
} from "@commercetools/ts-client";

interface AnonymousAuthOptions extends AuthMiddlewareOptions {
  anonymousId: string;
  fetch: typeof fetch;
}

type TokenStoreLike = TokenStore | AppTokenStore;

type MockCustomerRecord = {
  id: string;
  version: number;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  addresses?: Array<{
    id?: string;
    streetName?: string;
    postalCode?: string;
    city?: string;
    state?: string;
    country?: string;
  }>;
  defaultShippingAddressId?: string;
  defaultBillingAddressId?: string;
  password: string;
};

const HAS_CTP_CONFIG = Boolean(
  process.env.REACT_APP_BASE_URL
    && process.env.REACT_APP_OAUTH_URL
    && process.env.REACT_APP_PROJECT_KEY
    && process.env.REACT_APP_ADMIN_CLIENT_ID
    && process.env.REACT_APP_ADMIN_CLIENT_SECRET
    && process.env.REACT_APP_SPA_CLIENT_ID
    && process.env.REACT_APP_SPA_CLIENT_SECRET,
);

const MOCK_MODE = process.env.REACT_APP_USE_MOCK_DATA === "true" || !HAS_CTP_CONFIG;
const USE_MOCK_AUTH_DB = process.env.REACT_APP_USE_MOCK_AUTH_DB !== "false";
const MOCK_AUTH_API_URL = process.env.REACT_APP_MOCK_AUTH_API_URL || "";
const MOCK_USERS_STORAGE_KEY = "mockUsers";
const MOCK_CURRENT_CUSTOMER_KEY = "mockCurrentCustomer";

export class ApiClient extends CreateApiClient {
  constructor() {
    super();
    if (!MOCK_MODE) {
      this.getAllCarts();
    }
  }

  public isMockMode(): boolean {
    return MOCK_MODE;
  }

  private isMockDbAuthEnabled(): boolean {
    return MOCK_MODE && USE_MOCK_AUTH_DB && Boolean(MOCK_AUTH_API_URL);
  }

  private async requestMockAuth<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(`${MOCK_AUTH_API_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Mock auth request failed");
    }

    return data as T;
  }

  private saveMockSessionFromToken(token: string, expirationTime: number): void {
    const cache: AppTokenStore = { token, expirationTime };
    localStorage.setItem("accessToken", JSON.stringify(cache));
  }

  private async saveCartToDb(): Promise<void> {
    if (!this.isMockDbAuthEnabled()) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.error("[saveCartToDb] No token found");
        return;
      }

      const tokenData = JSON.parse(token) as AppTokenStore;
      if (!tokenData.token) {
        console.error("[saveCartToDb] No token in parsed data");
        return;
      }

      const cartData = localStorage.getItem("mockCart");
      if (!cartData) {
        console.error("[saveCartToDb] No cart data in localStorage");
        return;
      }

      const cart = JSON.parse(cartData);

      const response = await this.requestMockAuth<{ message: string }>(
        "/auth/save-cart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenData.token}`,
          },
          body: JSON.stringify({ cart }),
        },
      );
    } catch (error) {
      console.error("[saveCartToDb] Failed to save cart to database:", error);
    }
  }

  private async loadCartFromDb(): Promise<void> {
    if (!this.isMockDbAuthEnabled()) {
      console.error("[loadCartFromDb] Mock DB auth not enabled");
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.error("[loadCartFromDb] No token found");
        return;
      }

      const tokenData = JSON.parse(token) as AppTokenStore;
      if (!tokenData.token) {
        console.error("[loadCartFromDb] No token in parsed data");
        return;
      }

      const result = await this.requestMockAuth<{ cart: unknown }>(
        "/auth/get-cart",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${tokenData.token}`,
          },
        },
      );

      if (result.cart) {
        localStorage.setItem("mockCart", JSON.stringify(result.cart));
      } else {
        console.error("[loadCartFromDb] No cart in response");
      }
    } catch (error) {
      console.error("[loadCartFromDb] Failed to load cart from database:", error);
    }
  }

  private readMockUsers(): MockCustomerRecord[] {
    const raw = localStorage.getItem(MOCK_USERS_STORAGE_KEY);
    if (!raw) {
      const seededUsers: MockCustomerRecord[] = [
        {
          id: "mock-customer-demo",
          version: 1,
          email: "demo@shop.local",
          firstName: "Demo",
          lastName: "User",
          dateOfBirth: "1995-01-01",
          addresses: [
            {
              id: "addr-demo-1",
              streetName: "Mock Street 1",
              postalCode: "00100",
              city: "Helsinki",
              country: "FI",
            },
          ],
          defaultShippingAddressId: "addr-demo-1",
          defaultBillingAddressId: "addr-demo-1",
          password: "Demo123!",
        },
      ];

      this.writeMockUsers(seededUsers);
      return seededUsers;
    }

    try {
      const parsed = JSON.parse(raw) as MockCustomerRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeMockUsers(users: MockCustomerRecord[]): void {
    localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private toCustomer(record: MockCustomerRecord): Customer {
    return {
      id: record.id,
      version: record.version,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      dateOfBirth: record.dateOfBirth,
      addresses: record.addresses || [],
      defaultShippingAddressId: record.defaultShippingAddressId,
      defaultBillingAddressId: record.defaultBillingAddressId,
    } as Customer;
  }

  private saveMockSession(email: string): void {
    const token: AppTokenStore = {
      token: `mock-token-${email}`,
      expirationTime: Date.now() + 24 * 60 * 60 * 1000,
    };

    localStorage.setItem("accessToken", JSON.stringify(token));
    localStorage.setItem(MOCK_CURRENT_CUSTOMER_KEY, email);
  }

  private getMockCurrentCustomerRecord(): MockCustomerRecord | null {
    const currentEmail = localStorage.getItem(MOCK_CURRENT_CUSTOMER_KEY);
    if (!currentEmail) return null;

    const users = this.readMockUsers();
    return users.find((user) => user.email === currentEmail) || null;
  }

  private updateMockCustomerRecord(updated: MockCustomerRecord): void {
    const users = this.readMockUsers();
    const nextUsers = users.map((user) =>
      user.email === updated.email || user.id === updated.id ? updated : user,
    );
    this.writeMockUsers(nextUsers);
    localStorage.setItem(MOCK_CURRENT_CUSTOMER_KEY, updated.email);
  }
  /**
   * BUILD CUSTOMER WITH PASSWORD
   */
  public async getCustomerWithPassword(
    email: string,
    password: string,
  ): Promise<Customer> {
    if (MOCK_MODE) {
      if (this.isMockDbAuthEnabled()) {
        const result = await this.requestMockAuth<{
          token: string;
          expirationTime: number;
          customer: Customer;
        }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        this.saveMockSessionFromToken(result.token, result.expirationTime);
        localStorage.setItem(MOCK_CURRENT_CUSTOMER_KEY, result.customer.email);
        
        // Load cart from database after successful login
        await this.loadCartFromDb();
        
        return result.customer;
      }

      const users = this.readMockUsers();
      const matched = users.find(
        (user) => user.email === email && user.password === password,
      );

      if (!matched) {
        throw new Error("Invalid email or password");
      }

      this.saveMockSession(matched.email);
      return this.toCustomer(matched);
    }

    try {
      this.client = this.buildClientWithPassword(email, password);
      const apiRoot = this.getApiRootSafe();

      const response: ClientResponse<Customer> = await apiRoot
        .withProjectKey({ projectKey: this.PROJECT_KEY })
        .me()
        .get()
        .execute();

      return response.body as Customer;
    } catch (error: unknown) {
      console.error("Failed to get customer with password:", error);

      // Проверка: это стандартная ошибка с текстом
      if (
        error instanceof Error &&
        error.message.includes(
          "Customer account with the given credentials not found",
        )
      ) {
        throw new Error("Invalid email or password");
      }

      // Проверка: это объект с полем 'body.message'
      if (
        typeof error === "object" &&
        error !== null &&
        "body" in error &&
        typeof (error as { body: unknown }).body === "object" &&
        (error as { body: { message?: unknown } }).body?.message &&
        typeof (error as { body: { message: unknown } }).body.message ===
          "string"
      ) {
        throw new Error((error as { body: { message: string } }).body.message);
      }

      throw new Error("Authentication failed");
    }
  }
  /**
   * BUILD CUSTOMER WITH TOKEN
   */
  public async getCustomerWithToken(token: string) {
    if (MOCK_MODE) {
      if (this.isMockDbAuthEnabled()) {
        const result = await this.requestMockAuth<{ customer: Customer }>(
          "/auth/me",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        localStorage.setItem(MOCK_CURRENT_CUSTOMER_KEY, result.customer.email);
        return result.customer;
      }

      if (!token?.startsWith("mock-token-")) {
        throw new Error("Failed to fetch customer by token");
      }

      const email = token.replace("mock-token-", "");
      const users = this.readMockUsers();
      const matched = users.find((user) => user.email === email);

      if (!matched) {
        throw new Error("Failed to fetch customer by token");
      }

      this.saveMockSession(matched.email);
      return this.toCustomer(matched);
    }

    this.client = this.buildClientWithToken(token);
    const apiRoot = this.getApiRootSafe();

    try {
      const { body: customer } = await apiRoot
        .withProjectKey({ projectKey: this.PROJECT_KEY })
        .me()
        .get()
        .execute();
      return customer;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch customer by token");
    }
  }

  /**
   * SIGN IN CUSTOMER
   */
  public async loginCustomer(customerData: MyCustomerDraft) {
    if (MOCK_MODE) {
      const email = customerData.email;
      const password = customerData.password || "mock-password";
      return this.getCustomerWithPassword(email, password);
    }

    const apiRoot = this.getApiRoot(this.defaultClient);

    try {
      const { body: customer } = await apiRoot
        .withProjectKey({
          projectKey: this.PROJECT_KEY,
        })
        .me()
        .login()
        .post({ body: customerData })
        .execute();

      return customer;
    } catch (error) {
      console.error("Update failed", error);
      throw new Error("Failed to update customer");
    }
  }

  /**
   * REGISTER CUSTOMER
   */
  public async registerCustomer(
    customerData: MyCustomerDraft,
  ): Promise<CustomerSignInResult> {
    if (MOCK_MODE) {
      if (this.isMockDbAuthEnabled()) {
        const result = await this.requestMockAuth<{
          token: string;
          expirationTime: number;
          customer: Customer;
        }>("/auth/register", {
          method: "POST",
          body: JSON.stringify(customerData),
        });

        this.saveMockSessionFromToken(result.token, result.expirationTime);
        localStorage.setItem(MOCK_CURRENT_CUSTOMER_KEY, result.customer.email);
        
        // Load cart from database after successful registration
        await this.loadCartFromDb();

        return {
          customer: result.customer,
        } as CustomerSignInResult;
      }

      const users = this.readMockUsers();
      const exists = users.some((user) => user.email === customerData.email);

      if (exists) {
        throw new Error("A customer with this email already exists.");
      }

      const addresses = (customerData.addresses || []).map((address, index) => ({
        id: address.id || `addr-${Date.now()}-${index}`,
        streetName: address.streetName,
        postalCode: address.postalCode,
        city: address.city,
        state: address.state,
        country: address.country,
      }));

      const newUser: MockCustomerRecord = {
        id: `mock-customer-${Date.now()}`,
        version: 1,
        email: customerData.email,
        firstName: customerData.firstName || "Demo",
        lastName: customerData.lastName || "User",
        dateOfBirth: customerData.dateOfBirth,
        addresses,
        defaultShippingAddressId: addresses[customerData.defaultShippingAddress || 0]?.id,
        defaultBillingAddressId: addresses[customerData.defaultBillingAddress || 0]?.id,
        password: customerData.password || "mock-password",
      };

      this.writeMockUsers([...users, newUser]);
      this.saveMockSession(newUser.email);

      return {
        customer: this.toCustomer(newUser),
      } as CustomerSignInResult;
    }

    const client = this.buildDefaultClient(false);
    this.apiRoot = this.getApiRoot(client);

    try {
      const { body: customer } = await this.apiRoot
        .withProjectKey({
          projectKey: this.PROJECT_KEY,
        })
        .me()
        .signup()
        .post({ body: customerData })
        .execute();

      return customer;
    } catch (error) {
      const err = error as CommerceToolsError;

      const duplicateEmail = err.body.errors?.find(
        (e) => e.code === "DuplicateField" && e.field === "email",
      );

      if (duplicateEmail) {
        throw new Error("A customer with this email already exists.");
      }

      throw new Error(err.body.message || "Registration failed. Try again.");
    }
  }

  /**
   * GET CUSTOMER PROFILE
   */
  public async getCustomerProfile(): Promise<Customer> {
    if (MOCK_MODE) {
      if (this.isMockDbAuthEnabled()) {
        const raw = localStorage.getItem("accessToken");
        const stored = raw ? (JSON.parse(raw) as AppTokenStore) : null;
        const token = stored?.token;

        if (!token) {
          throw new Error("Unauthorized action");
        }

        const result = await this.requestMockAuth<{ customer: Customer }>(
          "/auth/me",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        localStorage.setItem(MOCK_CURRENT_CUSTOMER_KEY, result.customer.email);
        return result.customer;
      }

      const customer = this.getMockCurrentCustomerRecord();
      if (!customer) {
        throw new Error("Unauthorized action");
      }

      return this.toCustomer(customer);
    }

    const apiRoot = this.getApiRoot(this.client);
    if (!apiRoot) throw new Error("Unauthorized action");

    try {
      const { body: customer } = await apiRoot
        .withProjectKey({
          projectKey: this.PROJECT_KEY,
        })
        .me()
        .get()
        .execute();
      return customer;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch customer profile");
    }
  }

  /**
   * GET CATEGORIES
   */
  public async getAllCategories(args: {
    limit?: number;
    sort?: string;
    where?: string;
  }): Promise<CategoryPagedQueryResponse> {
    if (MOCK_MODE) {
      return getMockCategories(args);
    }

    const apiRoot = this.getApiRoot(this.defaultClient);
    try {
      const { body: data } = await apiRoot
        .withProjectKey({
          projectKey: this.PROJECT_KEY,
        })
        .categories()
        .get({ queryArgs: args })
        .execute();
      return data;
    } catch (error) {
      console.error(error);
      return {
        limit: args?.limit ?? 0,
        offset: 0,
        count: 0,
        total: 0,
        results: [],
      } as CategoryPagedQueryResponse;
    }
  }
  /**
   * GET ALL PRODUCTS
   */

  public async getAllProducts(args?: {
    limit?: number;
    sort?: string | string[];
    offset?: number;
  }): Promise<{ products: MyProductsData[]; total: number }> {
    if (MOCK_MODE) {
      return getMockProducts(args);
    }

    const apiRoot = this.getApiRoot(this.defaultClient);
    try {
      const { body: data }: { body: ProductProjectionPagedQueryResponse } =
        await apiRoot
          .withProjectKey({ projectKey: this.PROJECT_KEY })
          .productProjections()
          .get({ queryArgs: args })
          .execute();

      const normalized = productProjectionNormalization(data);
      return { products: normalized, total: data.total ?? normalized.length };
    } catch (error) {
        console.error(error);
      return { products: [], total: 0 };
    }
  }
  /**
   * GET PRODUCT WITH KEY
   */
  public async getProduct(key: string): Promise<MyProductsData> {
    if (MOCK_MODE) {
      const product = getMockProductByKey(key);
      if (!product) {
        throw new Error("Product not found");
      }
      return product;
    }

    const apiRoot = this.getApiRoot(this.defaultClient);
    try {
      const { body: data } = await apiRoot
        .withProjectKey({
          projectKey: this.PROJECT_KEY,
        })
        .products()
        .withKey({ key: key })
        .get()
        .execute();

      return productDataNormalization(data);
    } catch (error) {
        console.error(error);
      throw new Error("Product not found");
    }
  }
  /**
   * SEARCH DATA
   */

  // public async searchData(
  //   searchType: SearchTypes,
  //   searchValue: string,
  //   options: {
  //     limit?: number;
  //     offset?: number;
  //     sort?: string | string[];
  //     minPrice?: number;
  //     maxPrice?: number;
  //     discountOnly?: boolean;
  //   } = {}
  // ): Promise<{ products: MyProductsData[]; total: number }> {
  //   const apiRoot = this.getApiRoot(this.defaultClient);

  //   const filterArgs: string[] = [];

  //   if (typeof options.minPrice === "number") {
  //     filterArgs.push(
  //       `variants.price.centAmount:range(${options.minPrice * 100} to *)`
  //     );
  //   }

  //   if (typeof options.maxPrice === "number") {
  //     filterArgs.push(
  //       `variants.price.centAmount:range(* to ${options.maxPrice * 100})`
  //     );
  //   }

  //   if (options.discountOnly) {
  //     filterArgs.push("variants.prices.discounted.exists:true");
  //   }

  //   const queryArgs: {
  //     [key: string]: string | string[] | number | boolean | undefined;
  //   } = {
  //     limit: options.limit,
  //     offset: options.offset,
  //     sort: options.sort,
  //   };

  //   if (searchType === "name") {
  //     queryArgs["text.en-US"] = searchValue;
  //   } else if (searchType === "category") {
  //     filterArgs.push(`categories.id:"${searchValue}"`);
  //   }

  //   if (filterArgs.length > 0) {
  //     queryArgs["filter.query"] = filterArgs;
  //   }

  //   try {
  //     const { body } = await apiRoot
  //       .withProjectKey({ projectKey: this.PROJECT_KEY })
  //       .productProjections()
  //       .search()
  //       .get({ queryArgs })
  //       .execute();

  //     const products = productProjectionNormalization({ results: body.results });
  //     const total = body.total ?? products.length;

  //     return { products, total };
  //   } catch (error) {
  //     console.error("Failed to search products:", error);
  //     throw new Error("Failed to fetch filtered products");
  //   }
  // }

  // ***** SEARCH DATA *****
  public async searchData(
    searchType: SearchTypes,
    searchValue: string,
  ): Promise<MyProductsData[]> {
    if (MOCK_MODE) {
      if (searchType === "name") {
        return searchMockProductsByName(searchValue);
      }

      return searchMockProductsByCategory(searchValue);
    }

    const apiRoot = this.getApiRoot(this.defaultClient);

    let searchArgs = {};
    switch (searchType) {
      case "name":
        searchArgs = { "text.en-US": searchValue, limit: 10 };
        break;
      case "category":
        searchArgs = { "filter.query": `categories.id:"${searchValue}"` };
        break;
    }

    try {
      const { body: data } = await apiRoot
        .withProjectKey({
          projectKey: this.PROJECT_KEY,
        })
        .productProjections()
        .search()
        .get({
          queryArgs: searchArgs,
        })
        .execute();
      return productSearchNormalization(data) as MyProductsData[];
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  /**
   * UPDATE CUSTOMER
   */
  public async updateCustomer(
    updatePayload: MyCustomerUpdate,
  ): Promise<Customer> {
    if (MOCK_MODE) {
      if (this.isMockDbAuthEnabled()) {
        const raw = localStorage.getItem("accessToken");
        const stored = raw ? (JSON.parse(raw) as AppTokenStore) : null;
        const token = stored?.token;

        if (!token) {
          throw new Error("Unauthorized action");
        }

        const result = await this.requestMockAuth<{ customer: Customer }>(
          "/auth/update",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updatePayload),
          },
        );

        localStorage.setItem(MOCK_CURRENT_CUSTOMER_KEY, result.customer.email);
        return result.customer;
      }

      const current = this.getMockCurrentCustomerRecord();
      if (!current) throw new Error("Unauthorized action");

      const actions = (updatePayload.actions || []) as Array<{
        action: string;
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
        email?: string;
        addressId?: string;
        address?: {
          id?: string;
          streetName?: string;
          postalCode?: string;
          city?: string;
          state?: string;
          country?: string;
        };
      }>;

      const next = {
        ...current,
        version: current.version + 1,
        addresses: [...(current.addresses || [])],
      };

      for (const action of actions) {
        if (action.action === "setFirstName" && action.firstName) {
          next.firstName = action.firstName;
        }
        if (action.action === "setLastName" && action.lastName) {
          next.lastName = action.lastName;
        }
        if (action.action === "setDateOfBirth" && action.dateOfBirth) {
          next.dateOfBirth = action.dateOfBirth;
        }
        if (action.action === "changeEmail" && action.email) {
          next.email = action.email;
        }
        if (action.action === "changeAddress" && action.addressId && action.address) {
          next.addresses = (next.addresses || []).map((address) =>
            address.id === action.addressId ? { ...address, ...action.address } : address,
          );
        }
        if (action.action === "addAddress" && action.address) {
          next.addresses = [
            ...(next.addresses || []),
            {
              ...action.address,
              id: action.address.id || `addr-${Date.now()}`,
            },
          ];
        }
        if (action.action === "setDefaultShippingAddress") {
          next.defaultShippingAddressId = action.addressId;
        }
        if (action.action === "setDefaultBillingAddress") {
          next.defaultBillingAddressId = action.addressId;
        }
      }

      this.updateMockCustomerRecord(next);
      return this.toCustomer(next);
    }

    const apiRoot = this.getApiRoot(this.client);
    if (!apiRoot) throw new Error("Unauthorized action");

    try {
      const { body: data } = await apiRoot
        .withProjectKey({ projectKey: this.PROJECT_KEY })
        .me()
        .post({ body: updatePayload })
        .execute();

      return data;
    } catch (error) {
        console.error(error);
      throw new Error("Failed to update customer");
    }
  }

  public async changePassword(
    currentPassword: string,
    newPassword: string,
    version: number,
  ) {
    if (MOCK_MODE) {
      if (this.isMockDbAuthEnabled()) {
        const raw = localStorage.getItem("accessToken");
        const stored = raw ? (JSON.parse(raw) as AppTokenStore) : null;
        const token = stored?.token;

        if (!token) {
          throw new Error("Unauthorized action");
        }

        await this.requestMockAuth<{ customer: Customer }>("/auth/change-password", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ currentPassword, newPassword, version }),
        });

        return;
      }

      const current = this.getMockCurrentCustomerRecord();
      if (!current) throw new Error("Unauthorized action");

      if (current.password !== currentPassword) {
        throw new Error("InvalidCurrentPassword");
      }

      const updated: MockCustomerRecord = {
        ...current,
        version: Math.max(version + 1, current.version + 1),
        password: newPassword,
      };

      this.updateMockCustomerRecord(updated);
      return;
    }

    const apiRoot = this.getApiRoot(this.client);

    await apiRoot
      .withProjectKey({ projectKey: this.PROJECT_KEY })
      .me()
      .password()
      .post({
        body: {
          version,
          currentPassword,
          newPassword,
        },
      })
      .execute();
  }

  public async getMyActiveCart() {
    const apiRoot = this.getApiRoot(this.client);
    if (!apiRoot) throw new Error("Unauthorized action");
    try {
      const { body: cart } = await apiRoot
        .withProjectKey({ projectKey: this.PROJECT_KEY })
        .me()
        .activeCart()
        .get()
        .execute();
      return cart;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch active cart");
    }
  }

  public async getAllCarts() {
    const apiRoot = this.getApiRoot(this.defaultClient);
    if (!apiRoot) throw new Error("Unauthorized action");
    try {
      const { body: cart } = await apiRoot
        .withProjectKey({ projectKey: this.PROJECT_KEY })
        .carts()
        .get()
        .execute();
      return cart;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch active cart");
    }
  }

  public async createMyCart(customer?: Customer): Promise<Cart> {
    const apiRoot = this.getApiRoot(this.client);
    if (!apiRoot) throw new Error("Unauthorized action");

    const shippingAddress = customer?.addresses?.find(
      (addr) => addr.id === customer.defaultShippingAddressId,
    );

    const countryFromCustomer = shippingAddress?.country;

    const body: {
      currency: string;
      country?: string;
      anonymousId?: string;
    } = {
      currency: "EUR",
    };

    if (!customer?.id) {
      body.anonymousId = this.getOrCreateAnonymousId();
    }

    if (countryFromCustomer) {
      body.country = countryFromCustomer;
    }

    const { body: cart } = await apiRoot
      .withProjectKey({ projectKey: this.PROJECT_KEY })
      .me()
      .carts()
      .post({ body })
      .execute();

    return cart;
  }

  public async addProductToCart(
    productId: string,
    variantId: number = 1,
    customer?: Customer,
  ): Promise<Cart> {
    const apiRoot = this.getApiRoot(this.client);
    if (!apiRoot) throw new Error("Unauthorized action");

    try {
      let cart;
      try {
        cart = await this.getMyActiveCart();
      } catch {
        cart = await this.createMyCart(customer);
      }

      const payload: MyCartUpdate = {
        version: cart.version,
        actions: [
          {
            action: "addLineItem",
            productId,
            variantId,
            quantity: 1,
          },
        ],
      };

      const updatedCart = await apiRoot
        .withProjectKey({ projectKey: this.PROJECT_KEY })
        .me()
        .carts()
        .withId({ ID: cart.id })
        .post({ body: payload })
        .execute();

      return updatedCart.body;
    } catch (error) {
      console.error("Failed to add product to cart:", error);
      throw new Error("Add to cart failed");
    }
  }

  public async getCartById(cartId: string) {
    const apiRoot = this.getApiRoot(this.client);
    const { body: cart } = await apiRoot
      .withProjectKey({ projectKey: this.PROJECT_KEY })
      .me()
      .carts()
      .withId({ ID: cartId })
      .get()
      .execute();

    return cart;
  }

  public initAnonymousClient() {
    if (MOCK_MODE) {
      return;
    }

    const anonymousId = this.getOrCreateAnonymousId();

    const options: AnonymousAuthOptions = {
      host: this.OAUTH_URI,
      projectKey: this.PROJECT_KEY,
      credentials: this.SPA_CREDENTIALS,
      scopes: [
        `manage_my_profile:${this.PROJECT_KEY}`,
        `manage_my_orders:${this.PROJECT_KEY}`,
        `view_published_products:${this.PROJECT_KEY}`,
      ],
      anonymousId,
      tokenCache: {
        get: (): TokenStoreLike => {
          const cached = localStorage.getItem("accessToken");
          return cached
            ? (JSON.parse(cached) as TokenStoreLike)
            : ({ token: "", expirationTime: 0 } as TokenStoreLike);
        },
        set: (cache: TokenStore): void => {
          localStorage.setItem("accessToken", JSON.stringify(cache));
        },
      },
      fetch,
    };

    this.client = new ClientBuilder()
      .withAnonymousSessionFlow(options)
      .withHttpMiddleware({ host: this.BASE_URI })
      .build();
  }

  /**
   * Initialize the client from localStorage
   * If no valid token is found, fallback to anonymous client
   */

  public initClientFromStorage() {
    if (MOCK_MODE) {
      return;
    }

    const raw = localStorage.getItem("accessToken");

    if (raw) {
      try {
        const token = JSON.parse(raw) as TokenStore;
        const now = Date.now();

        // const hasManageOrders = token.token?.includes("manage_orders");

        if (token.expirationTime && token.expirationTime > now) {
          this.client = this.buildClientWithToken(token.token);
          return;
        }

        console.warn("Token invalid or insufficient scope — removing.");
        localStorage.removeItem("accessToken");
      } catch (e) {
        console.error("Failed to parse accessToken", e);
        localStorage.removeItem("accessToken");
      }
    }

    // Fallback to anonymous
    this.initAnonymousClient();
  }

  /**
   * Remove a line item from the cart
   */
  async removeLineItemFromCart(
    cartId: string,
    version: number,
    lineItemId: string,
  ) {
    const apiRoot = this.getApiRoot(this.client);
    if (!apiRoot) throw new Error("Unauthorized action");

    const body: MyCartUpdate = {
      version,
      actions: [
        {
          action: "removeLineItem",
          lineItemId,
        } as MyCartUpdateAction,
      ],
    };

    const res = await apiRoot
      .withProjectKey({ projectKey: this.PROJECT_KEY })
      .me()
      .carts()
      .withId({ ID: cartId })
      .post({ body })
      .execute();

    return res.body;
  }

  public async clearMyCart(
    cartId: string,
    version: number,
    lineItemIds: string[],
  ): Promise<Cart> {
    const apiRoot = this.getApiRoot(this.client);
    const body: MyCartUpdate = {
      version,
      actions: lineItemIds.map((lineItemId) => ({
        action: "removeLineItem",
        lineItemId,
      })),
    };

    const res = await apiRoot
      .withProjectKey({ projectKey: this.PROJECT_KEY })
      .me()
      .carts()
      .withId({ ID: cartId })
      .post({ body })
      .execute();

    return res.body;
  }

  public async deleteCart(cartId: string, version: number): Promise<void> {
    const apiRoot = this.getApiRoot(this.client);
    if (!apiRoot) throw new Error("Unauthorized action");

    await apiRoot
      .withProjectKey({ projectKey: this.PROJECT_KEY })
      .me()
      .carts()
      .withId({ ID: cartId })
      .delete({ queryArgs: { version } })
      .execute();
  }

  public get publicApiRoot() {
    return this.getApiRootSafe();
  }

  public get publicProjectKey() {
    return this.PROJECT_KEY;
  }

  private getApiRootSafe(client = this.client) {
    if (!client) throw new Error("API client is not initialized");
    return this.getApiRoot(client);
  }

  public isAuthorized(): boolean {
    const raw = localStorage.getItem("accessToken");
    if (!raw) return false;
    try {
      const token = JSON.parse(raw) as TokenStore;
      return token.expirationTime > Date.now();
    } catch {
      return false;
    }
  }

  public async logout() {
    // Save cart to database before logging out
    if (MOCK_MODE && this.isMockDbAuthEnabled()) {
      await this.saveCartToDb();
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem(MOCK_CURRENT_CUSTOMER_KEY);

    if (MOCK_MODE) {
      return;
    }

    this.initAnonymousClient();
  }

  // end
}

// Singleton instance
export const apiClient = new ApiClient();
