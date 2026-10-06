# SulitCart

SulitCart is a frontend-only e-commerce management system built with React and Vite. It provides separate interfaces for Customers, Staff, and Administrators.

The system uses mock data and browser LocalStorage for testing and demonstration. No backend server or external database is required.

---

# Features

## Customer Features

### Home
- SulitCart homepage
- Hero section with rotating category backgrounds
- Hero background changes automatically every 5 seconds
- Product categories
- Featured products
- Product browsing
- Responsive layout
- Smooth page transitions

### Categories
The system includes five categories:

- Electronics
- Home & Living
- Clothing & Apparel
- Shoes & Footwear
- Beauty & Personal Care

Each category has its own realistic background image.

### Products
- Browse products
- Search products
- Product cards
- Product images
- Product details
- Product pricing
- Product stock information
- Product categories
- Add products to cart

### Shopping Cart
- Add products to cart
- Increase quantity
- Decrease quantity
- Remove products
- View subtotal
- View total
- Cart validation
- Empty cart state

### Checkout
- Checkout form
- Customer information
- Shipping information
- Shipping fee calculation
- Order summary
- Order placement
- Stock validation
- Order confirmation

### Orders
- View customer orders
- View order details
- Track order status
- Order history
- Order information

### Account
- Customer sign in
- Create account
- Profile information
- Account management
- Password visibility toggle
- Logout

---

# Staff Features

## Staff Dashboard
- Staff dashboard
- Order management
- View customer orders
- Process orders
- Update order status
- Walk-in sales
- Sales records
- Inventory information
- Staff profile

## Order Processing
Staff can process customer orders and update their status.

Example order statuses:

- Pending
- Processing
- Ready
- Shipped
- Completed
- Cancelled

## Walk-In Sales
- Record walk-in sales
- Add products
- Select quantities
- Calculate sale totals
- Save sales records
- View previous walk-in sales

---

# Admin Features

## Admin Dashboard
- Overview dashboard
- Sales information
- Order information
- Customer information
- Staff information
- Inventory overview
- Sales chart
- System statistics

## Product Management
- Add products
- Edit products
- Delete products
- Product image upload
- Product categories
- Product pricing
- Product stock
- Product codes/SKU
- Product search

## Category Management
- View categories
- Add categories
- Edit categories
- Delete categories
- Category management

## Inventory Management
- View inventory
- View stock levels
- Add stock
- Remove stock
- Adjust stock
- Stock movement tracking
- Inventory transaction history
- Low-stock information

## Order Management
- View orders
- View order details
- Update order status
- Monitor customer orders
- Order records

## Customer Management
- View customers
- Customer information
- Customer account records

## Staff Management
- View staff
- Staff information
- Staff records
- Staff management

## Shipping Management
- Shipping information
- Shipping settings
- Shipping fee management
- Shipping records

## Reports and Monitoring
- Sales information
- Sales charts
- Inventory information
- Order information
- Walk-in sales records
- Audit logs

---

# Authentication

SulitCart includes frontend authentication functionality for testing.

Features include:

- Customer sign in
- Customer registration
- Password validation
- Password visibility toggle
- Session handling
- Customer access control
- Staff access
- Admin access
- Logout

Authentication is simulated using frontend mock sessions and LocalStorage.

> This is not production-level authentication because the system does not have a backend.

---

# LocalStorage

SulitCart uses browser LocalStorage to persist frontend data.

Stored information can include:

- User session
- Products
- Categories
- Orders
- Inventory
- Customers
- Staff
- Shipping information
- Walk-in sales
- Catalog changes

Data remains available after refreshing the browser as long as the browser's LocalStorage is not cleared.

Because the system is frontend-only, LocalStorage is limited to the current browser and device.

---

# Mock Data

The system starts with mock data for testing.

Mock data includes:

- Products
- Categories
- Customers
- Staff
- Users
- Orders
- Inventory
- Shipping
- Audit logs
- Dates

The mock data allows the complete Customer, Staff, and Admin workflow to be demonstrated without a backend.

---

# Role Workflow

