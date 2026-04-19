require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AdminJS = require("adminjs");
const AdminJSExpress = require("@adminjs/express");
const AdminJSSequelize = require("@adminjs/sequelize");

const sequelize = require("./config/db");

const UserFactory = require("./models/User");
const CategoryFactory = require("./models/Category");
const ProductFactory = require("./models/Product");
const OrderFactory = require("./models/Order");
const OrderItemFactory = require("./models/OrderItem");
const SettingFactory = require("./models/Setting");

AdminJS.registerAdapter({ Database: AdminJSSequelize.Database, Resource: AdminJSSequelize.Resource });

const User = UserFactory(sequelize);
const Category = CategoryFactory(sequelize);
const Product = ProductFactory(sequelize);
const Order = OrderFactory(sequelize);
const OrderItem = OrderItemFactory(sequelize);
const Setting = SettingFactory(sequelize);

User.hasMany(Order, { foreignKey: { name: "userId", allowNull: false }, as: "orders" });
Order.belongsTo(User, { foreignKey: { name: "userId", allowNull: false }, as: "user" });

Category.hasMany(Product, { foreignKey: { name: "categoryId", allowNull: false }, as: "products" });
Product.belongsTo(Category, { foreignKey: { name: "categoryId", allowNull: false }, as: "category" });

User.hasMany(Product, { foreignKey: { name: "createdById", allowNull: true }, as: "createdProducts" });
Product.belongsTo(User, { foreignKey: { name: "createdById", allowNull: true }, as: "createdBy" });

Order.hasMany(OrderItem, { foreignKey: { name: "orderId", allowNull: false }, as: "items" });
OrderItem.belongsTo(Order, { foreignKey: { name: "orderId", allowNull: false }, as: "order" });

Product.hasMany(OrderItem, { foreignKey: { name: "productId", allowNull: false }, as: "orderItems" });
OrderItem.belongsTo(Product, { foreignKey: { name: "productId", allowNull: false }, as: "product" });

const app = express();
app.use(express.json());

app.set("trust proxy", 1);

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const sessionSecret = requireEnv("SESSION_SECRET");
const jwtSecret = requireEnv("JWT_SECRET");
const adminCookieSecret = requireEnv("ADMIN_COOKIE_SECRET");
const dashboardPageComponent = path.join(__dirname, "admin", "dashboard-page.js");
const settingsPageComponent = path.join(__dirname, "admin", "settings-page.js");

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

const isValidSettingKey = (key) => /^[a-z][a-z0-9_\-\s]{1,63}$/i.test(key) && /[a-z]/i.test(key);

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((cookies, pair) => {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) {
      return cookies;
    }

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();

    if (key) {
      cookies[key] = decodeURIComponent(value);
    }

    return cookies;
  }, {});

const getRequestToken = (req) => {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookies = parseCookies(req.headers.cookie || "");
  return cookies.admin_token || null;
};

const getAuthenticatedUserFromRequest = async (req) => {
  const token = getRequestToken(req);

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findByPk(payload.id, {
      attributes: ["id", "name", "email", "role"],
    });

    if (!user) {
      return null;
    }

    return user;
  } catch (_error) {
    return null;
  }
};

const hydrateAdminSessionFromJwt = async (req, _res, next) => {
  if (!req.session?.currentAdmin) {
    const user = await getAuthenticatedUserFromRequest(req);

    if (user) {
      req.session.currentAdmin = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }
  }

  next();
};

const authenticateApiUser = async (email, password) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return null;
  }

  return user;
};

const buildAdminSummary = async () => {
  const [totalUsers, totalProducts, totalOrders, totalRevenue, pendingOrders] = await Promise.all([
    User.count(),
    Product.count(),
    Order.count(),
    Order.sum("totalAmount"),
    Order.count({ where: { status: "pending" } }),
  ]);

  return {
    totalUsers,
    totalProducts,
    totalOrders,
    totalRevenue: Number(totalRevenue || 0),
    pendingOrders,
  };
};

