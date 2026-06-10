import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { Shift, Transaction, Customer, Pump, Tank } from '../types';

// Ensure standard firebase app initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

interface GoogleWorkspaceContextType {
  googleUser: User | null;
  googleAccessToken: string | null;
  googleLoading: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signOutFromGoogle: () => Promise<void>;
  exportShiftToSheets: (shift: Shift, pumps: Pump[], tanks: Tank[]) => Promise<string>;
  exportTransactionsToSheets: (transactions: Transaction[]) => Promise<string>;
  exportCustomersToSheets: (customers: Customer[]) => Promise<string>;
  listReportFiles: () => Promise<Array<{ id: string; name: string; webViewLink: string; createdTime: string }>>;
  exporting: boolean;
  exportError: string | null;
}

const GoogleWorkspaceContext = createContext<GoogleWorkspaceContextType | undefined>(undefined);

export function useGoogleWorkspace() {
  const context = useContext(GoogleWorkspaceContext);
  if (!context) {
    throw new Error('useGoogleWorkspace must be used within a GoogleWorkspaceProvider');
  }
  return context;
}

export function GoogleWorkspaceProvider({ children }: { children: ReactNode }) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('google_access_token');
  });
  const [googleLoading, setGoogleLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Monitor auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setGoogleUser(user);
      if (!user) {
        setGoogleAccessToken(null);
        localStorage.removeItem('google_access_token');
      }
      setGoogleLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<User | null> => {
    setGoogleLoading(true);
    setExportError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Add requested scopes for Drive and Spreadsheets
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;

      if (token) {
        setGoogleAccessToken(token);
        localStorage.setItem('google_access_token', token);
      } else {
        throw new Error('No access token returned from Google authentication');
      }

      setGoogleUser(result.user);
      return result.user;
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setExportError(err.message || 'Failed to authenticate with Google');
      return null;
    } finally {
      setGoogleLoading(false);
    }
  };

  const signOutFromGoogle = async () => {
    setExportError(null);
    try {
      await signOut(auth);
      setGoogleUser(null);
      setGoogleAccessToken(null);
      localStorage.removeItem('google_access_token');
    } catch (err: any) {
      console.error('Logout failed:', err);
    }
  };

  // Helper: Retrieve or create a workspace directory inside Google Drive "Petrol Tracker Reports"
  const getOrCreateReportsFolder = async (token: string): Promise<string> => {
    // 1. Search for existing folder
    const searchUrl = 'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
      q: "name = 'Petrol Station Reports' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      spaces: 'drive',
      fields: 'files(id, name)'
    });

    const resSearch = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resSearch.ok) {
      throw new Error('Failed to query Google Drive directories');
    }

    const searchData = await resSearch.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // 2. Create the folder if it does not exist
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Petrol Station Reports',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!createRes.ok) {
      throw new Error('Unable to create Petrol Station Reports folder in Google Drive');
    }

    const folderData = await createRes.json();
    return folderData.id;
  };

  // Helper: Create a Google Sheet inside a folder and return its details
  const createSpreadsheetInFolder = async (token: string, title: string, folderId: string): Promise<{ id: string; url: string }> => {
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [folderId]
      })
    });

    if (!res.ok) {
      const errTxt = await res.text();
      console.error('Fail details:', errTxt);
      throw new Error('Failed to create spreadsheet file in Google Drive');
    }

    const file = await res.json();
    return {
      id: file.id,
      url: `https://docs.google.com/spreadsheets/d/${file.id}/edit`
    };
  };

  // Helper: Populate data inside specified spreadsheet range
  const updateSheetValues = async (token: string, spreadsheetId: string, range: string, values: any[][]) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Update Sheet Failure:', errText);
      throw new Error(`Failed to write values to sheet ${range}`);
    }
  };

  // 1. Export of Shift Audit
  const exportShiftToSheets = async (shift: Shift, pumps: Pump[], tanks: Tank[]): Promise<string> => {
    if (!googleAccessToken) {
      throw new Error('Not authorized. Please sign in with Google.');
    }

    setExporting(true);
    setExportError(null);

    try {
      const folderId = await getOrCreateReportsFolder(googleAccessToken);
      const title = `Shift Report - ${shift.attendantName} (${new Date(shift.startTime).toLocaleDateString()})`;
      const { id: spreadsheetId, url } = await createSpreadsheetInFolder(googleAccessToken, title, folderId);

      // Define standard formatting tables for our shift metrics
      const overviewTable = [
        ['PETROL STATION SHIFT TRANSACTION & COMPLIANCE REPORT', ''],
        ['Station ID / Terminal', 'Terminal 401 / Gasco Energy Ltd, Soroti'],
        ['Status', shift.status.toUpperCase()],
        ['Attendant ID', shift.attendantId],
        ['Attendant Name', shift.attendantName],
        ['Start Time', new Date(shift.startTime).toLocaleString()],
        ['End Time', shift.endTime ? new Date(shift.endTime).toLocaleString() : 'Active Session'],
        ['Total Shift Sales', shift.totalSales],
        ['Total Shift Expenses', shift.totalExpenses],
        ['Automated Calculated Tax (WHT/VAT)', shift.taxCalculated],
        ['Verified By Manager', shift.verifiedBy || 'N/A'],
        ['Verification Timestamp', shift.verifiedAt ? new Date(shift.verifiedAt).toLocaleString() : 'N/A'],
        ['Manager Notes', shift.notes || 'N/A']
      ];

      // Pump readings
      const pumpHeader = ['Pump Name', 'Fuel Type', 'Opening Meter (L)', 'Closing Meter (L)', 'Volume Sold (L)'];
      const pumpRows = pumps.map(pump => {
        const start = shift.startPumpReadings[pump.id] || 0;
        const end = shift.endPumpReadings[pump.id] || start;
        return [
          pump.name,
          pump.fuelType,
          start,
          end,
          Number((end - start).toFixed(2))
        ];
      });

      // Tank inventories
      const tankHeader = ['Tank Name', 'Fuel Type', 'Start Dip Level (L)', 'End Dip Level (L)', 'Capacity (L)', 'Low Threshold (L)'];
      const tankRows = tanks.map(tank => {
        const start = shift.dipLevelStart[tank.id] || 0;
        const end = shift.dipLevelEnd[tank.id] || 0;
        return [
          tank.name,
          tank.fuelType,
          start,
          end,
          tank.capacity,
          tank.lowThereshold
        ];
      });

      // Cash balancing & Payment method breakdown
      const revHeader = ['Payment Option / Source', 'Attendant Declared Amount', 'System Calculated Value', 'Variance / Balance discrepancy'];
      const revRows = Object.entries(shift.revenueBreakdown).map(([method, val]) => {
        const declared = shift.attendantCounts?.[method as any] ?? val;
        const variance = shift.varianceBreakdown?.[method as any] ?? 0;
        return [
          method.replace('_', ' ').toUpperCase(),
          declared,
          val,
          variance
        ];
      });

      // Write Overview
      await updateSheetValues(googleAccessToken, spreadsheetId, 'Sheet1!A1', overviewTable);
      
      // Write Pumps Table
      const pumpStartIdx = overviewTable.length + 3;
      await updateSheetValues(googleAccessToken, spreadsheetId, `Sheet1!A${pumpStartIdx}`, [
        ['PUMP METERS READING SUMMARY', '', '', '', ''],
        pumpHeader,
        ...pumpRows
      ]);

      // Write Tanks Table
      const tankStartIdx = pumpStartIdx + pumpRows.length + 4;
      await updateSheetValues(googleAccessToken, spreadsheetId, `Sheet1!A${tankStartIdx}`, [
        ['TANK INVENTORIES COMPLIANCE', '', '', '', '', ''],
        tankHeader,
        ...tankRows
      ]);

      // Write Revenue Table
      const revStartIdx = tankStartIdx + tankRows.length + 4;
      await updateSheetValues(googleAccessToken, spreadsheetId, `Sheet1!A${revStartIdx}`, [
        ['REVENUE DECLARED BALANCE SUMMARY (BLIND BALANCING CHECK)', '', '', ''],
        revHeader,
        ...revRows
      ]);

      return url;
    } catch (err: any) {
      console.error('Failed to export shift audit:', err);
      setExportError(err.message || 'Failed to sync with Google Sheets');
      throw err;
    } finally {
      setExporting(false);
    }
  };

  // 2. Export of Transaction list
  const exportTransactionsToSheets = async (transactions: Transaction[]): Promise<string> => {
    if (!googleAccessToken) {
      throw new Error('Not authorized. Please sign in with Google.');
    }

    setExporting(true);
    setExportError(null);

    try {
      const folderId = await getOrCreateReportsFolder(googleAccessToken);
      const title = `Station Transactions Export - ${new Date().toLocaleDateString()}`;
      const { id: spreadsheetId, url } = await createSpreadsheetInFolder(googleAccessToken, title, folderId);

      const header = [
        'Transaction ID', 
        'Date & Time', 
        'Shift ID', 
        'Attendant Name', 
        'Transaction Type', 
        'Category', 
        'Payment Method', 
        'Base Amount (KES)', 
        'Fuel Litres Sold', 
        'Linked Customer/CRM', 
        'Selected Currency', 
        'Notes'
      ];

      const rows = transactions.map(tx => [
        tx.id,
        new Date(tx.timestamp).toLocaleString(),
        tx.shiftId,
        tx.attendantName,
        tx.type.toUpperCase(),
        tx.category.toUpperCase(),
        tx.paymentMethod.replace('_', ' ').toUpperCase(),
        tx.amount,
        tx.quantity || 'N/A',
        tx.customerName || 'N/A',
        tx.currency || 'UGX',
        tx.notes || ''
      ]);

      await updateSheetValues(googleAccessToken, spreadsheetId, 'Sheet1!A1', [
        ['STATION REALTIME SYSTEM TRANSACTIONS EXPORT', '', '', '', '', '', '', '', '', '', '', ''],
        ['Report Generated At', new Date().toLocaleString(), '', '', '', '', '', '', '', '', '', ''],
        [],
        header,
        ...rows
      ]);

      return url;
    } catch (err: any) {
      console.error('Failed to export transaction list:', err);
      setExportError(err.message || 'Failed to sync transactions to Google Sheets');
      throw err;
    } finally {
      setExporting(false);
    }
  };

  // 3. Export of prepaid Customers
  const exportCustomersToSheets = async (customers: Customer[]): Promise<string> => {
    if (!googleAccessToken) {
      throw new Error('Not authorized. Please sign in with Google.');
    }

    setExporting(true);
    setExportError(null);

    try {
      const folderId = await getOrCreateReportsFolder(googleAccessToken);
      const title = `Customer CRM Ledger - ${new Date().toLocaleDateString()}`;
      const { id: spreadsheetId, url } = await createSpreadsheetInFolder(googleAccessToken, title, folderId);

      const header = [
        'Customer ID', 
        'Customer Name', 
        'Phone Number', 
        'Email Address', 
        'Company Name', 
        'Prepaid Deposit Balance (KES)', 
        'Credit Limit', 
        'Credit Balance / Active Debt', 
        'Bonus Loyalty Points', 
        'Tier Group', 
        'Registered Date'
      ];

      const rows = customers.map(c => [
        c.id,
        c.name,
        c.phone,
        c.email || 'N/A',
        c.companyName || 'N/A',
        c.depositBalance,
        c.creditLimit,
        c.creditBalance,
        c.bonusPoints,
        c.tier,
        new Date(c.createdAt).toLocaleDateString()
      ]);

      await updateSheetValues(googleAccessToken, spreadsheetId, 'Sheet1!A1', [
        ['PREPAID & LOYALTY CUSTOMER ADVANCED CRM LEDGER', '', '', '', '', '', '', '', '', '', ''],
        ['Ledger Synced Time', new Date().toLocaleString(), '', '', '', '', '', '', '', '', ''],
        [],
        header,
        ...rows
      ]);

      return url;
    } catch (err: any) {
      console.error('Failed to export customers directory:', err);
      setExportError(err.message || 'Failed to sync CRM directory to Google Sheets');
      throw err;
    } finally {
      setExporting(false);
    }
  };

  // 4. List synched files overview from drive folder
  const listReportFiles = async (): Promise<Array<{ id: string; name: string; webViewLink: string; createdTime: string }>> => {
    if (!googleAccessToken) return [];
    try {
      const folderId = await getOrCreateReportsFolder(googleAccessToken);
      const searchUrl = 'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, webViewLink, createdTime)',
        orderBy: 'createdTime desc'
      });

      const res = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve spreadsheet lists');
      }

      const data = await res.json();
      return data.files || [];
    } catch (err) {
      console.error('Error listing dynamic files', err);
      return [];
    }
  };

  return (
    <GoogleWorkspaceContext.Provider value={{
      googleUser,
      googleAccessToken,
      googleLoading,
      signInWithGoogle,
      signOutFromGoogle,
      exportShiftToSheets,
      exportTransactionsToSheets,
      exportCustomersToSheets,
      listReportFiles,
      exporting,
      exportError
    }}>
      {children}
    </GoogleWorkspaceContext.Provider>
  );
}