## Customer

Customer browses products → adds products to cart → checks out → places order → views order status.

## Staff

Staff receives order → processes order → updates order status → completes order.

## Admin

Admin manages products → manages categories → manages inventory → monitors orders → manages customers and staff → views reports and audit information.

---

# Frontend Data Flow

```text
Mock Data
    ↓
React Components
    ↓
StoreContext
    ↓
LocalStorage
    ↓
Customer / Staff / Admin

SulitCart/
├── public/
│   ├── images/
│   │   ├── hero-realistic/
│   │   │   ├── beauty-personal-care.jpg
│   │   │   ├── clothing-apparel.jpg
│   │   │   ├── electronics.jpg
│   │   │   ├── home-living.jpg
│   │   │   └── shoes-footwear.jpg
│   │   ├── product-placeholder.svg
│   │   ├── sulitcart-everyday.jpg
│   │   └── sulitcart-market.jpg
│   └── ...
│
├── src/
│   ├── components/
│   │   ├── Alert.jsx
│   │   ├── CategoryLink.jsx
│   │   ├── ImageUpload.jsx
│   │   ├── InventoryTransactionHistory.jsx
│   │   ├── PageTransition.jsx
│   │   ├── ProductCard.jsx
│   │   ├── ProductForm.jsx
│   │   ├── RequireCustomerCheckout.jsx
│   │   ├── SalesChart.jsx
│   │   ├── StockAdjustmentModal.jsx
│   │   └── UI.jsx
│   │
│   ├── context/
│   │   └── StoreContext.jsx
│   │
│   ├── data/
│   │   ├── catalogStorage.js
│   │   ├── mockAuditLogs.js
│   │   ├── mockCategories.js
│   │   ├── mockCustomers.js
│   │   ├── mockDates.js
│   │   ├── mockInventory.js
│   │   ├── mockOrders.js
│   │   ├── mockProducts.js
│   │   ├── mockShipping.js
│   │   ├── mockStaff.js
│   │   └── mockUsers.js
│   │
│   ├── hooks/
│   │   └── useAnimatedVisibility.js
│   │
│   ├── layouts/
│   │   ├── PortalLayouts.jsx
│   │   └── StoreLayout.jsx
│   │
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── CatalogManagementPages.jsx
│   │   │   ├── InventoryOrderPages.jsx
│   │   │   ├── OverviewPages.jsx
│   │   │   ├── PeopleShippingPages.jsx
│   │   │   └── WalkInSalesRecords.jsx
│   │   │
│   │   ├── customer/
│   │   │   ├── AccountPages.jsx
│   │   │   ├── CartCheckoutPages.jsx
│   │   │   └── CatalogPages.jsx
│   │   │
│   │   └── staff/
│   │       └── StaffPages.jsx
│   │
│   ├── services/
│   │   └── mockSession.js
│   │
│   ├── css/
│   │   ├── AccountPages.css
│   │   ├── Alert.css
│   │   ├── CartCheckoutPages.css
│   │   ├── CatalogManagementPages.css
│   │   ├── CatalogPages.css
│   │   ├── CategoryLink.css
│   │   ├── ImageUpload.css
│   │   ├── InventoryOrderPages.css
│   │   ├── InventoryTransactionHistory.css
│   │   ├── NavigationTransitions.css
│   │   ├── OverviewPages.css
│   │   ├── PeopleShippingPages.css
│   │   ├── PortalLayouts.css
│   │   ├── ProductCard.css
│   │   ├── ProductForm.css
│   │   ├── SalesChart.css
│   │   ├── StaffPages.css
│   │   ├── StockAdjustmentModal.css
│   │   ├── StoreLayout.css
│   │   ├── UI.css
│   │   ├── WalkInSalesRecords.css
│   │   └── index.css
│   │
│   ├── utils/
│   │   ├── cn.ts
│   │   ├── mockPassword.js
│   │   ├── productCode.js
│   │   └── productImage.js
│   │
│   ├── utils.js
│   ├── App.tsx
│   └── main.tsx
│
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
