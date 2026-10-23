import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { isOnlineOrder } from "../utils";
import { generateProductCode } from "../utils/productCode";

const StoreContext = createContext(null);

const mapCategory = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  image: row.image_url || "",
  active: row.active,
});

const mapProduct = (row) => ({
  id: row.id,
  category: row.category_id || "",
  sku: row.sku || "",
  name: row.name,
  description: row.description || "",
  price: Number(row.price),
  stock: row.stock,
  image: row.image_url || "",
  active: row.active,
  threshold: row.low_stock_threshold ?? 5,
});

const mapOrderStatus = (status) => ({
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Shipped",
  delivered: "Completed",
  cancelled: "Cancelled",
}[status] || status);

const mapDatabaseOrder = (row, items, profiles, products) => {
  const customerProfile = profiles.find((profile) => profile.id === row.customer_id);
  const orderItems = items.filter((item) => item.order_id === row.id).map((item) => {
    const product = products.find((entry) => entry.id === item.product_id);
    return {
      productId: item.product_id,
      name: item.product_name,
      image: product?.image || "",
      price: Number(item.unit_price),
      quantity: item.quantity,
    };
  });
  return {
    id: row.id,
    number: row.order_number,
    channel: row.order_type === "walk_in" ? "walk-in" : "online",
    customerId: row.customer_id || "walk-in",
    customer: row.customer_name,
    email: row.customer_email,
    phone: row.customer_phone,
    date: row.created_at,
    items: orderItems,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping_fee),
    total: Number(row.total),
    payment: row.payment_method || "Cash on Delivery",
    status: mapOrderStatus(row.status),
    address: row.delivery_address,
    notes: row.notes,
    processedBy: profiles.find((profile) => profile.id === row.created_by)?.full_name || "",
    customerAddress: customerProfile?.address || "",
  };
};