const seedInitialData = async () => {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const userEmail = process.env.SEED_USER_EMAIL || "user@example.com";
  const userPassword = process.env.SEED_USER_PASSWORD || "User@123";

  const [adminUser] = await User.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      name: "System Admin",
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      role: "admin",
    },
  });

  const [regularUser] = await User.findOrCreate({
    where: { email: userEmail },
    defaults: {
      name: "Regular User",
      email: userEmail,
      password: await bcrypt.hash(userPassword, 10),
      role: "user",
    },
  });

  const defaultCategories = ["Electronics", "Fashion", "Books"];
  for (const categoryName of defaultCategories) {
    await Category.findOrCreate({
      where: { name: categoryName },
      defaults: { name: categoryName },
    });
  }

  const defaultSettings = [
    { key: "store_name", value: "Demo eCommerce Store" },
    { key: "currency", value: "USD" },
    { key: "support_email", value: "support@example.com" },
  ];

  for (const setting of defaultSettings) {
    await Setting.findOrCreate({
      where: { key: setting.key },
      defaults: setting,
    });
  }

  const category = await Category.findOne({ order: [["id", "ASC"]] });
  if (category) {
    await Product.findOrCreate({
      where: { name: "Starter Product" },
      defaults: {
        name: "Starter Product",
        description: "Initial product created for relation selectors.",
        price: 99.99,
        stock: 25,
        categoryId: category.id,
        createdById: adminUser.id,
      },
    });
  }

  const product = await Product.findOne({ order: [["id", "ASC"]] });
  if (product) {
    const [order] = await Order.findOrCreate({
      where: { userId: regularUser.id, status: "pending" },
      defaults: {
        userId: regularUser.id,
        status: "pending",
        totalAmount: Number(product.price),
      },
    });

    const subTotal = Number(product.price);
    await OrderItem.findOrCreate({
      where: {
        orderId: order.id,
        productId: product.id,
      },
      defaults: {
        orderId: order.id,
        productId: product.id,
        quantity: 1,
        unitPrice: subTotal,
        subTotal,
      },
    });

    const orderItems = await OrderItem.findAll({ where: { orderId: order.id } });
    const totalAmount = orderItems.reduce((sum, item) => sum + Number(item.subTotal), 0);
    await order.update({ totalAmount });
  }
};

const ensureInitialized = (() => {
  let initPromise;

  return async () => {
    if (!initPromise) {
      initPromise = (async () => {
        await sequelize.authenticate();
        await sequelize.sync();
        await seedInitialData();
      })();
    }

    return initPromise;
  };
})();

const admin = new AdminJS({
  rootPath: "/admin",
  resources: [
    {
      resource: User,
      options: {
        titleProperty: "name",
        navigation: "Access",
        properties: {
          password: {
            isVisible: false,
          },
          newPassword: {
            type: "password",
            isVisible: { list: false, show: false, filter: false, edit: true },
          },
          role: {
            availableValues: [
              { value: "admin", label: "Admin" },
              { value: "user", label: "User" },
            ],
          },
        },
        listProperties: ["id", "name", "email", "role", "createdAt"],
        showProperties: ["id", "name", "email", "role", "createdAt", "updatedAt"],
        editProperties: ["name", "email", "role", "newPassword"],
        filterProperties: ["name", "email", "role", "createdAt"],
        actions: {
          new: {
            before: async (request) => {
              if (request.method !== "post") {
                return request;
              }

              const newPassword = request.payload?.newPassword;
              if (!newPassword) {
                throw new AdminJS.ValidationError({
                  newPassword: {
                    message: "Password is required",
                  },
                });
              }

              request.payload.password = await bcrypt.hash(String(newPassword), 10);
              delete request.payload.newPassword;

              return request;
            },
          },
          edit: {
            before: async (request) => {
              if (request.method !== "post") {
                return request;
              }

              const newPassword = request.payload?.newPassword;
              if (!newPassword) {
                delete request.payload.password;
                delete request.payload.newPassword;
                return request;
              }

              request.payload.password = await bcrypt.hash(String(newPassword), 10);
              delete request.payload.newPassword;
              return request;
            },
          },
        },
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === "admin",
        isVisible: ({ currentAdmin }) => currentAdmin?.role === "admin",
      },
    },
    {
      resource: Category,
      options: {
        titleProperty: "name",
        navigation: "Catalog",
        listProperties: ["id", "name", "createdAt", "updatedAt"],
        sort: {
          sortBy: "id",
          direction: "asc",
        },
      },
    },
    {
      resource: Product,
      options: {
        titleProperty: "name",
        navigation: "Catalog",
        properties: {
          categoryId: {
            reference: "Categories",
          },
        },
        listProperties: ["id", "name", "price", "stock", "categoryId", "createdAt"],
        showProperties: ["id", "name", "description", "price", "stock", "categoryId", "createdAt", "updatedAt"],
        editProperties: ["name", "description", "price", "stock", "categoryId"],
        filterProperties: ["id", "name", "categoryId", "createdAt"],
      },
    },
    {
      resource: Order,
      options: {
        titleProperty: "id",
        navigation: "Sales",
        properties: {
          userId: {
            reference: "Users",
          },
        },
        listProperties: ["id", "status", "totalAmount", "userId", "createdAt"],
        showProperties: ["id", "status", "totalAmount", "userId", "createdAt", "updatedAt"],
        editProperties: ["status", "totalAmount", "userId"],
      },
    },
    {
      resource: OrderItem,
      options: {
        titleProperty: "id",
        navigation: "Sales",
        properties: {
          orderId: { reference: "Orders" },
          productId: { reference: "Products" },
        },
        listProperties: ["id", "orderId", "productId", "quantity", "subTotal"],
      },
    },
    {
      resource: Setting,
      options: {
        titleProperty: "key",
        navigation: "System",
        isAccessible: ({ currentAdmin }) => currentAdmin?.role === "admin",
        isVisible: ({ currentAdmin }) => currentAdmin?.role === "admin",
      },
    },
  ],
  dashboard: {
    handler: async (request, response, context) => {
      const currentAdmin = context.currentAdmin || request.session?.currentAdmin;

      if (!currentAdmin) {
        return response.redirect("/admin/login");
      }

      if (currentAdmin.role === "admin") {
        return {
          role: "admin",
          summary: await buildAdminSummary(),
        };
      }

      const dbUser = await User.findByPk(currentAdmin.id, {
        attributes: ["id", "name", "email", "role"],
      });

      if (!dbUser) {
        return {
          role: "user",
          user: {
            id: currentAdmin.id,
            name: currentAdmin.name || "-",
            email: currentAdmin.email || "-",
          },
          recentOrders: [],
        };
      }

      const recentOrders = await Order.findAll({
        where: { userId: currentAdmin.id },
        include: [{ model: OrderItem, as: "items", include: [{ model: Product, as: "product" }] }],
        order: [["createdAt", "DESC"]],
        limit: 5,
      });

      const serializedOrders = recentOrders.map((order) => ({
        id: order.id,
        status: order.status,
        totalAmount: Number(order.totalAmount || 0),
        createdAt: order.createdAt,
        itemsCount: Array.isArray(order.items) ? order.items.length : 0,
      }));

      return {
        role: "user",
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
        },
        recentOrders: serializedOrders,
      };
    },
    component: AdminJS.bundle(dashboardPageComponent),
  },
  pages: {
    customSettings: {
      label: "Settings",
      icon: "Settings",
      handler: async (request, _response, context) => {
        if (context.currentAdmin?.role !== "admin") {
          throw new AdminJS.ValidationError({
            general: {
              message: "Access denied",
            },
          });
        }

        let message = "";
        if (request.method === "post") {
          const key = String(request.payload?.key || "").trim();
          const value = String(request.payload?.value || "").trim();

          if (!key) {
            throw new AdminJS.ValidationError({
              key: { message: "Setting key is required" },
            });
          }

          if (!isValidSettingKey(key)) {
            throw new AdminJS.ValidationError({
              key: { message: "Use 2-64 chars and include at least one letter" },
            });
          }

          await Setting.upsert({ key, value });
          message = `Updated setting: ${key}`;
        }

        const settings = await Setting.findAll({ order: [["key", "ASC"]] });

        return {
          settings: settings.map((setting) => setting.toJSON()),
          message,
        };
      },
      component: AdminJS.bundle(settingsPageComponent),
      isAccessible: ({ currentAdmin }) => currentAdmin?.role === "admin",
      isVisible: ({ currentAdmin }) => currentAdmin?.role === "admin",
    },
  },
});

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  admin,
  {
    authenticate: async (email, password) => {
      const user = await authenticateApiUser(email, password);

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    },
    cookieName: process.env.ADMIN_COOKIE_NAME || "adminjs",
    cookiePassword: adminCookieSecret,
  },
  null,
  {
    resave: false,
    saveUninitialized: false,
  }
);

