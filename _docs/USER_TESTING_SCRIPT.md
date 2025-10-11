# Props Bible Application - Comprehensive User Testing Script

## 🎯 **Testing Objectives**

This script will help you test the Props Bible application to ensure:
1. Different user roles see appropriate prop information
2. Quick actions work correctly for each role
3. CSV import functionality works properly
4. The UI is intuitive and responsive
5. All features function as expected

## 📋 **Pre-Test Setup**

### **1. Create Test Users with Different Roles**

You'll need to create test users with the following roles:
- **God User** (full access)
- **Props Supervisor** (show management)
- **Stage Manager** (operational focus)
- **Prop Maker** (construction focus)
- **Art Director** (design/budget focus)
- **Assistant Stage Manager** (logistics focus)
- **Props Supervisor Assistant** (assistant role)
- **Viewer** (read-only)

### **2. Create Test Props**

Create at least 5-10 test props with various:
- Categories (furniture, hand props, set dressing, etc.)
- Statuses (available_in_storage, in_use_on_set, under_maintenance, etc.)
- Locations (Storage Room A, Backstage Left, On Stage, etc.)
- Different field values (prices, materials, maintenance notes, etc.)

### **3. Test Environment**

- Use a dedicated test show/production
- Ensure you have props with different statuses and locations
- Have at least one prop with images
- Include props with maintenance notes and safety information
- Prepare test CSV files with various data formats for import testing

---

## 🧪 **Test Scenarios**

### **Test 1: Role-Based Data Visibility**

**Objective**: Verify that each role sees appropriate prop information

#### **Steps for Each Role:**

1. **Log in as the test user**
2. **Navigate to the props list**
3. **Verify the role indicator** shows the correct role name
4. **Check visible fields** for each prop card:
   - Are the fields appropriate for the role?
   - Are sensitive fields (like prices) hidden for non-financial roles?
   - Are operational fields (like locations) visible for operational roles?

#### **Expected Results by Role:**

| Role | Should See | Should NOT See |
|------|------------|----------------|
| **Stage Manager** | Location, Status, Act/Scene, Safety Notes, Maintenance Notes | Prices, Replacement Costs, Purchase URLs |
| **Prop Maker** | Materials, Dimensions, Special Requirements, Construction Notes | Financial info, Location details, Act/Scene |
| **Art Director** | Images, Prices, Source, Design Requirements, Budget info | Maintenance, Location, Technical details |
| **Props Supervisor** | Everything (full access) | Nothing hidden |
| **God User** | Everything + System controls | Nothing hidden |
| **Viewer** | Basic info only (Name, Description, Category, Status, Images) | Most detailed fields |

#### **Pass Criteria:**
- ✅ Role indicator displays correctly
- ✅ Appropriate fields are visible/hidden based on role
- ✅ No sensitive information is exposed to unauthorized roles
- ✅ All visible fields contain expected data

---

### **Test 2: Quick Actions Functionality**

**Objective**: Verify that quick actions work correctly and show appropriate options

#### **Steps:**

1. **Log in as each test role**
2. **Navigate to props list**
3. **Click on a prop card** to see quick actions
4. **Test each available quick action:**
   - Click the action button
   - Verify the modal opens (if applicable)
   - Enter test data
   - Submit the action
   - Verify success message

#### **Quick Actions by Role:**

| Role | Available Actions |
|------|------------------|
| **Stage Manager** | Update Location, Add Maintenance Note, Report Issue, Mark Ready |
| **Prop Maker** | Update Status, Add Note, Upload Image, Request Materials |
| **Art Director** | Update Description, Add Image, Update Price, Find Source |
| **Props Supervisor** | All actions + Edit Prop, Delete Prop, Duplicate Prop, Export Data |
| **God User** | All actions + Manage System, Customize Views |
| **Viewer** | View Details only |

#### **Test Each Action:**

**A. Update Status**
- Click "Update Status" button
- Verify status transition logic works
- Check success message shows old → new status

**B. Add Note**
- Click "Add Note" button
- Verify modal opens with text input
- Enter test note: "Test note from [role]"
- Submit and verify success message

**C. Update Location**
- Click "Update Location" button
- Verify location picker modal opens
- Select a predefined location or enter custom location
- Submit and verify success message