export function StoreProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [shipping, setShipping] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState([]);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const productsRef = useRef(products);
  const authRequestRef = useRef(0);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const loadAdminData = useCallback(async () => {
    const [profilesResult, ordersResult, itemsResult, inventoryResult, auditResult, categoriesResult, productsResult, shippingResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, phone, address, role, active, created_at").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("order_items").select("*"),
      supabase.from("inventory_transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("categories").select("*").order("name"),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("shipping_rates").select("*").order("municipality"),
    ]);
    const errors = [
      profilesResult.error && `profiles: ${profilesResult.error.message}`,
      ordersResult.error && `orders: ${ordersResult.error.message}`,
      itemsResult.error && `order items: ${itemsResult.error.message}`,
      inventoryResult.error && `inventory: ${inventoryResult.error.message}`,
      auditResult.error && `audit logs: ${auditResult.error.message}`,
      categoriesResult.error && `categories: ${categoriesResult.error.message}`,
      productsResult.error && `products: ${productsResult.error.message}`,
      shippingResult.error && `shipping rates: ${shippingResult.error.message}`,
    ].filter(Boolean);
    if (errors.length) setStorageError(`Some admin data could not be loaded: ${errors.join("; ")}`);
    else setStorageError("");

    if (!profilesResult.error) {
      const profiles = profilesResult.data || [];
      setCustomers(profiles.filter((profile) => profile.role === "customer").map((profile) => ({
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        active: profile.active,
        joined: profile.created_at,
      })));
      setStaff(profiles.filter((profile) => profile.role === "staff").map((profile) => ({
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        active: profile.active,
        created: profile.created_at,
      })));
      setUsers(profiles.map((profile) => ({
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        role: profile.role,
        active: profile.active,
      })));
    }
    if (!categoriesResult.error) setCategories((categoriesResult.data || []).map(mapCategory));
    if (!productsResult.error) {
      const loadedProducts = (productsResult.data || []).map(mapProduct);
      productsRef.current = loadedProducts;
      setProducts(loadedProducts);
    }
    if (!shippingResult.error) {
      setShipping((shippingResult.data || []).map((rate) => ({
        id: rate.id,
        municipality: rate.municipality,
        barangay: rate.barangay,
        fee: Number(rate.fee),
        active: rate.active,
      })));
    }
    const currentProducts = productsResult.error ? productsRef.current : (productsResult.data || []).map(mapProduct);
    if (!ordersResult.error && !itemsResult.error && !profilesResult.error) {
      setOrders((ordersResult.data || []).map((order) => mapDatabaseOrder(
        order,
        itemsResult.data || [],
        profilesResult.data || [],
        currentProducts,
      )));
    }
    if (!inventoryResult.error) {
      const productsById = new Map(currentProducts.map((product) => [product.id, product]));
      const profilesById = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
      setInventory((inventoryResult.data || []).map((entry) => ({
        id: entry.id,
        productId: entry.product_id,
        type: entry.transaction_type,
        quantity: entry.quantity,
        date: entry.created_at,
        user: profilesById.get(entry.actor_id)?.full_name || "Store team",
        note: entry.note,
        productName: entry.product_name || productsById.get(entry.product_id)?.name || "Deleted product",
      })));
    }
    if (!auditResult.error) {
      setAuditLogs((auditResult.data || []).map((entry) => ({
        id: entry.id,
        date: entry.created_at,
        user: entry.actor_name,
        role: entry.actor_role.charAt(0).toUpperCase() + entry.actor_role.slice(1),
        action: entry.action,
        entity: entry.entity,
        description: entry.description,
      })));
    }
  }, []);

  const loadStaffOrders = useCallback(async () => {
    const [ordersResult, itemsResult, profilesResult] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("order_items").select("*"),
      supabase.from("profiles").select("id, full_name, email, phone, address, role, active, created_at"),
    ]);
    const failure = ordersResult.error || itemsResult.error || profilesResult.error;
    if (failure) {
      setStorageError(`Could not load staff order data: ${failure.message}`);
      return;
    }
    setOrders((ordersResult.data || []).map((order) => mapDatabaseOrder(
      order,
      itemsResult.data || [],
      profilesResult.data || [],
      productsRef.current,
    )));
  }, []);

  const loadStaffCatalog = useCallback(async () => {
    const [categoriesResult, productsResult] = await Promise.all([
      supabase.from("categories").select("*").eq("active", true).order("name"),
      supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false }),
    ]);
    const failure = categoriesResult.error || productsResult.error;
    if (failure) {
      setStorageError(`Could not load the staff catalog: ${failure.message}`);
      return;
    }
    setCategories((categoriesResult.data || []).map(mapCategory));
    const loadedProducts = (productsResult.data || []).map(mapProduct);
    productsRef.current = loadedProducts;
    setProducts(loadedProducts);
  }, []);

  const refreshInventory = useCallback(async () => {
    const { data, error } = await supabase.from("inventory_transactions").select("*").order("created_at", { ascending: false });
    if (error) {
      setStorageError(`Could not reload inventory history: ${error.message}`);
      return { error: error.message };
    }
    const { data: profiles, error: profileError } = await supabase.from("profiles").select("id, full_name");
    if (profileError) {
      setStorageError(`Could not load inventory staff names: ${profileError.message}`);
      return { error: profileError.message };
    }
    const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const productsById = new Map(productsRef.current.map((product) => [product.id, product]));
    setInventory((data || []).map((entry) => ({
      id: entry.id,
      productId: entry.product_id,
      type: entry.transaction_type,
      quantity: entry.quantity,
      date: entry.created_at,
      user: profilesById.get(entry.actor_id)?.full_name || "Store team",
      note: entry.note,
      productName: entry.product_name || productsById.get(entry.product_id)?.name || "Deleted product",
    })));
    return true;
  }, []);

  const customerAccount = users.find((account) => account.id === user?.id);
  const customerRecord = user && customers.find((customer) => customer.id === user.id || customer.email.toLowerCase() === user.email.toLowerCase());
  const canCheckout = Boolean(user?.role === "customer"
    && user.active !== false
    && customerAccount?.role === "customer"
    && customerAccount.active !== false
    && customerRecord?.active !== false);

  // Initial data is loaded from Supabase. No local mock catalog or seeded demo records are used.
  useEffect(() => {
    let mounted = true;
    let catalogRequest = 0;
    const loadCatalog = async () => {
      const requestId = ++catalogRequest;
      const [categoryResult, productResult] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("*").order("created_at", { ascending: false }),
      ]);
      if (!mounted || requestId !== catalogRequest) return;
      if (categoryResult.error) console.error("Supabase categories load failed:", categoryResult.error.message);
      else setCategories((categoryResult.data || []).map(mapCategory));
      if (productResult.error) console.error("Supabase products load failed:", productResult.error.message);
      else {
        const loadedProducts = (productResult.data || []).map(mapProduct);
        productsRef.current = loadedProducts;
        setProducts(loadedProducts);
      }
    };
    const loadPublicData = async () => {
      await loadCatalog();
      const { data: shippingRates, error: shippingError } = await supabase.from("shipping_rates").select("*").order("municipality");
      if (!mounted) return;
      if (shippingError) console.error("Supabase shipping rates load failed:", shippingError.message);
      else setShipping((shippingRates || []).map((row) => ({ id: row.id, municipality: row.municipality, barangay: row.barangay, fee: Number(row.fee), active: row.active })));
    };
    const catalogChannel = supabase
      .channel("store-catalog")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => { void loadCatalog(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => { void loadCatalog(); })
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Supabase catalog realtime subscription failed:", error?.message || status);
        }
      });
    loadPublicData();
    return () => {
      mounted = false;
      catalogRequest += 1;
      void catalogChannel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async (session) => {
      const requestId = ++authRequestRef.current;
      if (!session?.user) {
        if (mounted && requestId === authRequestRef.current) {
          setUser(null);
          setUsers([]);
          setStaff([]);
          setAuthLoading(false);
        }
        return;
      }
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        if (!mounted || requestId !== authRequestRef.current) return;
        if (error || !data) {
          setStorageError(error
            ? `Could not load your account profile: ${error.message}`
            : "Your account profile is missing. Please contact the store administrator.");
          setUser((current) => current?.id === session.user.id ? current : null);
          setAuthLoading(false);
          return;
        }
        const profileUser = { id: data.id, email: data.email, name: data.full_name, phone: data.phone, address: data.address, role: data.role, active: data.active };
        setUser(profileUser);
        setUsers((current) => [profileUser, ...current.filter((item) => item.id !== profileUser.id)]);
        setStorageError("");
        setAuthLoading(false);
        if (data.role === "customer") {
          setCustomers((current) => [{ id: data.id, email: data.email, name: data.full_name, phone: data.phone, address: data.address, active: data.active, joined: data.created_at }, ...current.filter((item) => item.id !== data.id)]);
          setStaff([]);
          const { data: customerOrders, error: customerOrdersError } = await supabase
            .from("orders").select("*").eq("customer_id", data.id).order("created_at", { ascending: false });
          if (!mounted || requestId !== authRequestRef.current) return;
          if (customerOrdersError) {
            setStorageError(`Could not load your orders: ${customerOrdersError.message}`);
          } else {
            const orderIds = (customerOrders || []).map((order) => order.id);
            const { data: customerItems, error: customerItemsError } = orderIds.length
              ? await supabase.from("order_items").select("*").in("order_id", orderIds)
              : { data: [], error: null };
            if (!mounted || requestId !== authRequestRef.current) return;
            if (customerItemsError) {
              setStorageError(`Could not load order items: ${customerItemsError.message}`);
            } else {
              setOrders((customerOrders || []).map((order) => mapDatabaseOrder(
                order,
                customerItems || [],
                [{ id: data.id, full_name: data.full_name }],
                products,
              )));
            }
          }
        } else if (data.role === "admin") {
          await loadAdminData();
          if (!mounted || requestId !== authRequestRef.current) return;
        } else if (data.role === "staff") {
          await Promise.all([loadStaffCatalog(), loadStaffOrders()]);
          if (!mounted || requestId !== authRequestRef.current) return;
        } else {
          setStaff([]);
        }
      } catch (error) {
        if (!mounted || requestId !== authRequestRef.current) return;
        setStorageError(`Could not load your account profile: ${error.message || "Unexpected error."}`);
        setUser((current) => current?.id === session.user.id ? current : null);
        setAuthLoading(false);
      }
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) setAuthLoading(true);
      Promise.resolve().then(() => loadProfile(session));
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadAdminData, loadStaffCatalog, loadStaffOrders]);

  const addAudit = useCallback(async (action, entity, description, actor = user) => {
    if (!actor?.id) return { error: "Sign in before recording an audit event." };
    const { data, error } = await supabase.from("audit_logs").insert({
      actor_id: actor.id,
      actor_name: actor.name || actor.email,
      actor_role: actor.role,
      action,
      entity,
      description,
    }).select().single();
    if (error) {
      setStorageError(`The change was saved, but its audit entry could not be recorded: ${error.message}`);
      return { error: error.message };
    }
    const entry = {
      id: data.id,
      date: data.created_at,
      user: data.actor_name,
      role: data.actor_role.charAt(0).toUpperCase() + data.actor_role.slice(1),
      action: data.action,
      entity: data.entity,
      description: data.description,
    };
    setAuditLogs((current) => [entry, ...current]);
    return entry;
  }, [user]);

  const addToCart = useCallback((productId, quantity = 1) => {
    const product = products.find((item) => item.id === productId);
    if (!product || !product.active || product.stock < 1) return false;
    const existing = cart.find((item) => item.productId === productId)?.quantity || 0;
    if (existing + quantity > product.stock) return false;
    setCart((current) => {
      const match = current.find((item) => item.productId === productId);
      return match
        ? current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item)
        : [...current, { productId, quantity }];
    });
    return true;
  }, [cart, products]);

  const updateCartQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.productId !== productId));
      return;
    }
    const product = products.find((item) => item.id === productId);
    const safeQuantity = Math.min(quantity, product?.stock || 0);
    setCart((current) => current.map((item) => item.productId === productId ? { ...item, quantity: safeQuantity } : item));
  }, [products]);

  const getShippingFee = useCallback((municipality, barangay) => {
    if (!municipality) return 0;
    const activeRates = shipping.filter((rate) => rate.active && rate.municipality === municipality);
    const exact = activeRates.find((rate) => rate.barangay.toLowerCase() === (barangay || "").trim().toLowerCase());
    return exact?.fee ?? activeRates.find((rate) => rate.barangay === "*")?.fee ?? 0;
  }, [shipping]);

  const upsertProduct = async (product) => {
    const isNew = !product.id;
    const previous = products.find((item) => item.id === product.id);
    if (!isNew && !previous) return { error: "This product no longer exists. Refresh the product list." };
    if (!product.category) return { error: "Choose a category to generate a product code." };
    const productCode = previous?.sku?.trim().toUpperCase() || generateProductCode(products, product.category, categories);
    if (products.some((item) => item.id !== product.id && item.sku?.toUpperCase() === productCode)) return { error: "This product code is already in use." };
    const nextProduct = { ...product, sku: productCode, stock: Number(product.stock), price: Number(product.price), threshold: Number(product.threshold) };
    if (!Number.isSafeInteger(nextProduct.stock) || nextProduct.stock < 0 || !Number.isSafeInteger(nextProduct.threshold) || nextProduct.threshold < 0 || !Number.isFinite(nextProduct.price) || nextProduct.price < 0) {
      return { error: "Enter a valid price and non-negative whole numbers for stock and threshold." };
    }
    const targetStock = nextProduct.stock;
    const { data, error } = await supabase.rpc("save_store_product", {
      p_product_id: isNew ? null : product.id,
      p_category_id: product.category,
      p_sku: productCode,
      p_name: product.name.trim(),
      p_description: product.description || "",
      p_price: nextProduct.price,
      p_stock: nextProduct.stock,
      p_low_stock_threshold: nextProduct.threshold,
      p_image_url: product.image || null,
      p_active: product.active !== false,
    });
    if (error) return { error: `Could not save product: ${error.message}` };

    const savedProduct = mapProduct(data);
    const stockDifference = targetStock - (previous?.stock || 0);
    if (stockDifference) {
      savedProduct.stock = targetStock;
      await refreshInventory();
    }
    setProducts((current) => isNew
      ? [savedProduct, ...current]
      : current.map((item) => item.id === savedProduct.id ? savedProduct : item));
    await addAudit(isNew ? "Product added" : "Product updated", savedProduct.name, `${savedProduct.sku} product details saved`);
    return savedProduct;
  };

  const deleteProduct = async (id) => {
    const product = products.find((item) => item.id === id);
    if (!product) return { error: "This product no longer exists." };
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { error: `Could not delete product: ${error.message}` };
    setProducts((current) => current.filter((item) => item.id !== id));
    setCart((current) => current.filter((item) => item.productId !== id));
    await addAudit("Product deleted", product.name, "Product removed from catalog");
    return true;
  };

  const upsertCategory = async (category) => {
    const isNew = !category.id;
    const name = category.name?.trim() || "";
    if (!name) return { error: "Enter a category name." };
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const payload = { name, slug, description: category.description || "", image_url: category.image || null, active: category.active !== false, updated_at: new Date().toISOString() };
    let query = supabase.from("categories");
    query = isNew ? query.insert(payload) : query.update(payload).eq("id", category.id);
    const { data, error } = await query.select().single();
    if (error) return { error: `Could not save category: ${error.message}` };
    const savedCategory = mapCategory(data);
    setCategories((current) => isNew
      ? [...current, savedCategory]
      : current.map((item) => item.id === savedCategory.id ? savedCategory : item));
    await addAudit(isNew ? "Category added" : "Category updated", savedCategory.name, "Category details saved");
    return savedCategory;
  };

  const deleteCategory = async (id) => {
    const category = categories.find((item) => item.id === id);
    if (!category) return { error: "This category no longer exists." };
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return { error: `Could not delete category: ${error.message}` };
    setCategories((current) => current.filter((item) => item.id !== id));
    setProducts((current) => current.map((item) => item.category === id ? { ...item, category: "" } : item));
    await addAudit("Category deleted", category.name, "Category removed from catalog");
    return true;
  };

  const changeOrderStatus = async (orderId, status) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order || !isOnlineOrder(order)) return { error: "This online order no longer exists." };
    const { error } = await supabase.rpc("update_store_order_status", {
      p_order_id: orderId,
      p_status: status.toLowerCase(),
    });
    if (error) return { error: `Could not update order status: ${error.message}` };
    const { data: updated, error: loadError } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (loadError) return { error: `Order was updated, but could not be reloaded: ${loadError.message}` };
    if (status === "Cancelled") {
      const orderItems = order.items;
      setProducts((current) => current.map((product) => {
        const returned = orderItems.filter((line) => line.productId === product.id).reduce((sum, line) => sum + line.quantity, 0);
        return returned ? { ...product, stock: product.stock + returned } : product;
      }));
    }
    setOrders((current) => current.map((item) => item.id === orderId
      ? { ...item, status: mapOrderStatus(updated.status), date: updated.created_at }
      : item));
    if (status === "Cancelled" && user?.role !== "customer") await refreshInventory();
    return true;
  };

  const cancelCustomerOrder = async (orderId) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order || !isOnlineOrder(order) || !user || order.customerId !== user.id || !["Pending", "Confirmed"].includes(order.status)) return { error: "This order can no longer be cancelled." };
    const { error } = await supabase.rpc("update_store_order_status", {
      p_order_id: orderId,
      p_status: "cancelled",
    });
    if (error) return { error: `Could not cancel order: ${error.message}` };
    setOrders((current) => current.map((item) => item.id === orderId ? { ...item, status: "Cancelled" } : item));
    setProducts((current) => current.map((product) => {
      const returned = order.items.filter((line) => line.productId === product.id).reduce((sum, line) => sum + line.quantity, 0);
      return returned ? { ...product, stock: product.stock + returned } : product;
    }));
    return true;
  };

  const placeOrder = async ({ customer, address, phone, municipality, barangay, notes, payment = "Cash on Delivery" }) => {
    if (!canCheckout) return { error: "Please sign in to your customer account before checkout.", requiresSignIn: true };
    const orderLines = cart.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      return product ? { productId: product.id, name: product.name, image: product.image, price: product.price, quantity: line.quantity } : null;
    }).filter(Boolean);
    if (!orderLines.length || orderLines.some((line) => line.quantity > (products.find((product) => product.id === line.productId)?.stock || 0))) return null;
    const { data, error } = await supabase.rpc("create_store_order", {
      p_items: orderLines.map((line) => ({ product_id: line.productId, quantity: line.quantity })),
      p_customer_name: customer || user.name,
      p_customer_email: user.email,
      p_customer_phone: phone,
      p_delivery_address: [barangay, municipality, "Nueva Ecija", address].filter(Boolean).join(", "),
      p_municipality: municipality,
      p_barangay: barangay,
      p_notes: notes || "",
      p_payment_method: payment,
      p_order_type: "online",
    });
    if (error) return { error: error.message };
    const { data: orderRow, error: orderError } = await supabase.from("orders").select("*").eq("id", data.id).single();
    const { data: itemRows, error: itemError } = await supabase.from("order_items").select("*").eq("order_id", data.id);
    if (orderError || itemError) return { error: `Order created, but details could not be loaded: ${orderError?.message || itemError?.message}` };
    const order = mapDatabaseOrder(orderRow, itemRows || [], [{ id: user.id, full_name: user.name }], products);
    setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
    setProducts((current) => current.map((product) => {
      const sold = orderLines.find((line) => line.productId === product.id)?.quantity || 0;
      return sold ? { ...product, stock: product.stock - sold } : product;
    }));
    setCart([]);
    return order;
  };

  const commitSale = async ({ items, customerName, payment }) => {
    const staffAccount = users.find((account) => account.id === user?.id);
    const staffMember = staff.find((person) => person.email.toLowerCase() === user?.email?.toLowerCase());
    if (user?.role !== "staff" || user.active === false || staffAccount?.active === false || staffMember?.active === false) {
      return { error: "Only active staff accounts can process walk-in sales." };
    }
    const lines = items.map((item) => {
      const product = products.find((productItem) => productItem.id === item.productId);
      return product ? { productId: product.id, name: product.name, image: product.image, price: product.price, quantity: item.quantity } : null;
    }).filter(Boolean);
    if (!lines.length || lines.some((line) => line.quantity > (products.find((product) => product.id === line.productId)?.stock || 0))) return null;
    const { data, error } = await supabase.rpc("create_store_order", {
      p_items: lines.map((line) => ({ product_id: line.productId, quantity: line.quantity })),
      p_customer_name: customerName || "Walk-in customer",
      p_customer_email: "",
      p_customer_phone: "",
      p_delivery_address: "Walk-in sale",
      p_municipality: "",
      p_barangay: "",
      p_notes: "",
      p_payment_method: payment,
      p_order_type: "walk_in",
    });
    if (error) return { error: error.message };
    const { data: orderRow, error: orderError } = await supabase.from("orders").select("*").eq("id", data.id).single();
    const { data: itemRows, error: itemError } = await supabase.from("order_items").select("*").eq("order_id", data.id);
    if (orderError || itemError) return { error: `Sale completed, but details could not be loaded: ${orderError?.message || itemError?.message}` };
    const sale = mapDatabaseOrder(orderRow, itemRows || [], [{ id: user.id, full_name: user.name }], products);
    setOrders((current) => [sale, ...current]);
    setProducts((current) => current.map((product) => {
      const sold = lines.find((line) => line.productId === product.id)?.quantity || 0;
      return sold ? { ...product, stock: product.stock - sold } : product;
    }));
    if (user.role !== "customer") await refreshInventory();
    return sale;
  };

  const adjustStock = async (productId, difference, note = "Manual stock adjustment") => {
    const product = products.find((item) => item.id === productId);
    if (!product) return { error: "The selected product no longer exists." };
    const actualDifference = Number(difference);
    if (!Number.isSafeInteger(actualDifference) || !actualDifference || product.stock + actualDifference < 0) {
      return { error: "Enter a valid whole-number quantity. Stock cannot be negative." };
    }
    const productCode = (product.sku || "").trim() || generateProductCode(products, product.category, categories);
    if (!productCode) return { error: "Assign this product to a category before adding stock." };
    const { data, error } = await supabase.rpc("adjust_inventory", {
      p_product_id: productId,
      p_difference: actualDifference,
      p_note: note,
    });
    if (error) return { error: `Could not adjust stock: ${error.message}` };
    const savedProduct = mapProduct(data);
    setProducts((current) => current.map((item) => item.id === productId ? savedProduct : item));
    await refreshInventory();
    return { product: savedProduct };
  };

  const toggleCustomer = async (id) => {
    const customer = customers.find((item) => item.id === id);
    if (!customer) return { error: "This customer no longer exists." };
    const active = !customer.active;
    const { error } = await supabase.from("profiles").update({ active, updated_at: new Date().toISOString() }).eq("id", id).eq("role", "customer");
    if (error) return { error: `Could not update customer status: ${error.message}` };
    setCustomers((current) => current.map((item) => item.id === id ? { ...item, active } : item));
    setUsers((current) => current.map((item) => item.email.toLowerCase() === customer.email.toLowerCase() ? { ...item, active } : item));
    await addAudit(active ? "Customer activated" : "Customer deactivated", customer.email, "Customer account status changed");
    return true;
  };
  const upsertStaff = async (person) => {
    const previous = person.id ? staff.find((item) => item.id === person.id) : null;
    if (person.id && !previous) return { error: "This staff member no longer exists." };
    const name = person.name?.trim() || "";
    const email = person.email?.trim().toLowerCase() || "";
    const phone = person.phone?.trim() || "";
    const password = person.password || "";
    const existingAccount = previous ? users.find((item) => item.staffId === previous.id || item.id === previous.id || item.email.toLowerCase() === previous.email.toLowerCase()) : null;
    if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a full name, valid email, and phone number." };
    if (staff.some((item) => item.id !== person.id && item.email.toLowerCase() === email)
      || users.some((item) => item.id !== existingAccount?.id && item.email.toLowerCase() === email)) {
      return { error: "An account with this email already exists." };
    }
    if ((!previous || password) && (password.length < 8 || !password.trim())) return { error: "Use a staff password with at least 8 characters." };
    if (!previous) {
      const { data, error } = await supabase.functions.invoke("create-staff", {
        body: { name, email, phone, password },
      });
      if (error) {
        if (error.context instanceof Response) {
          const responseBody = await error.context.clone().json();
          if (typeof responseBody?.error === "string") return { error: responseBody.error };
        }
        return { error: `Could not create staff account: ${error.message}` };
      }
      if (!data?.staff) return { error: data?.error || "The staff account could not be created." };
      const createdStaff = data.staff;
      setStaff((current) => [createdStaff, ...current.filter((item) => item.id !== createdStaff.id)]);
      await addAudit("Staff added", createdStaff.email, `${createdStaff.name} staff account created`);
      return createdStaff;
    }
    const { data, error } = await supabase.functions.invoke("manage-staff", {
      body: { id: previous.id, name, email, phone, active: person.active !== false },
    });
    if (error) {
      if (error.context instanceof Response) {
        const responseBody = await error.context.clone().json();
        if (typeof responseBody?.error === "string") return { error: responseBody.error };
      }
      return { error: `Could not update staff account: ${error.message}` };
    }
    if (!data?.staff) return { error: data?.error || "The staff account could not be updated." };
    const nextPerson = data.staff;
    setStaff((current) => current.map((item) => item.id === previous.id ? nextPerson : item));
    setUsers((current) => current.map((item) => item.id === nextPerson.id
      ? { ...item, name: nextPerson.name, email: nextPerson.email, phone: nextPerson.phone, active: nextPerson.active }
      : item));
    await addAudit("Staff updated", nextPerson.email, `${nextPerson.name} staff account saved`);
    return nextPerson;
  };
  const toggleStaff = async (id) => {
    const person = staff.find((item) => item.id === id);
    if (!person) return { error: "This staff member no longer exists." };
    const active = !person.active;
    const { error } = await supabase.from("profiles").update({ active, updated_at: new Date().toISOString() }).eq("id", id).eq("role", "staff");
    if (error) return { error: `Could not update staff status: ${error.message}` };
    setStaff((current) => current.map((item) => item.id === id ? { ...item, active } : item));
    setUsers((current) => current.map((item) => item.email.toLowerCase() === person.email.toLowerCase() ? { ...item, active } : item));
    await addAudit(active ? "Staff activated" : "Staff deactivated", person.email, "Staff account status changed");
    return true;
  };
  const upsertShippingRate = async (rate) => {
    const fee = Number(rate.fee);
    if (!rate.municipality?.trim() || !rate.barangay?.trim() || !Number.isFinite(fee) || fee < 0) {
      return { error: "Enter a municipality, barangay, and valid non-negative shipping fee." };
    }
    const payload = {
      municipality: rate.municipality.trim(),
      barangay: rate.barangay.trim(),
      fee,
      active: rate.active !== false,
    };
    let query = supabase.from("shipping_rates");
    query = rate.id ? query.update(payload).eq("id", rate.id) : query.insert(payload);
    const { data, error } = await query.select().single();
    if (error) return { error: `Could not save shipping rate: ${error.message}` };
    const nextRate = { id: data.id, municipality: data.municipality, barangay: data.barangay, fee: Number(data.fee), active: data.active };
    setShipping((current) => rate.id
      ? current.map((item) => item.id === rate.id ? nextRate : item)
      : [nextRate, ...current]);
    await addAudit(rate.id ? "Shipping rate updated" : "Shipping rate added", nextRate.municipality, `${nextRate.barangay}: PHP ${nextRate.fee}`);
    return nextRate;
  };
  const deleteShippingRate = async (id) => {
    const rate = shipping.find((item) => item.id === id);
    if (!rate) return { error: "This shipping rate no longer exists." };
    const { error } = await supabase.from("shipping_rates").delete().eq("id", id);
    if (error) return { error: `Could not delete shipping rate: ${error.message}` };
    setShipping((current) => current.filter((item) => item.id !== id));
    await addAudit("Shipping rate deleted", rate.municipality, rate.barangay || "Rate removed");
    return true;
  };

  const login = async (email, password) => {
    if (!email || !password) return { error: "Enter your email and password to continue." };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { error: error.message };
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    if (profileError || !profile) {
      const { error: signOutError } = await supabase.auth.signOut();
      const reason = profileError?.message || "No profile is associated with this account.";
      return { error: `Signed in, but the account profile could not be loaded: ${reason}${signOutError ? ` Sign-out also failed: ${signOutError.message}` : ""}` };
    }
    const signedIn = { id: profile.id, name: profile.full_name, email: profile.email, phone: profile.phone, address: profile.address, role: profile.role, active: profile.active };
    if (signedIn.active === false) { await supabase.auth.signOut(); return { error: "This account is inactive. Please contact the store team." }; }
    setUser(signedIn);
    setAuthLoading(false);
    setStorageError("");
    setUsers((current) => [signedIn, ...current.filter((item) => item.id !== signedIn.id)]);
    return { user: signedIn };
  };

  const register = async ({ name, email, password, phone }) => {
    if (!name?.trim() || !email?.trim() || !password || !phone?.trim()) return { error: "Complete all required fields." };
    if (password.length < 8) return { error: "Use a password with at least 8 characters." };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: name.trim(), phone: phone.trim() } },
    });
    if (error) return { error: error.message };
    if (!data.session) return { error: "Account created. Check your email to confirm your address, then sign in." };
    const signedIn = { id: data.user.id, name: name.trim(), email: email.trim(), phone: phone.trim(), role: 'customer', active: true };
    setUser(signedIn);
    setAuthLoading(false);
    setUsers((current) => [signedIn, ...current.filter((item) => item.id !== signedIn.id)]);
    setCustomers((current) => [{ id: signedIn.id, name: signedIn.name, email: signedIn.email, phone: signedIn.phone, active: true, joined: new Date().toISOString() }, ...current.filter((item) => item.id !== signedIn.id)]);
    return { user: signedIn };
  };

  const updateProfile = async (changes) => {
    if (!user) return { error: "Please sign in again." };
    const payload = { full_name: changes.name ?? user.name ?? '', phone: changes.phone ?? user.phone ?? '', address: changes.address ?? user.address ?? '', updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', user.id).select().single();
    if (error) return { error: error.message };
    const updated = { ...user, name: data.full_name, phone: data.phone, address: data.address };
    setUser(updated);
    return updated;
  };

  const logout = async () => {
    authRequestRef.current += 1;
    setUser(null);
    setCart([]);
    setOrders([]);
    setUsers([]);
    setStaff([]);
    setCustomers([]);
    const { error } = await supabase.auth.signOut();
    if (error) {
      const message = `Could not sign out: ${error.message}`;
      setStorageError(message);
      return { error: message };
    }
    setStorageError("");
    return true;
  };

  const value = {
    products, setProducts, categories, setCategories, orders, setOrders, customers, setCustomers, staff, setStaff,
    shipping, setShipping, inventory, setInventory, users, cart, user, authLoading, canCheckout, storageError, auditLogs, addAudit, addToCart,
    updateCartQuantity, getShippingFee, upsertProduct, deleteProduct, upsertCategory, deleteCategory,
    changeOrderStatus, cancelCustomerOrder, placeOrder, commitSale, adjustStock, toggleCustomer, upsertStaff, upsertShippingRate,
    deleteShippingRate, login, register, updateProfile, logout, toggleStaff,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}