app.use(admin.options.rootPath, hydrateAdminSessionFromJwt, adminRouter);

app.get("/admin/pages/settings", (_req, res) => {
  return res.redirect("/admin/pages/customSettings");
});

const getSessionAdmin = (req) => req.session?.currentAdmin || req.session?.adminUser || null;

app.get("/api/admin/settings", async (req, res) => {
  try {
    const currentAdmin = getSessionAdmin(req);
    if (!currentAdmin || currentAdmin.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const settings = await Setting.findAll({ order: [["key", "ASC"]] });
    return res.json({
      settings: settings.map((setting) => setting.toJSON()),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch settings" });
  }
});

app.post("/api/admin/settings", async (req, res) => {
  try {
    const currentAdmin = getSessionAdmin(req);
    if (!currentAdmin || currentAdmin.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const key = String(req.body?.key || "").trim();
    const value = String(req.body?.value || "").trim();

    if (!key) {
      return res.status(400).json({ message: "Setting key is required" });
    }

    if (!isValidSettingKey(key)) {
      return res.status(400).json({ message: "Use 2-64 chars and include at least one letter" });
    }

    await Setting.upsert({ key, value });
    const settings = await Setting.findAll({ order: [["key", "ASC"]] });

    return res.json({
      message: `Updated setting: ${key}`,
      settings: settings.map((setting) => setting.toJSON()),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save setting" });
  }
});

app.get("/api/register", (_req, res) => {
  return res.status(405).json({
    message: "Use POST /api/register with name, email, and password",
  });
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await authenticateApiUser(email, password);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "1d" }
    );

    req.session.currentAdmin = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
});

app.get("/api/me", async (req, res) => {
  try {
    const user = await getAuthenticatedUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ message: "Missing token" });
    }

    return res.json(await User.findByPk(user.id, { attributes: { exclude: ["password"] } }));
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

app.get("/api/summary", async (req, res) => {
  try {
    const user = await getAuthenticatedUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ message: "Missing token" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    const summary = await buildAdminSummary();
    return res.json(summary);
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

app.get("/", async (_req, res) => {
  res.json({
    message: "eCommerce backend is running",
    adminPath: "/admin",
    endpoints: ["/api/register", "/api/login", "/api/me", "/api/summary"],
  });
});

const start = async () => {
  try {
    await ensureInitialized();

    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

module.exports = {
  app,
  ensureInitialized,
};