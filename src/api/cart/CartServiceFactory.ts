import { apiClient } from "@/api/ApiClient";
import { ICartService } from "@/@types/interfaces";
import { CustomerCartService } from "./CustomerCartService";
import { AnonymousCartService } from "./AnonimousCartService";
import { FakeCartService } from "./FakeCartService";

export class CartServiceFactory {
  static create(): ICartService {
    if (apiClient.isMockMode()) {
      return new FakeCartService();
    }

    const apiRoot = apiClient.publicApiRoot;
    const projectKey = apiClient.publicProjectKey;

    const token = localStorage.getItem("accessToken");

    if (token) {
      try {
        const parsed = JSON.parse(token);
        const now = Date.now();

        if (parsed.expirationTime && parsed.expirationTime > now) {
          return new CustomerCartService(apiRoot, projectKey);
        }
      } catch {
        // fallback
      }
    }

    return new AnonymousCartService(apiRoot, projectKey);
  }
}
