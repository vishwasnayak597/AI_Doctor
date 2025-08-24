# 🎥 Video Call Notification System - Production Fix & Test Guide

## 📋 **Current Issue**
- Doctor starts video call → Patient doesn't receive popup notifications to join

## 🔍 **How the System Should Work**

### **Backend Flow:**
1. **Doctor starts call** → `POST /api/video-calls/` with `appointmentId`
2. **Backend updates appointment** → Sets status to 'confirmed' + adds `videoCallId`/`videoCallUrl`
3. **Patient polls for calls** → `GET /api/video-calls/active` every 15 seconds
4. **Backend finds active call** → `VideoCallService.getActiveCallForPatient()`
5. **Patient gets notification** → Popup appears on dashboard

### **Frontend Flow:**
1. **Patient dashboard loads** → Starts polling `/api/video-calls/active`
2. **Active call detected** → `setActiveVideoCallInvitation(callData)`
3. **Popup renders** → Green banner with "Join Call Now" button
4. **Patient clicks join** → Opens `/video-call/{appointmentId}`

## 🚀 **Manual Testing Steps (Production)**

### **Step 1: Create Test Video Appointment**
1. **Patient Login**: Go to https://ai-doctor-qc2b.onrender.com/auth/login
   - Email: `testpatient@demo.com`
   - Password: `TestPatient123!`

2. **Book Video Appointment**: 
   - Go to "Find Doctors" tab
   - Search for "Dr. Vishwas Nayak" (Gastroenterology)
   - Book a video consultation for today/tomorrow

### **Step 2: Test Video Call Notifications**
1. **Doctor Login** (New Browser/Tab): https://ai-doctor-qc2b.onrender.com/auth/login
   - Email: `newtestdoctor@demo.com` 
   - Password: `TestDoc123!`

2. **Start Video Call** (Doctor):
   - Go to doctor dashboard → Appointments section
   - Find the video appointment with test patient
   - Click "Start Video Call" button

3. **Check Patient Notifications** (Patient Tab):
   - Should see green popup banner within 15 seconds
   - Banner should show: "🎥 Dr. Vishwas Nayak is calling you!"
   - Should have "Join Call Now" button

## 🔧 **If Notifications DON'T Work - Debugging Steps**

### **Debug 1: Check Browser Console (Patient Dashboard)**
Open Developer Tools → Console tab and look for:
- ✅ **Good**: `🎥 Active video call found:` {callData}
- ❌ **Bad**: `Error checking for active video calls:` {error}
- ❌ **Bad**: `401 Unauthorized` or `404 Not Found`

### **Debug 2: Check Network Tab (Patient Dashboard)**  
1. Open Developer Tools → Network tab
2. Filter by: `/video-calls/active`
3. Look for requests every 15 seconds
4. Check response status and data

### **Debug 3: Verify Backend API (Direct Test)**
```bash
# Test if patient can see active calls
curl -X GET https://ai-doctor-qc2b.onrender.com/api/video-calls/active \
  -H "Authorization: Bearer PATIENT_TOKEN" \
  -H "Content-Type: application/json"
```

## 🛠️ **Potential Fixes**

### **Fix 1: Authentication Issues**
If getting 401 errors, the patient might need to refresh their token:
- **Patient**: Log out and log back in
- Check if JWT token expired

### **Fix 2: Appointment Time Window**
The system only shows active calls within a time window:
- **Backend checks**: Last 2 hours → Next 4 hours
- Make sure appointment date/time is within this range

### **Fix 3: Appointment Status**
Video calls only work when:
- `consultationType` = 'video'
- `status` = 'confirmed' (set when doctor starts call)
- `videoCallId` exists

### **Fix 4: Missing Backend Route**
If getting 404 errors, check if the route exists:
- Route: `GET /api/video-calls/active`
- Should be in: `backend/src/routes/video-calls.ts`

## ⚡ **Quick Test Commands**

### **Test Patient Active Calls (Production)**
```javascript
// Run in patient browser console
fetch('/api/video-calls/active', {
  headers: { 
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Active calls:', data))
```

### **Test Doctor Start Call (Production)**
```javascript
// Run in doctor browser console (replace APPOINTMENT_ID)
fetch('/api/video-calls', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ appointmentId: 'APPOINTMENT_ID' })
})
.then(r => r.json())
.then(data => console.log('Video call started:', data))
```

## 📊 **Expected Results**

### **✅ Working System:**
1. Doctor starts call → Console shows "Video call started"
2. Patient polls → Console shows "Active video call found"  
3. Patient sees green popup → "Dr. [Name] is calling you!"
4. Clicking "Join Call Now" → Opens video call page

### **❌ Broken System Symptoms:**
- Patient console: "Error checking for active video calls"
- Network tab: 401/404 errors on `/video-calls/active`
- No popup appears after doctor starts call
- Polling stops due to consecutive errors

## 🏆 **Final Verification**
✅ Test patient receives popup within 15 seconds of doctor starting call  
✅ Popup shows correct doctor name and appointment info  
✅ "Join Call Now" button works and opens video call page  
✅ Multiple patients can receive notifications for their own appointments

---

## 🚨 **Current Status**
- ✅ **Backend routes exist**: `/api/video-calls/` and `/api/video-calls/active`
- ✅ **Frontend polling works**: Patient dashboard polls every 15 seconds
- ✅ **Login system works**: Both test accounts functional
- ❓ **Need to test**: End-to-end video call notification flow

**Next Step**: Manual testing in production using the steps above! 🚀 