**D. Add Maintenance Note**
- Click "Add Maintenance Note" button
- Verify modal opens with multiline input
- Enter test maintenance note
- Submit and verify success message

**E. Report Issue**
- Click "Report Issue" button
- Verify modal opens with issue description input
- Enter test issue description
- Submit and verify success message

#### **Pass Criteria:**
- ✅ Correct quick actions are available for each role
- ✅ Modals open and close properly
- ✅ Input validation works (empty fields, character limits)
- ✅ Success messages display correctly
- ✅ Actions complete without errors

---

### **Test 3: UI/UX and Performance**

**Objective**: Verify the interface is intuitive and performs well

#### **Steps:**

1. **Test Navigation**
   - Navigate between different sections
   - Verify role indicator remains visible
   - Check that prop cards load correctly

2. **Test Responsiveness**
   - Resize browser window (web)
   - Test on different screen sizes
   - Verify mobile responsiveness

3. **Test Loading States**
   - Refresh the page with slow network
   - Verify loading indicators appear
   - Check error handling for network issues

4. **Test Accessibility**
   - Use keyboard navigation
   - Check focus management
   - Verify screen reader compatibility

#### **Pass Criteria:**
- ✅ Interface is intuitive and easy to navigate
- ✅ Loading states are clear and informative
- ✅ Error messages are helpful and actionable
- ✅ Performance is acceptable with large prop lists
- ✅ Accessibility features work correctly

---

### **Test 4: Edge Cases and Error Handling**

**Objective**: Verify the system handles edge cases gracefully

#### **Test Scenarios:**

1. **No Props**
   - Create a show with no props
   - Verify empty state message displays correctly

2. **Network Issues**
   - Disconnect internet during action
   - Verify appropriate error messages
   - Check that actions can be retried

3. **Invalid Data**
   - Try to submit empty forms
   - Enter extremely long text
   - Verify validation messages

4. **Role Changes**
   - Change user role during session
   - Verify UI updates appropriately
   - Check that cached data is cleared

#### **Pass Criteria:**
- ✅ Empty states are handled gracefully
- ✅ Network errors show helpful messages
- ✅ Input validation prevents invalid submissions
- ✅ Role changes update the UI correctly

---

### **Test 5: CSV Import Functionality**

**Objective**: Verify that CSV import works correctly with proper data validation and user feedback

#### **Test Scenarios:**

**A. Basic CSV Import**
1. **Navigate to Props List page**
2. **Click "Import Props" button**
3. **Verify redirect to import page** (`/props/import`)
4. **Test file upload:**
   - Click "Choose File" button
   - Select a valid CSV file
   - Verify file name appears
   - Check that column mapping interface loads

**B. Column Mapping**
1. **Verify auto-detection works:**
   - Upload CSV with standard column names (name, description, category, etc.)
   - Check that columns are automatically mapped
   - Verify "Name" column is marked as required
2. **Test manual mapping:**
   - Upload CSV with non-standard column names
   - Manually map columns using dropdowns
   - Verify mapping is saved correctly

**C. Data Preview**
1. **Click "Show Preview" button**
2. **Verify preview table displays:**
   - First 10 rows of data
   - Properly formatted prop information
   - Correct column headers
3. **Check data accuracy:**
   - Compare preview data with original CSV
   - Verify data types are correct (numbers, text, etc.)

**D. Import Process**
1. **Click "Import Props" button**
2. **Verify import process:**
   - Loading indicator appears
   - Progress is shown (if applicable)
   - Success message displays with count
3. **Check imported data:**
   - Navigate back to props list
   - Verify new props appear
   - Check that data matches CSV content

**E. Error Handling**
1. **Test invalid files:**
   - Upload non-CSV file (should be rejected)
   - Upload empty CSV file
   - Upload CSV with no data rows
2. **Test validation errors:**
   - Upload CSV without name column
   - Upload CSV with invalid data types
   - Verify appropriate error messages

**F. Template and AI Prompt**
1. **Test template download:**
   - Click "Download template" link
   - Verify CSV template downloads
   - Check template has correct headers
2. **Test AI prompt:**
   - Click "Copy AI prompt" button
   - Verify prompt is copied to clipboard
   - Check prompt contains helpful instructions

