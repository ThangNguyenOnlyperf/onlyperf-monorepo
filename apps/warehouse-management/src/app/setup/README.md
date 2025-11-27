# Setup Route - `/setup`

## Purpose
Initial system setup wizard for creating the admin account when the warehouse management system is first deployed.

## Features

### First-Time Setup
- Creates the initial admin user account
- Required before any other system functionality
- Automatically redirects to signin page after completion
- Only accessible when no admin accounts exist

### Setup Form
- Email input (required)
- Password input (required, min 8 characters)
- Name input (required)
- Account validation
- Secure password handling

## User Flow

```
1. User visits any route
   ↓
2. System checks if admin exists
   ↓
3. If no admin → Redirect to /setup
   ↓
4. User fills in admin credentials
   ↓
5. System creates admin account with role="admin"
   ↓
6. Redirect to /signin
   ↓
7. Admin logs in and begins system configuration
```

## Technical Details

### Server Actions
- `getSetupState()` - Check if setup is needed
- `createAdminUser()` - Create initial admin account

### Validation
- Email format validation
- Password strength requirements
- Duplicate email prevention

### Security
- Password hashing via Better Auth
- Admin role automatically assigned
- One-time setup process

### Component Structure
```
/setup/page.tsx          # Server component (redirect logic)
  └── SetupForm          # Client component (form UI)
```

## Environment Variables
```env
BETTER_AUTH_SECRET=...   # Required for authentication
BETTER_AUTH_URL=...      # App URL
```

## After Setup

Once setup is complete:
1. Admin can sign in at `/signin`
2. Admin should configure:
   - Storage locations (`/storages`)
   - Product catalog (`/products`)
   - Suppliers/providers
3. System is ready for inbound/outbound operations

## Related Routes
- `/signin` - Login after setup
- `/admin/users` - Manage additional users
- `/storages` - Configure warehouses
