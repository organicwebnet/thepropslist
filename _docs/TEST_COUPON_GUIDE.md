# Test Coupon for Pro Version

This document explains how to create and use a test coupon that allows test users to access the Pro version features without payment.

## Overview

The test coupon (`TESTPRO100`) provides a 100% discount on the Pro plan subscription, allowing test users to:
- Test all Pro version features
- Verify subscription functionality
- Test upgrade flows
- Validate pro-specific limits and features

## Creating the Test Coupon

### Method 1: Using the Admin Panel (Recommended)

1. **Log in as Admin/God User**
   - Access the web app with admin or god role credentials

2. **Navigate to Admin Discount Codes**
   - Go to the Admin Discount Codes page

3. **Create New Discount Code**
   - Click "Create New Discount Code"
   - Fill in the following details:
     - **Code**: `TESTPRO100`
     - **Name**: `Test Pro Version - 100% Off`
     - **Description**: `Test coupon for test users to access pro version features. 100% discount for testing purposes.`
     - **Type**: `Percentage`
     - **Value**: `100`
     - **Currency**: `USD`
     - **Max Redemptions**: `1000` (or unlimited if you prefer)
     - **Valid From**: Current date
     - **Valid Until**: 1 year from now (or as needed)
     - **Active**: `Yes`
     - **Applies To**: `Specific Plans`
     - **Plan IDs**: `pro`

4. **Save**
   - The system will automatically create the Stripe coupon and promotion code

### Method 2: Using the Script

Run the provided script to create the Firestore record:

```bash
node scripts/create-test-pro-coupon.js
```

**Note**: The script creates the Firestore record, but you still need to create the Stripe coupon and promotion code. This is best done via the Admin Panel (Method 1).

### Method 3: Manual Stripe Creation

If you need to create the Stripe coupon manually:

1. **Create Stripe Coupon**
   - Go to Stripe Dashboard → Coupons
   - Create a new coupon:
     - **ID**: `TESTPRO100`
     - **Name**: `Test Pro Version - 100% Off`
     - **Discount**: `100% off`
     - **Duration**: `Once` or `Forever` (for testing)
     - **Max redemptions**: `1000` (optional)

2. **Create Promotion Code**
   - In the coupon details, create a promotion code:
     - **Code**: `TESTPRO100`
     - **Active**: `Yes`

3. **Update Firestore**
   - Update the discount code record in Firestore with:
     - `stripeCouponId`: The Stripe coupon ID
     - `stripePromotionCodeId`: The Stripe promotion code ID

## Using the Test Coupon

### For Test Users

1. **Navigate to Profile/Subscription Page**
   - Log in as a test user
   - Go to the Profile or Subscription page

2. **Select Pro Plan**
   - Choose the Pro plan subscription
   - Select monthly or yearly billing

3. **Enter Coupon Code**
   - In the discount code field, enter: `TESTPRO100`
   - The system will validate the code
   - You should see a confirmation that the code is valid

4. **Proceed to Checkout**
   - Click "Subscribe" or "Checkout"
   - You'll be redirected to Stripe checkout
   - The total should be $0.00 (100% discount)

5. **Complete Checkout**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Complete the checkout process

6. **Verify Pro Access**
   - After successful checkout, verify that:
     - User's plan is set to "pro"
     - Subscription status is "active"
     - All Pro features are accessible
     - Pro limits are applied correctly

## Test Coupon Details

- **Code**: `TESTPRO100`
- **Discount**: 100% off
- **Applies To**: Pro plan only
- **Max Redemptions**: 1000 (configurable)
- **Valid For**: 1 year from creation (configurable)

## Important Notes

1. **Test Environment Only**
   - This coupon should only be used in test/staging environments
   - Do not use in production

2. **Stripe Test Mode**
   - Ensure you're using Stripe test mode when testing
   - Use test card numbers for checkout

3. **Monitoring**
   - Monitor coupon usage in the Admin Discount Codes page
   - Check redemption count and usage analytics

4. **Security**
   - Keep the coupon code secure
   - Only share with authorized test users
   - Consider rotating the code periodically

## Troubleshooting

### Coupon Not Working

1. **Check Coupon Status**
   - Verify the coupon is active in Firestore
   - Check expiration date
   - Verify max redemptions haven't been reached

2. **Check Stripe Integration**
   - Verify Stripe coupon exists
   - Check promotion code is active
   - Ensure Stripe IDs are correctly linked in Firestore

3. **Check Plan Restriction**
   - Verify coupon applies to "pro" plan
   - Ensure user is subscribing to Pro plan

4. **Check Validation**
   - Test coupon validation in the UI
   - Check browser console for errors
   - Verify Firebase Functions are deployed

### Coupon Validation Errors

- **"Discount code not found"**: Coupon doesn't exist in Firestore
- **"Discount code is inactive"**: Set `active: true` in Firestore
- **"Discount code has expired"**: Update `validUntil` date
- **"Discount code has reached maximum redemptions"**: Increase `maxRedemptions` or reset `timesRedeemed`
- **"Discount code is not valid for this plan"**: Ensure `planIds` includes "pro"

## Related Documentation

- [Subscription Implementation Summary](../_docs/SUBSCRIPTION_IMPLEMENTATION_SUMMARY.md)
- [Discount Code Feature Review](../DISCOUNT_CODE_FEATURE_REVIEW.md)
- [Test Users Setup](../scripts/setup-test-users.js)

## Support

For issues or questions about the test coupon:
1. Check the Admin Discount Codes page for coupon status
2. Review Stripe Dashboard for coupon details
3. Check Firebase Functions logs for errors
4. Contact the development team