#### **Test Files to Prepare:**

**Valid CSV Files:**
```csv
name,description,category,quantity,price,act,scene,tags,location,status,imageUrl
"Wooden Chair","Victorian style chair",Furniture,1,150,1,1,"period,wooden",Storage Room A,available_in_storage,
"Silver Sword","Medieval prop sword",Weapon,1,75,2,3,"metal,sharp",Prop Storage,available_in_storage,
"Red Curtain","Stage curtain",Set Dressing,2,200,,,"fabric,red",Backstage,available_in_storage,
```

**Invalid CSV Files:**
- File with no name column
- File with invalid data types
- Empty file
- File with too many rows (>1000)

#### **Pass Criteria:**
- ✅ Import page loads correctly
- ✅ File upload works with proper validation
- ✅ Column mapping interface functions properly
- ✅ Data preview shows accurate information
- ✅ Import process completes successfully
- ✅ Imported props appear in props list
- ✅ Error handling works for invalid inputs
- ✅ Template download and AI prompt work correctly

---

### **Test 6: Cross-Platform Consistency**

**Objective**: Verify consistent behavior across web and mobile

#### **Steps:**

1. **Test on Web Browser**
   - Complete all test scenarios on web
   - Note any issues or differences

2. **Test on Mobile App**
   - Complete the same test scenarios on mobile
   - Compare behavior with web version

3. **Compare Results**
   - Verify same data is shown
   - Check that quick actions work identically
   - Ensure UI is appropriate for each platform

#### **Pass Criteria:**
- ✅ Same data is displayed on both platforms
- ✅ Quick actions work identically
- ✅ UI is optimized for each platform
- ✅ No platform-specific bugs

---

## 📊 **Test Results Template**

### **Test Results for [Role Name]**

**Date**: ___________  
**Tester**: ___________  
**Platform**: Web / Mobile / Both  

#### **Test 1: Data Visibility**
- [ ] Role indicator displays correctly
- [ ] Appropriate fields are visible
- [ ] Sensitive fields are hidden
- [ ] All visible fields contain data

**Issues Found**: ________________________________

#### **Test 2: Quick Actions**
- [ ] Correct actions are available
- [ ] Modals open/close properly
- [ ] Input validation works
- [ ] Success messages display
- [ ] No errors occur

**Issues Found**: ________________________________

#### **Test 3: UI/UX**
- [ ] Interface is intuitive
- [ ] Loading states work
- [ ] Error handling is good
- [ ] Performance is acceptable
- [ ] Accessibility works

**Issues Found**: ________________________________

#### **Test 4: CSV Import**
- [ ] Import page loads correctly
- [ ] File upload works properly
- [ ] Column mapping functions correctly
- [ ] Data preview is accurate
- [ ] Import process completes successfully
- [ ] Error handling works for invalid inputs
- [ ] Template download works
- [ ] AI prompt copy works

**Issues Found**: ________________________________

#### **Overall Assessment**
**Pass/Fail**: ___________  
**Notes**: ________________________________

---

## 🐛 **Bug Reporting Template**

### **Bug Report**

**Title**: [Brief description]  
**Severity**: Critical / High / Medium / Low  
**Platform**: Web / Mobile / Both  
**Role**: [Which role was being tested]  

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**: 

**Actual Result**: 

**Screenshots**: [If applicable]

**Additional Notes**: 

---

## ✅ **Sign-off Checklist**

Before considering testing complete, verify:

- [ ] All roles have been tested
- [ ] All quick actions have been tested
- [ ] CSV import functionality has been tested
- [ ] Both web and mobile platforms tested
- [ ] Edge cases and error handling verified
- [ ] Performance is acceptable
- [ ] No critical bugs remain
- [ ] Documentation is updated
- [ ] Stakeholders have reviewed results

---

## 📞 **Support and Questions**

If you encounter issues during testing:

1. **Check the console** for error messages
2. **Try refreshing** the page/app
3. **Clear browser cache** if on web
4. **Document the issue** using the bug report template
5. **Contact the development team** with detailed information

**Remember**: This is a testing environment - feel free to experiment and try different scenarios to ensure the system is robust and user-friendly!
