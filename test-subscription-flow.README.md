# Subscription Flow Test

This test script verifies that the Stripe subscription model is working correctly and that users can access various subscription plans.

## Prerequisites

1. **Node.js**: Version 18 or higher
2. **Firebase Dependencies**: The test requires the Firebase web SDK
3. **Environment Variables**: Optional, but recommended for security

## Setup

### Option 1: Run from web-app directory (Recommended)
```bash
cd web-app
npm install  # Ensure Firebase dependencies are installed
node ../test-subscription-flow.js
```

### Option 2: Install dependencies locally
```bash
# Copy the package.json for the test
cp test-subscription-flow.package.json package.json
npm install
node test-subscription-flow.js
```

## Environment Variables (Optional)

Create a `.env` file in the project root with:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Optional: Override test price IDs
TEST_STARTER_PRICE_ID_MONTHLY=price_xxxxx
TEST_STANDARD_PRICE_ID_MONTHLY=price_xxxxx
TEST_PRO_PRICE_ID_MONTHLY=price_xxxxx
```

## What the Test Does

1. **Pricing Configuration Test**: Verifies that pricing plans are properly configured with Stripe price IDs
2. **User Authentication Test**: Creates a test user, signs them out, and signs them back in
3. **Subscription Access Test**: Tests access to subscription statistics
4. **Checkout Session Creation Test**: Creates a Stripe checkout session for the Starter plan
5. **Billing Portal Access Test**: Tests access to the Stripe billing portal

## Test Results

The test provides detailed output including:
- ✅ Pass/fail status for each test
- 📊 Test summary with success rate
- ❌ Detailed error messages for failed tests
- 🧹 Automatic cleanup of test users

## Expected Output

```
🧪 Starting Subscription Flow Tests...

📋 Testing Pricing Configuration...
✅ Found 4 pricing plans
  📦 Free (free):
    💰 Price: £0/month, £0/year
    🎯 Features: 7 features
    📊 Limits: 1 shows, 2 boards
  📦 Starter (starter):
    💰 Price: £9/month, £90/year
    🎯 Features: 7 features
    📊 Limits: 3 shows, 5 boards
    ✅ Monthly Price ID: price_1S978KIjHqAX3qiCDbwX5iKF
    ⚠️  Yearly Price ID: MISSING
✅ 3 paid plans have price IDs configured
✅ Pricing Configuration test passed

🔐 Testing User Authentication...
  Creating test user...
  ✅ User created: test-1234567890@thepropslist.com
  ✅ User signed out
  ✅ User signed in: test-1234567890@thepropslist.com
✅ User Authentication test passed

📊 Testing Subscription Access...
  ✅ Subscription stats accessible
  📈 Stats data: { ... }
✅ Subscription Access test passed

💳 Testing Checkout Session Creation...
  Creating checkout session for Starter plan...
  ✅ Checkout session created successfully
  🔗 Checkout URL: https://checkout.stripe.com/...
  Testing checkout with discount code...
  ✅ Checkout with discount code works
✅ Checkout Session Creation test passed

🏦 Testing Billing Portal Access...
  Creating billing portal session...
  ✅ Billing portal session created successfully
  🔗 Portal URL: https://billing.stripe.com/...
✅ Billing Portal Access test passed

🧹 Cleaning up test user...
  ✅ Test user deleted successfully
  ✅ User signed out

📊 Test Summary:
  ✅ Passed: 5
  ❌ Failed: 0
  📈 Success Rate: 100%

🎉 All tests passed! Subscription flow is working correctly.
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**: Ensure the user is properly authenticated
2. **Function Not Found**: Verify that Firebase functions are deployed
3. **Price ID Errors**: Check that Stripe price IDs are configured in Firebase functions config
4. **Module Import Errors**: Ensure you're running from the correct directory with proper dependencies

### Error Codes

- `functions/permission-denied`: Authentication or authorization issue
- `functions/not-found`: Function not deployed or incorrect name
- `functions/unavailable`: Firebase service unavailable
- `auth/email-already-in-use`: Test user already exists (try again)
- `auth/operation-not-allowed`: Email/password auth not enabled in Firebase console

## Security Notes

- The test creates and deletes temporary users
- Firebase config is included but should use environment variables in production
- Test uses Stripe test mode (test price IDs)
- No real payments are processed during testing



