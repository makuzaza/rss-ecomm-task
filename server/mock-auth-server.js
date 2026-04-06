const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

const app = express();
const port = Number(process.env.PORT || process.env.MOCK_AUTH_PORT || 4000);
const frontendBuildPath = path.resolve(__dirname, "..", "build");
const indexHtmlPath = path.join(frontendBuildPath, "index.html");

const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.MOCK_AUTH_JWT_SECRET || "mock-auth-dev-secret";
const tokenExpirySeconds = 60 * 60 * 24;

if (!mongoUri) {
  console.error("MONGODB_URI is not set.");
  console.error("Set MONGODB_URI in your Render service Environment variables.");
  process.exit(1);
}

console.error("Startup config:", {
  hasMongoUri: Boolean(mongoUri),
  hasJwtSecret: Boolean(jwtSecret),
  port,
  nodeEnv: process.env.NODE_ENV || "not-set",
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "mock-auth-server" });
});

const addressSchema = new mongoose.Schema(
  {
    id: { type: String, default: undefined },
    streetName: String,
    postalCode: String,
    city: String,
    state: String,
    country: String,
  },
  { _id: false },
);

const lineItemSchema = new mongoose.Schema(
  {
    id: String,
    productId: String,
    name: { "en-US": String },
    price: {
      value: {
        type: String,
        currencyCode: String,
        centAmount: Number,
        fractionDigits: Number,
      },
    },
    discountedPricePerQuantity: [
      {
        discountedPrice: {
          value: {
            currencyCode: String,
            centAmount: Number,
            fractionDigits: Number,
          },
        },
      },
    ],
    quantity: Number,
    variant: {
      id: Number,
      key: String,
      images: [{ url: String }],
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, index: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: String,
    addresses: [addressSchema],
    defaultShippingAddressId: String,
    defaultBillingAddressId: String,
    cart: { type: mongoose.Schema.Types.Mixed, default: null },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

const User = mongoose.model("MockUser", userSchema);

function sanitizeUser(user) {
  return {
    id: String(user._id),
    version: user.version || 1,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: user.dateOfBirth,
    addresses: user.addresses || [],
    defaultShippingAddressId: user.defaultShippingAddressId,
    defaultBillingAddressId: user.defaultBillingAddressId,
  };
}

function issueToken(userId, email) {
  return jwt.sign({ sub: userId, email }, jwtSecret, {
    expiresIn: tokenExpirySeconds,
  });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const [prefix, token] = header.split(" ");

  if (prefix !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function normalizeAddresses(addresses) {
  return (addresses || []).map((addr, index) => ({
    id: addr.id || `addr-${Date.now()}-${index}`,
    streetName: addr.streetName,
    postalCode: addr.postalCode,
    city: addr.city,
    state: addr.state,
    country: addr.country,
  }));
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      addresses,
      defaultShippingAddress,
      defaultBillingAddress,
    } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "A customer with this email already exists." });
    }

    const normalizedAddresses = normalizeAddresses(addresses);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      passwordHash,
      firstName: firstName || "Demo",
      lastName: lastName || "User",
      dateOfBirth,
      addresses: normalizedAddresses,
      defaultShippingAddressId:
        normalizedAddresses[defaultShippingAddress || 0]?.id,
      defaultBillingAddressId:
        normalizedAddresses[defaultBillingAddress || 0]?.id,
      version: 1,
    });

    const token = issueToken(String(user._id), user.email);
    const expirationTime = Date.now() + tokenExpirySeconds * 1000;

    return res.json({
      token,
      expirationTime,
      customer: sanitizeUser(user),
    });
  } catch (err) {
    return res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = issueToken(String(user._id), user.email);
    const expirationTime = Date.now() + tokenExpirySeconds * 1000;

    return res.json({
      token,
      expirationTime,
      customer: sanitizeUser(user),
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed" });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ customer: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
});

app.post("/api/auth/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Passwords are required" });
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: "InvalidCurrentPassword" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.version += 1;
    await user.save();

    return res.json({ customer: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to change password" });
  }
});

app.post("/api/auth/update", auth, async (req, res) => {
  try {
    const { actions } = req.body || {};

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userActions = Array.isArray(actions) ? actions : [];

    userActions.forEach((action) => {
      if (action.action === "setFirstName" && action.firstName) {
        user.firstName = action.firstName;
      }
      if (action.action === "setLastName" && action.lastName) {
        user.lastName = action.lastName;
      }
      if (action.action === "setDateOfBirth" && action.dateOfBirth) {
        user.dateOfBirth = action.dateOfBirth;
      }
      if (action.action === "changeEmail" && action.email) {
        user.email = action.email;
      }
      if (action.action === "changeAddress" && action.addressId && action.address) {
        user.addresses = (user.addresses || []).map((addr) =>
          addr.id === action.addressId ? { ...addr.toObject(), ...action.address } : addr,
        );
      }
      if (action.action === "addAddress" && action.address) {
        const newAddress = {
          ...action.address,
          id: action.address.id || `addr-${Date.now()}`,
        };
        user.addresses = [...(user.addresses || []), newAddress];
      }
      if (action.action === "setDefaultShippingAddress") {
        user.defaultShippingAddressId = action.addressId || undefined;
      }
      if (action.action === "setDefaultBillingAddress") {
        user.defaultBillingAddressId = action.addressId || undefined;
      }
    });

    user.version += 1;
    await user.save();

    return res.json({ customer: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update profile" });
  }
});

app.post("/api/auth/save-cart", auth, async (req, res) => {
  try {
    const { cart } = req.body || {};

    if (!cart) {
      return res.status(400).json({ message: "Cart data is required" });
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.cart = cart;
    await user.save();

    return res.json({ message: "Cart saved successfully", cart: user.cart });
  } catch (err) {
    console.error("[save-cart] Error:", err);
    return res.status(500).json({ message: "Failed to save cart" });
  }
});

app.get("/api/auth/get-cart", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ cart: user.cart || null });
  } catch (err) {
    console.error("[get-cart] Error:", err);
    return res.status(500).json({ message: "Failed to retrieve cart" });
  }
});

app.use(express.static(frontendBuildPath));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  if (fs.existsSync(indexHtmlPath)) {
    return res.sendFile(indexHtmlPath);
  }

  return res.status(404).json({ message: "Frontend build not found" });
});

const RETRY_DELAY_MS = 10000;

const connectMongoWithRetry = async () => {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
    console.error("MongoDB connected successfully.");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error("MongoDB connection error details:", err);
    console.error(`Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000}s...`);
    setTimeout(connectMongoWithRetry, RETRY_DELAY_MS);
  }
};

const server = app.listen(port, "0.0.0.0", () => {
  console.error(`Mock auth server listening on port ${port}`);
});

server.on("error", (err) => {
  console.error("HTTP server failed to start:", err);
  process.exit(1);
});

connectMongoWithRetry();
