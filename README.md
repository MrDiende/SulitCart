# SulitCart

**SulitCart — Quality Products. Simple Shopping.**

SulitCart is a web-based e-commerce and store management system designed to make online shopping and local store operations more convenient. It allows customers to browse products, manage their shopping carts, place orders, and track order status. It also provides administrative and staff tools for managing products, inventory, orders, sales, and store operations.

The system focuses on local shopping and delivery within **Nueva Ecija, Philippines**, with Cabanatuan City as its primary location reference.

## Features

- Product catalog and category browsing
- Product search and product details
- Shopping cart and checkout
- Customer registration, login, and profile management
- Online ordering and order status tracking
- Inventory and stock management
- Order processing and fulfillment
- Walk-in sales recording
- Shipping rate management
- Sales reports and analytics
- Customer and staff account management
- Audit logs for administrative activities
- Role-based access to system features

## User Roles

SulitCart has three main user roles, each with different permissions and responsibilities.

### 1. Administrator

The administrator manages the overall system and store operations.

**Responsibilities and features:**
- View the store dashboard and sales overview.
- Add, edit, and manage products and categories.
- Monitor inventory levels and adjust stock.
- View and manage customer orders.
- Manage customer accounts and staff accounts.
- Configure shipping rates.
- Record and review walk-in sales.
- Access sales reports and analytics.
- Review audit logs of administrative activities.

### 2. Staff

Staff members handle daily store operations, order fulfillment, and in-store transactions.

**Responsibilities and features:**
- View the staff dashboard.
- View and process online orders.
- Update order statuses during fulfillment.
- Confirm, pack, and ship orders.
- Record walk-in sales.
- View relevant sales and order information.
- Manage their staff profile.

### 3. Customer

Customers use SulitCart to browse and purchase products online.

**Responsibilities and features:**
- Register for an account and log in.
- Browse available products and categories.
- View product details and prices.
- Add products to the shopping cart.
- Proceed to checkout.
- Place and view orders.
- Track order status.
- View and update their profile.
- Change their account password.

## Scope and Limitations

### System Scope

SulitCart covers online shopping and essential store management functions, including:

- **Product management:** Organizing products, categories, prices, and availability.
- **Order management:** Recording orders and tracking their fulfillment status.
- **Inventory management:** Monitoring product stock and recording inventory adjustments.
- **Sales management:** Recording online and walk-in sales.
- **User management:** Supporting administrator, staff, and customer accounts.
- **Shipping management:** Configuring delivery rates for the intended service area.
- **Reporting:** Providing sales summaries, reports, and analytics.
- **Security:** Using authentication and role-based database access policies.

### Location Scope

The system is designed primarily for local shopping and delivery within **Nueva Ecija, Philippines**, with Cabanatuan City serving as the main location reference.

Its delivery coverage depends on the shipping rates and service areas configured by the administrator. The system should not be considered a nationwide delivery platform unless additional locations and delivery arrangements are implemented.

### Limitations

- Delivery availability depends on the configured service area and shipping rates.
- Customers need an internet connection to use the web-based system and access its online services.
- Payment processing through an external payment gateway is not established as a completed feature.
- Product image storage and some backend integrations still require further development.
- Additional security, database permission, and integration testing are needed before production use.

## Technology Stack

SulitCart uses the following technologies:

| Technology | Purpose |
|---|---|
| React | Building the user interface and reusable components |
| TypeScript | Providing type support for the application entry points |
| JavaScript (JSX) | Implementing application logic and page components |
| Vite | Development server and production build tool |
| Tailwind CSS | Styling utilities and CSS integration |
| Custom CSS | Page layouts, responsive styling, and visual design |
| React Router | Navigation and routing between pages |
| Supabase | Backend services and database integration |
| Supabase Auth | User authentication and session management |
| PostgreSQL | Relational database for system records |
| Row Level Security (RLS) | Restricting database access according to user permissions |
| Supabase Edge Functions | Trusted server-side staff account operations |
| Lucide React | Icons and interface elements |
| npm | Package and dependency management |

