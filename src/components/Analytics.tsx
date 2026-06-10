import { useState, useEffect, FormEvent } from 'react';
import { useStore } from '../services/store';
import { useGoogleWorkspace } from '../services/googleWorkspace';
import { FuelType, PaymentMethod, TransactionCategory } from '../types';
import { 
  TrendingUp, 
  Coins, 
  Fuel, 
  AlertCircle, 
  RefreshCw, 
  BarChart2, 
  PlusCircle, 
  UserPlus, 
  Trash2,
  CheckCircle,
  ExternalLink,
  FileSpreadsheet,
  CloudLightning,
  ShieldAlert,
  FolderOpen
} from 'lucide-react';

export default function Analytics() {
  const {
    tanks,
    transactions,
    currentUser,
    updatePrice,
    addStaffMember,
    resetAllData,
    staff,
    customers,
  } = useStore();

  const {
    googleUser,
    googleAccessToken,
    signInWithGoogle,
    signOutFromGoogle,
    exportTransactionsToSheets,
    exportCustomersToSheets,
    listReportFiles,
    exporting: workspaceExporting,
    exportError: workspaceError,
  } = useGoogleWorkspace();

  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [workspaceInfoMsg, setWorkspaceInfoMsg] = useState<string>('');

  useEffect(() => {
    if (googleAccessToken) {
      listReportFiles()
        .then(files => setDriveFiles(files))
        .catch(err => console.error('Error listing Google drive report files:', err));
    } else {
      setDriveFiles([]);
    }
  }, [googleAccessToken]);

  const handleBackupTransactions = async () => {
    if (transactions.length === 0) {
      setWorkspaceInfoMsg('No transactions to backup.');
      return;
    }
    setWorkspaceInfoMsg('');
    try {
      const url = await exportTransactionsToSheets(transactions);
      setWorkspaceInfoMsg('Transactions ledger successfully exported to Google Sheets!');
      // refresh lists
      const files = await listReportFiles();
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleBackupCustomers = async () => {
    if (customers.length === 0) {
      setWorkspaceInfoMsg('No loyalty customers to backup.');
      return;
    }
    setWorkspaceInfoMsg('');
    try {
      const url = await exportCustomersToSheets(customers);
      setWorkspaceInfoMsg('Prepaid CRM directory successfully backed up to Google Sheets!');
      const files = await listReportFiles();
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
    }
  };

  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [newPriceVal, setNewPriceVal] = useState<string>('');

  // Manager staff addition states
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'manager' | 'attendant'>('attendant');
  const [staffPin, setStaffPin] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

  // 1. Core Financial Aggregates
  const salesTx = transactions.filter((t) => t.type === 'sale');
  const expenseTx = transactions.filter((t) => t.type === 'expense');

  const totalSales = salesTx.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTx.reduce((sum, t) => sum + t.amount, 0);
  const netRevenue = totalSales - totalExpenses;

  // Accrued tax calculations (VAT 16% + Fuel Levy 5% = ~21% on basic sales)
  const accruedTaxes = (totalSales * (0.21 / 1.21));

  // 2. Sales Sourced by Mode Breakdown
  const methodTotals: Record<PaymentMethod, number> = {
    cash: salesTx.filter((t) => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.amount, 0),
    mobile_money: salesTx.filter((t) => t.paymentMethod === 'mobile_money').reduce((sum, t) => sum + t.amount, 0),
    bank_transfer: salesTx.filter((t) => t.paymentMethod === 'bank_transfer').reduce((sum, t) => sum + t.amount, 0),
    credit: salesTx.filter((t) => t.paymentMethod === 'credit').reduce((sum, t) => sum + t.amount, 0),
    prepaid_wallet: salesTx.filter((t) => t.paymentMethod === 'prepaid_wallet').reduce((sum, t) => sum + t.amount, 0),
  };

  // 3. Sales By Category Breakdown
  const categoryTotals: Record<TransactionCategory, number> = {
    fuel: salesTx.filter((t) => t.category === 'fuel').reduce((sum, t) => sum + t.amount, 0),
    shop: salesTx.filter((t) => t.category === 'shop').reduce((sum, t) => sum + t.amount, 0),
    lubricants: salesTx.filter((t) => t.category === 'lubricants').reduce((sum, t) => sum + t.amount, 0),
    expense: totalExpenses,
  };

  // 4. Sales by Fuel Type
  const fuelTotals: Record<FuelType, number> = {
    Petrol: salesTx.filter((t) => t.fuelType === 'Petrol').reduce((sum, t) => sum + t.amount, 0),
    Diesel: salesTx.filter((t) => t.fuelType === 'Diesel').reduce((sum, t) => sum + t.amount, 0),
    Kerosene: salesTx.filter((t) => t.fuelType === 'Kerosene').reduce((sum, t) => sum + t.amount, 0),
    'V-Power': salesTx.filter((t) => t.fuelType === 'V-Power').reduce((sum, t) => sum + t.amount, 0),
  };

  // Handle Fuel price adjustments
  const handlePriceUpdate = (id: string) => {
    if (currentUser?.role !== 'manager') return;
    const priceNum = parseFloat(newPriceVal);
    if (!isNaN(priceNum) && priceNum > 0) {
      updatePrice(id, priceNum);
      setEditPriceId(null);
      setNewPriceVal('');
    }
  };

  // Handle creating staff member
  const handleAddStaff = (e: FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    if (!staffName || !staffEmail || !staffPin) {
      setAdminError('Please fill in all requested values.');
      return;
    }
    if (staffPin.length !== 4 || isNaN(parseInt(staffPin))) {
      setAdminError('PIN must be exactly a 4-digit numeric code.');
      return;
    }

    const res = addStaffMember(staffName, staffEmail, staffRole, staffPin);
    if (res.success) {
      setAdminSuccess('Employee registered successfully on terminal database!');
      setStaffName('');
      setStaffEmail('');
      setStaffPin('');
      setStaffRole('attendant');
    } else {
      setAdminError(res.message || 'Error occurred.');
    }
  };

  // SVG Chart Computations (Method Breakdown)
  const maxMethodAmount = Math.max(...Object.values(methodTotals), 1);
  const maxCategoryAmount = Math.max(...Object.values(categoryTotals), 1);

  return (
    <div className="space-y-6">
      {/* 4 Primary Financial Metric Scoreboards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Gross Cashflow',
            value: `KES ${totalSales.toLocaleString()}`,
            desc: 'Aggregate sales booked',
            color: 'text-indigo-400',
            bg: 'bg-[#16191E] border-slate-800/80',
            icon: TrendingUp,
          },
          {
            title: 'Station Expenditures',
            value: `KES ${totalExpenses.toLocaleString()}`,
            desc: 'Operating withdrawals',
            color: 'text-rose-400',
            bg: 'bg-[#16191E] border-slate-800/80',
            icon: Coins,
          },
          {
            title: 'Net Revenue',
            value: `KES ${netRevenue.toLocaleString()}`,
            desc: 'Shift retained balances',
            color: 'text-emerald-400',
            bg: 'bg-[#16191E] border-slate-800/80 shadow-[0_0_15px_rgba(16,185,129,0.03)]',
            icon: BarChart2,
          },
          {
            title: 'Accrued Excise + VAT',
            value: `KES ${accruedTaxes.toLocaleString(undefined, { maximumFractionDigits: 1 })}`,
            desc: 'Automated tax (16% + levies)',
            color: 'text-slate-200',
            bg: 'bg-[#16191E] border-slate-800/80',
            icon: Fuel,
          },
        ].map((metric) => (
          <div key={metric.title} className={`p-4 rounded-2xl border ${metric.bg} shadow-md space-y-2`}>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {metric.title}
              </span>
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
            </div>
            <div>
              <span className="text-base sm:text-lg font-mono font-black tracking-tight text-white block">
                {metric.value}
              </span>
              <span className="text-[9px] text-slate-500 font-medium block uppercase tracking-wide">
                {metric.desc}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Fuel Level Monitoring + Interactive Pricing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-[#16191E] border border-slate-800 rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <h2 className="font-bold text-white text-base">Fuel Inventory & Tank Monitoring</h2>
            <p className="text-xs text-slate-500 mt-0.5">Underground tank dipping stocks and active pumps price per litre</p>
          </div>

          <div className="space-y-4">
            {tanks.map((tank) => {
              const fillPercentage = Number(((tank.currentLevel / tank.capacity) * 100).toFixed(0));
              const isLow = tank.currentLevel < tank.lowThereshold;
              const isEditing = editPriceId === tank.id;

              return (
                <div key={tank.id} className="border border-slate-850 rounded-xl p-3.5 space-y-2 bg-[#111418]/45 hover:bg-[#111418]/90 transition">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{tank.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-medium block">
                        Fuel Category: <strong className="text-slate-400">{tank.fuelType}</strong>
                      </span>
                    </div>

                    <div className="text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="any"
                            value={newPriceVal}
                            placeholder="Price"
                            className="w-16 text-center text-xs font-semibold bg-[#0A0B0D] border border-slate-800 rounded p-1 text-white placeholder:text-slate-650 text-center"
                            onChange={(e) => setNewPriceVal(e.target.value)}
                          />
                          <button
                            onClick={() => handlePriceUpdate(tank.id)}
                            className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-1 rounded cursor-pointer hover:bg-emerald-500 shadow-md"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditPriceId(null)}
                            className="text-[10px] text-rose-400 bg-rose-950/20 hover:bg-rose-900/30 rounded py-1 px-2 cursor-pointer border border-rose-900/30"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-[#0A0B0D] text-white border border-slate-800 font-semibold font-mono px-2 py-0.5 rounded shadow-xs">
                            KES {tank.pricePerLitre}/L
                          </span>
                          {currentUser?.role === 'manager' && (
                            <button
                              onClick={() => {
                                setEditPriceId(tank.id);
                                setNewPriceVal(tank.pricePerLitre.toString());
                              }}
                              className="text-[9px] bg-[#16191E] hover:bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded cursor-pointer transition border border-slate-800"
                            >
                              Edit Rate
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Level gauge progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">
                        Level: {tank.currentLevel.toLocaleString()}L / {tank.capacity.toLocaleString()}L
                      </span>
                      <span className={`font-semibold ${isLow ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                        {fillPercentage}% Volume
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isLow ? 'bg-rose-600 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        }`}
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Warning label indicators */}
                  {isLow && (
                    <div className="flex items-center gap-1.5 bg-rose-955/20 text-rose-350 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-rose-900/40 w-fit">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      Critical Low Inventory Alert! Dispensor tanks are below {tank.lowThereshold}L. Order fuel immediately.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Graphical Reporting Charts (Custom SVGs) */}
        <div className="lg:col-span-5 bg-[#16191E] border border-slate-805 rounded-2xl shadow-sm p-5 space-y-6">
          {/* Chart 1: Payment Method Sourced Sales */}
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-white text-sm">Receipt Sourcing Breakdown</h3>
              <p className="text-[10px] text-slate-500">Total cashflow grouped by user settlement options</p>
            </div>

            <div className="space-y-2">
              {Object.entries(methodTotals).map(([method, amount]) => {
                const barWidth = Math.max(8, Math.round((amount / maxMethodAmount) * 100));
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-slate-400 truncate">
                      <span className="capitalize">{method.replace('_', ' ')}</span>
                      <span className="font-black font-mono text-slate-200">KES {amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-850 h-2 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-indigo-505 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] rounded-lg transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-800/80" />

          {/* Chart 2: Inventory sales category */}
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-white text-sm">Revenue Share by Category</h3>
              <p className="text-[10px] text-slate-505 text-slate-500">Comparing fuel dispensing against auxiliary assets</p>
            </div>

            <div className="space-y-2">
              {Object.entries(categoryTotals).map(([cat, amount]) => {
                const barWidth = Math.max(8, Math.round((amount / maxCategoryAmount) * 100));
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-slate-400 truncate">
                      <span className="capitalize">{cat}</span>
                      <span className="font-black font-mono text-slate-200">KES {amount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-850 h-2 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] rounded-lg transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Google Cloud Workspace Synchronisation Console */}
      <div className="bg-[#16191E] border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/35 rounded-xl flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Google Cloud Workspace Sync</h2>
              <p className="text-xs text-slate-500">Live backups & automated audit reports synced to Google Drive and Google Sheets</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!googleAccessToken ? (
              <button
                id="btn-google-auth-connect"
                onClick={signInWithGoogle}
                className="gsi-material-button flex items-center gap-2 bg-slate-100 hover:bg-white text-slate-900 font-bold px-4 py-2 rounded-xl text-xs sm:text-xs cursor-pointer transition select-none"
              >
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 text-emerald-500 block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span>Connect Google Workspace</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-[#111418] border border-slate-800 p-2 rounded-xl">
                {googleUser?.photoURL && (
                  <img 
                    src={googleUser.photoURL} 
                    alt="avatar" 
                    className="w-7 h-7 rounded-full border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="text-left py-0.5">
                  <span className="text-xs font-bold text-slate-100 block truncate max-w-[120px]">{googleUser?.displayName || 'Active Member'}</span>
                  <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">{googleUser?.email}</span>
                </div>
                <button
                  id="btn-google-auth-disconnect"
                  onClick={signOutFromGoogle}
                  className="text-[10px] bg-rose-950/20 hover:bg-rose-955/40 text-rose-400 font-bold px-2 py-1 rounded-md border border-rose-900/40 cursor-pointer transition select-none ml-2"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {workspaceError && (
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 flex items-start gap-2 text-rose-455 text-xs text-rose-400 font-medium">
            <ShieldAlert className="w-5 h-5 text-rose-550 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <p className="font-bold">Google Cloud Integration Error</p>
              <p className="mt-0.5 opacity-90">{workspaceError}</p>
            </div>
          </div>
        )}

        {workspaceInfoMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 flex items-start gap-2 text-emerald-400 text-xs font-medium">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Sync Completed Successfully</p>
              <p className="mt-0.5 opacity-90">{workspaceInfoMsg}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Quick Manual Synchronisation Triggers */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-505 text-slate-500">Manual Synchronisation Backups</h3>
            <p className="text-[11px] text-slate-400">Back up records dynamically into spreadsheets inside your custom Google Drive directory "Petrol Station Reports".</p>
            
            <div className="space-y-2 mt-2">
              <button
                id="btn-backup-transactions"
                disabled={!googleAccessToken || workspaceExporting}
                onClick={handleBackupTransactions}
                className="w-full flex items-center justify-between text-left p-3 rounded-xl border border-slate-800 bg-[#111418] hover:border-emerald-500/45 hover:bg-[#111418]/80 transition text-xs text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
              >
                <span>Backup Sales & Cashflow Ledgers</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                  {workspaceExporting ? 'Syncing...' : 'Export Sheets'}
                </span>
              </button>

              <button
                id="btn-backup-customers"
                disabled={!googleAccessToken || workspaceExporting}
                onClick={handleBackupCustomers}
                className="w-full flex items-center justify-between text-left p-3 rounded-xl border border-slate-800 bg-[#111418] hover:border-emerald-500/45 hover:bg-[#111418]/80 transition text-xs text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
              >
                <span>Backup Prepaid Loyalty CRM</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                  {workspaceExporting ? 'Syncing...' : 'Export Sheets'}
                </span>
              </button>
            </div>
          </div>

          {/* Realtime Synched Spreadsheets Files List */}
          <div className="lg:col-span-7 bg-[#111418]/40 border border-slate-850 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-550 text-slate-400 flex items-center gap-1.5Packed font-bold">
                <FolderOpen className="w-4 h-4 text-emerald-500" />
                Live Folder: Petrol Station Reports
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15">
                {driveFiles.length} Sheets Synced
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[220px] scrollbar-none pr-1">
              {!googleAccessToken ? (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-500 font-medium">Please connect your Google Workspace to view live synched cloud reports.</p>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="text-center py-10">
                  {workspaceExporting ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
                      <p className="text-xs text-slate-500">Creating secure spreadsheet on Google Drive...</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">No exported reports found. Run backup or finalize shifts to export.</p>
                  )}
                </div>
              ) : (
                driveFiles.map(file => (
                  <div key={file.id} className="flex justify-between items-center p-2.5 rounded-lg bg-[#0F1217] border border-slate-850 hover:border-slate-800">
                    <div className="text-left truncate max-w-[70%]">
                      <p className="text-xs font-bold text-white truncate">{file.name}</p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">Created: {new Date(file.createdTime).toLocaleString()}</p>
                    </div>
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 px-2.5 py-1 rounded text-[10px] font-black uppercase transition select-none cursor-pointer"
                    >
                      <span>Open Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Managers Authority Administration controls */}
      {currentUser?.role === 'manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start border-t border-slate-800/60 pt-6">
          {/* Add Staff Terminal */}
          <div className="lg:col-span-7 bg-[#16191E] border border-slate-800 rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-white text-base mb-3 pb-3 border-b border-slate-850 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              Administrative Staff Terminal
            </h2>

            <form onSubmit={handleAddStaff} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">Employee Fullname</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-800 bg-[#111418] hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-lg p-2 text-white placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. jdoe@station.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-800 bg-[#111418] hover:border-slate-700 focus:border-emerald-500 focus:outline-none rounded-lg p-2 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">Authority Clearance Level</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as 'manager' | 'attendant')}
                    className="w-full text-xs font-semibold border border-slate-800 bg-[#111418] rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="attendant" className="bg-[#16191E]">Station Attendant</option>
                    <option value="manager" className="bg-[#16191E]">Manager Audit Clearance</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">Secure Password/PIN (4-digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. 5555"
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full text-xs font-mono font-bold tracking-widest border border-slate-800 bg-[#111418] focus:border-emerald-500 focus:outline-none rounded-lg p-1.5 text-white placeholder:text-slate-650"
                  />
                </div>
              </div>

              {adminError && <p className="text-xs text-rose-400 font-medium">{adminError}</p>}
              {adminSuccess && <p className="text-xs text-emerald-400 font-medium">{adminSuccess}</p>}

              <button
                id="btn-add-staff"
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs tracking-wider transition cursor-pointer shadow-md"
              >
                Register Employee
              </button>
            </form>
          </div>

          {/* Terminal Reset & System Variables info */}
          <div className="lg:col-span-5 bg-[#16191E] border border-rose-950/25 rounded-2xl shadow-sm p-5 space-y-4">
            <div>
              <h3 className="font-bold text-rose-400 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-550 animate-pulse" />
                Sensitive Station Database Operations
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Authorized for Managers ONLY. These operations wipe terminal state cache entirely.</p>
            </div>

            <div className="bg-[#111418]/50 p-3 rounded-xl border border-slate-850">
              <span className="text-[10px] font-mono block text-slate-500 uppercase tracking-wider">Total Registered Personnel</span>
              <span className="text-sm font-semibold text-white block mt-0.5">{staff.length} Employees</span>
            </div>

            <button
              onClick={() => {
                if (window.confirm('WARNING: Are you sure you want to hard reset the state and transaction ledger? This action is irreversible.')) {
                  resetAllData();
                }
              }}
              className="w-full border border-rose-900 bg-rose-955/20 hover:bg-rose-900/40 text-rose-400 font-bold py-2 rounded-lg text-xs transition flex justify-center items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Wipe Ledger & Reset to Default Seeds
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
