# Google Sheets Lead Collection Setup for F1 Navigator

Follow these 4 simple steps to connect your **F1 Navigator** to a live, free Google Sheet. Whenever anyone on any device fills out their details or requests their report, a new row will automatically appear in your Google Sheet in real time.

---

### Step 1: Create Your Google Sheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it **"F1 Navigator Candidate Leads"** (or any name you prefer).
3. In Row 1, add these column headers (optional, for readability):
   - **A1**: `Timestamp`
   - **B1**: `Full Name`
   - **C1**: `Email Address`
   - **D1**: `Citizenship`
   - **E1**: `Degree Level`
   - **F1**: `Major`
   - **G1**: `Target Pathway`
   - **H1**: `Graduation Date`
   - **I1**: `OPT / EAD Start`
   - **J1**: `Liquid Savings ($)`

---

### Step 2: Add the Google Apps Script
1. In your Google Sheet top menu, click **Extensions** &rarr; **Apps Script**.
2. Delete any existing code in the editor (`function myFunction() {...}`) and paste this exact code:

```javascript
function doGet(e) {
  return ContentService.createTextOutput("F1 Navigator Webhook is Active!").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var email = (data.email || '').trim().toLowerCase();
    
    var lastRow = sheet.getLastRow();
    var foundRow = -1;
    
    // Check if candidate email already exists in Column C (Columns: A=1, B=2, C=3)
    if (lastRow > 1 && email && email !== 'n/a') {
      var emailValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
      for (var i = 0; i < emailValues.length; i++) {
        if (emailValues[i][0].toString().trim().toLowerCase() === email) {
          foundRow = i + 2; // +2 for 1-based index and header row
          break;
        }
      }
    }
    
    var rowData = [
      new Date(),
      data.fullName || 'Anonymous Candidate',
      data.email || 'N/A',
      data.nationality || 'Pending Selection',
      data.degreeLevel || "Master's",
      data.major || 'STEM Field',
      data.selectedPathway || 'In Progress',
      data.graduationDate || 'Not specified',
      data.optStartDate || 'Pending EAD',
      data.liquidSavings || 0
    ];
    
    if (foundRow > 0) {
      // Update existing row in place (prevents multiple duplicate rows for the same person!)
      sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // First time candidate entered details: create new row
      sheet.appendRow(rowData);
    }
    
    // Send candidate their Strategic Roadmap when requested in Step 4
    if (data.sendEmail && data.email && data.email.indexOf('@') !== -1) {
      var subject = "Your F1 Navigator Strategic Roadmap - " + (data.selectedPathway || 'Visa Plan');
      var body = "Hi " + (data.fullName || "there") + ",\n\n" +
        "Here is your personalized U.S. immigration roadmap from F1 Navigator:\n\n" +
        "• Target Visa Pathway: " + data.selectedPathway + "\n" +
        "• Degree & Field: " + data.degreeLevel + " in " + data.major + "\n" +
        "• Citizenship: " + data.nationality + "\n" +
        "• Graduation Date: " + data.graduationDate + "\n" +
        "• OPT / EAD Status: " + data.optStartDate + "\n\n" +
        "Key Next Steps:\n" +
        "1. Verify your filing window (90 days prior to graduation for initial OPT Form I-765).\n" +
        "2. Review the evidentiary criteria or bilateral treaty guidelines for " + data.selectedPathway + ".\n" +
        "3. Consult with your DSO or qualified immigration counsel before submitting official USCIS petitions.\n\n" +
        "Best regards,\n" +
        "F1 Navigator Strategy Team\nINVISA";
        
      MailApp.sendEmail({
        to: data.email,
        subject: subject,
        body: body
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      action: foundRow > 0 ? "updated" : "inserted",
      emailSent: !!data.sendEmail
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click the **Save** icon (diskette icon) or press `Cmd + S` / `Ctrl + S`.

---

### Step 3: Deploy as a Web App
1. In the top right of the Apps Script window, click the blue **Deploy** button &rarr; **New deployment**.
2. Click the gear icon (**Select type**) next to "Select type" and choose **Web app**.
3. Configure the fields:
   - **Description**: `F1 Navigator Leads Webhook`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` *(Crucial: This allows candidates on external devices to send their submissions without needing to log in to Google)*.
4. Click **Deploy**.
5. Google will ask you to **Authorize access**:
   - Click *Authorize access*, select your Google Account.
   - Click *Advanced* &rarr; Click *Go to Untitled project (unsafe)* &rarr; Click *Allow*.
6. Copy the generated **Web app URL** (it looks like: `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 4: Paste Your Web App URL in `js/app.js`
Open [`js/app.js`](file:///Users/shreensharma/Desktop/INVISA/F1Navigator/js/app.js#L6) and paste your copied URL into line 6:

```javascript
// Google Sheets Web App Endpoint (Paste your deployed Google Apps Script URL here)
export const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

Save the file. **You're done!**

---

### How it Works
- When a candidate fills their Name/Email in Step 1 and calculates their options, or clicks **"✉ Email & Save Roadmap"** in Step 4, F1 Navigator immediately posts their profile and pathway in real time to your Google Sheet.
- It works seamlessly across all devices, mobile phones, and external networks without any server, database subscription, or recurring costs.