## Project Structure

```text
SulitCart/
├── public/
│   └── images/                 # Product and promotional images
├── src/
│   ├── components/             # Reusable UI components
│   ├── context/                # Shared store and application state
│   ├── css/                    # Application stylesheets
│   ├── hooks/                  # Custom React hooks
│   ├── layouts/                # Store, admin, and staff layouts
│   ├── lib/                    # Supabase client configuration
│   ├── pages/
│   │   ├── admin/              # Administrator pages
│   │   ├── customer/           # Customer shopping pages
│   │   └── staff/              # Staff operation pages
│   ├── utils.js                # Shared utility functions
│   ├── App.tsx                 # Application routes
│   └── main.tsx                # Application entry point
├── supabase/
│   ├── schema.sql              # Database schema
│   ├── admin_operations.sql    # Database operations and policies
│   └── seed_accounts.sql       # Initial account role setup
├── .env.example                # Environment variable template
├── index.html                  # Main HTML document
├── package.json                # Dependencies and scripts
├── BACKEND_STATUS.md           # Backend integration status
├── SUPABASE_SETUP.md           # Backend setup instructions
└── README.md                   # Project documentation
```

## Installation and Setup

### Prerequisites

- Node.js
- npm
- A Supabase project
- Git

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd SulitCart
```

Replace `<YOUR_REPOSITORY_URL>` with the actual GitHub repository URL.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root using `.env.example` as a reference.

Configure the Supabase project URL and publishable key required by the application.

Never expose a Supabase service-role key or other secret credentials in frontend environment variables or commit them to GitHub.

### 4. Configure the Database

Open your Supabase project dashboard and use the SQL Editor to execute the database scripts in the order described in `SUPABASE_SETUP.md`.

Configure authentication, database permissions, and required Edge Functions according to the setup guide.

### 5. Start the Development Server

```bash
npm run dev
```

Open the local URL provided by Vite in your browser.

### 6. Build for Production

```bash
npm run build
```

To preview the production build locally, run:

```bash
npm run preview
```

## Order Processing Workflow

The standard order fulfillment workflow is:

**Pending → Confirmed → Packed → Shipped → Completed**

Orders may also be marked as cancelled when permitted by the implemented workflow and user permissions.

The exact cancellation rules should be verified against the current application logic and database policies.

## Database and Security

SulitCart uses Supabase for backend integration, including authentication, database operations, and access policies.

The database includes records for areas such as:

- User profiles
- Product categories
- Products
- Shipping rates
- Orders and order items
- Inventory transactions
- Audit logs

Row Level Security policies help restrict access to authorized users. Administrative operations and staff account provisioning require appropriate permissions and trusted server-side handling.

Before deploying the system for real transactions, test all three roles and verify that users cannot access or modify data outside their permissions.

## Development Status

SulitCart has implemented its core storefront, administrator interface, and staff interface, with Supabase integration for several authentication, catalog, inventory, order, and sales operations.

However, the project is still undergoing backend integration and requires additional testing before production use. Refer to `BACKEND_STATUS.md` and `SUPABASE_SETUP.md` for current implementation details and remaining tasks.

## Future Improvements

- Complete product image uploads using Supabase Storage.
- Complete and verify all database-backed features.
- Add automated tests for authentication, permissions, and order processing.
- Improve checkout and payment integration.
- Strengthen order cancellation and stock consistency rules.
- Expand configurable delivery coverage when needed.
- Improve reporting and sales analytics.
- Optimize the interface for mobile devices.

## Purpose of the Project

SulitCart aims to provide a convenient online shopping experience while helping local store owners manage products, orders, inventory, and sales in one system. By separating administrator, staff, and customer responsibilities, it supports more organized store operations and a simpler purchasing process.
