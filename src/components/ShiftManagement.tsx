import { useState, FormEvent } from 'react';
import { useStore } from '../services/store';
import { useGoogleWorkspace } from '../services/googleWorkspace';
import { 
  Play, 
  Flame, 
  HelpCircle, 
  Save, 
  CheckCircle, 
  FileText, 
  LayoutList, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Key, 
  RefreshCw,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';

export default function ShiftManagement() {
  const {
    currentUser,
    activeShift,
    tanks,
    pumps,
    startNewShift,
    submitShiftEnd,
    shifts,
    verifyShiftReport,
    formatCurrency,
    requestBlindUnlock,
    approveBlindUnlockForShift,
    overrideBlindUnlockWithPIN
  } = useStore();

  const { googleAccessToken, exportShiftAuditToSheets, exporting: googleExporting } = useGoogleWorkspace();
  const [syncedShiftId, setSyncedShiftId] = useState<string | null>(null);
  const [syncedShiftUrl, setSyncedShiftUrl] = useState<string | null>(null);
  const [shiftSyncStatus, setShiftSyncStatus] = useState<string>('');

  const handleExportShiftSheet = async (shift: any) => {
    if (!googleAccessToken) {
      setShiftSyncStatus('Google Workspace disconnected! Connect Google inside the Insights Dashboard first.');
      return;
    }
    setShiftSyncStatus('');
    setSyncedShiftId(shift.id);
    setSyncedShiftUrl(null);
    try {
      const url = await exportShiftAuditToSheets(shift);
      setSyncedShiftUrl(url);
      setShiftSyncStatus(`Shift report (Shift #${shift.id.slice(0, 6).toUpperCase()}) successfully exported!`);
    } catch (err: any) {
      setShiftSyncStatus(err?.message || 'Error occurred exporting shift report to Sheets');
    }
  };

  const [notes, setNotes] = useState('');
  const [managerVerificationNotes, setManagerVerificationNotes] = useState('');
  
  // Storage for physical currency counts registered on checkout
  const [physicalCash, setPhysicalCash] = useState('0');
  const [physicalMobileMoney, setPhysicalMobileMoney] = useState('0');
  const [physicalBank, setPhysicalBank] = useState('0');
  const [physicalCredit, setPhysicalCredit] = useState('0');
  const [physicalPrepaid, setPhysicalPrepaid] = useState('0');

  // Manual PIN code controls mapped per shiftCard
  const [pinCodes, setPinCodes] = useState<Record<string, string>>({});
  const [pinSuccess, setPinSuccess] = useState<Record<string, string>>({});
  const [pinError, setPinError] = useState<Record<string, string>>({});

  // Storage for start shift readings input states
  const [startPumps, setStartPumps] = useState<Record<string, string>>(() => {
    const defaultVals: Record<string, string> = {};
    pumps.forEach((p) => {
      defaultVals[p.id] = p.lastReading.toString();
    });
    return defaultVals;
  });

  const [startDips, setStartDips] = useState<Record<string, string>>(() => {
    const defaultVals: Record<string, string> = {};
    tanks.forEach((t) => {
      defaultVals[t.id] = t.currentLevel.toString();
    });
    return defaultVals;
  });

  // Storage for end shift readings input states
  const [endPumps, setEndPumps] = useState<Record<string, string>>({});
  const [endDips, setEndDips] = useState<Record<string, string>>({});

  const handleStartShiftSubmit = (e: FormEvent) => {
    e.preventDefault();
    const pumpsNum: Record<string, number> = {};
    const dipsNum: Record<string, number> = {};

    pumps.forEach((p) => {
      const val = parseFloat(startPumps[p.id]);
      pumpsNum[p.id] = isNaN(val) ? p.lastReading : val;
    });

    tanks.forEach((t) => {
      const val = parseFloat(startDips[t.id]);
      dipsNum[t.id] = isNaN(val) ? t.currentLevel : val;
    });

    startNewShift(pumpsNum, dipsNum);
    // Reset inputs for end shift
    const endPumpInitial: Record<string, string> = {};
    pumps.forEach((p) => {
      endPumpInitial[p.id] = (pumpsNum[p.id] + 150).toString(); // pre-fill estimation
    });
    setEndPumps(endPumpInitial);

    const endDipInitial: Record<string, string> = {};
    tanks.forEach((t) => {
      endDipInitial[t.id] = (dipsNum[t.id] - 150).toString(); // pre-fill estimation
    });
    setEndDips(endDipInitial);
  };

  const handleEndShiftSubmit = (e: FormEvent) => {
    e.preventDefault();
    const pumpsNum: Record<string, number> = {};
    const dipsNum: Record<string, number> = {};

    pumps.forEach((p) => {
      const val = parseFloat(endPumps[p.id]);
      pumpsNum[p.id] = isNaN(val) ? p.lastReading : val;
    });

    tanks.forEach((t) => {
      const val = parseFloat(endDips[t.id]);
      dipsNum[t.id] = isNaN(val) ? t.currentLevel : val;
    });

    const counts = {
      cash: parseFloat(physicalCash) || 0,
      mobile_money: parseFloat(physicalMobileMoney) || 0,
      bank_transfer: parseFloat(physicalBank) || 0,
      credit: parseFloat(physicalCredit) || 0,
      prepaid_wallet: parseFloat(physicalPrepaid) || 0,
    };

    submitShiftEnd(pumpsNum, dipsNum, notes, counts);
    
    // Reset all shift reconciliation forms
    setNotes('');
    setPhysicalCash('0');
    setPhysicalMobileMoney('0');
    setPhysicalBank('0');
    setPhysicalCredit('0');
    setPhysicalPrepaid('0');
  };

  const currentDuration = activeShift ? Math.floor((Date.now() - activeShift.startTime) / 60000) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Active Shift Management Controls */}
      <div className="lg:col-span-5 bg-[#16191E] border border-slate-800 rounded-2xl shadow-sm p-5">
        <h2 id="shift-controls-title" className="font-bold text-white text-base mb-3 pb-3 border-b border-slate-850 flex items-center gap-2">
          <Play className="w-5 h-5 text-emerald-500" />
          Shift Controller
        </h2>

        {!activeShift ? (
          // Off Shift: Start Shift parameters form
          <form onSubmit={handleStartShiftSubmit} className="space-y-4">
            <div className="bg-[#111418] p-3.5 border border-slate-800/80 rounded-xl">
              <span className="text-xs font-mono tracking-wider font-bold text-slate-400 block uppercase">System State: Closed</span>
              <p className="text-[10px] text-slate-500 mt-1">
                You currently do not have a shift session started. Enter starting dipping sticks and counter meter values to initiate fuel logging.
              </p>
            </div>

            {/* Starting pump counters */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                1. Start Pump Meters (Litres)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {pumps.map((pump) => (
                  <div key={pump.id}>
                    <label className="text-[10px] text-slate-500 font-mono block mb-1">
                      {pump.name} ({pump.fuelType})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={startPumps[pump.id] || ''}
                      onChange={(e) => setStartPumps({ ...startPumps, [pump.id]: e.target.value })}
                      className="w-full text-xs font-semibold border border-slate-800 rounded-lg p-1.5 bg-[#0a0b0d] text-white focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Starting Tank Stick Dipping levels */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                2. Start Tank Dip Levels (Litres)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {tanks.map((tank) => (
                  <div key={tank.id}>
                    <label className="text-[10px] text-slate-500 font-mono block mb-1">
                      {tank.name}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={startDips[tank.id] || ''}
                      onChange={(e) => setStartDips({ ...startDips, [tank.id]: e.target.value })}
                      className="w-full text-xs font-semibold border border-slate-800 rounded-lg p-1.5 bg-[#0a0b0d] text-white focus:border-emerald-500 focus:outline-none transition"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              id="btn-start-shift"
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider transition active:scale-[98%] cursor-pointer shadow-md"
            >
              Sign-In & Start Shift
            </button>
          </form>
        ) : (
          // Active Shift Interface
          <form onSubmit={handleEndShiftSubmit} className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 flex gap-3 items-center shadow-[0_0_12px_rgba(16,185,129,0.05)]">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Shift Active & Monitoring</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  Opened by <strong>{activeShift.attendantName}</strong> since{' '}
                  {new Date(activeShift.startTime).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Shift metadata timers */}
            <div className="grid grid-cols-2 gap-3 bg-[#111418]/60 p-3 rounded-xl border border-slate-850">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">Active Attendant</span>
                <span className="text-xs text-slate-200 font-bold block">{activeShift.attendantName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">Session Runtime</span>
                <span className="text-xs text-emerald-400 font-bold block">{currentDuration} minutes</span>
              </div>
            </div>

            {/* Ending pump meter entries */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider flex justify-between">
                <span>1. Capture Closing Pump Meters</span>
                <span className="text-[10px] text-slate-500 font-mono leading-relaxed lowercase">Enter current values</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {pumps.map((p) => (
                  <div key={p.id}>
                    <label className="text-[10px] text-slate-500 font-mono block mb-1">
                      {p.name} (Start: {activeShift.startPumpReadings[p.id] || p.lastReading}L)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Enter new counter"
                      value={endPumps[p.id] || ''}
                      onChange={(e) => setEndPumps({ ...endPumps, [p.id]: e.target.value })}
                      className="w-full text-xs font-semibold border border-slate-805 bg-[#0A0B0D] text-white focus:border-emerald-500 rounded-lg p-1.5 focus:outline-none placeholder:text-slate-650"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Ending Stick dipping levels */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider flex justify-between">
                <span>2. Capture Closing Tank Dips</span>
                <span className="text-[10px] text-zinc-400 font-mono leading-relaxed lowercase">Entering stick values</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {tanks.map((t) => (
                  <div key={t.id}>
                    <label className="text-[10px] text-slate-500 font-mono block mb-1">
                      {t.name} (Start: {activeShift.dipLevelStart[t.id] || t.currentLevel}L)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Enter dipping stick"
                      value={endDips[t.id] || ''}
                      onChange={(e) => setEndDips({ ...endDips, [t.id]: e.target.value })}
                      className="w-full text-xs font-semibold border border-slate-855 bg-[#0A0B0D] text-white focus:border-emerald-500 rounded-lg p-1.5 focus:outline-none placeholder:text-slate-650"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Physical Revenue Counts (Blind Balancing) */}
            <div className="space-y-3 pt-3 border-t border-slate-800/60">
              <span className="text-xs font-bold text-slate-405 text-slate-400 block uppercase tracking-wider flex justify-between items-center">
                <span>3. Physical Income Counts (Blind Balancing)</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5">🔒 Blind Safeguard</span>
              </span>
              <p className="text-[10px] text-slate-500">
                Count all cash, mobile money floating numbers and wallet cards physically. System reference figures are locked from attendant views to prevent reconciliation manipulation.
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-mono block mb-1">Physical Cash (In Hand)</label>
                  <input
                    type="number"
                    value={physicalCash}
                    onChange={(e) => setPhysicalCash(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-800 rounded-lg p-1.5 bg-[#0a0b0d] text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-mono block mb-1">Mobile Money Floats</label>
                  <input
                    type="number"
                    value={physicalMobileMoney}
                    onChange={(e) => setPhysicalMobileMoney(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-800 rounded-lg p-1.5 bg-[#0a0b0d] text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-mono block mb-1">Bank Receipt Slips</label>
                  <input
                    type="number"
                    value={physicalBank}
                    onChange={(e) => setPhysicalBank(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-800 rounded-lg p-1.5 bg-[#0a0b0d] text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 uppercase font-mono block mb-1">Invoiced Credit Notes</label>
                  <input
                    type="number"
                    value={physicalCredit}
                    onChange={(e) => setPhysicalCredit(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-800 rounded-lg p-1.5 bg-[#0a0b0d] text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] text-slate-500 uppercase font-mono block mb-1">Prepaid Wallet Card Drawdowns</label>
                  <input
                    type="number"
                    value={physicalPrepaid}
                    onChange={(e) => setPhysicalPrepaid(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-800 rounded-lg p-1.5 bg-[#0a0b0d] text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Shift conclusion notes */}
            <div>
              <label className="text-xs font-semibold text-slate-505 text-slate-500 block mb-1">Shift Remarks & Variances</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log stick differences, pump leakages or custom shift explanations here..."
                rows={2}
                className="w-full bg-[#111418] border border-slate-850 focus:border-emerald-500 focus:outline-none text-white rounded-lg p-2 text-xs placeholder:text-slate-650"
              />
            </div>

            <button
              id="btn-close-shift"
              type="submit"
              className="w-full bg-rose-650 hover:bg-rose-600 border border-rose-900/40 text-rose-100 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition active:scale-[98%] cursor-pointer shadow flex justify-center items-center"
            >
              Close & Terminate Shift Session
            </button>
          </form>
        )}
      </div>

      {/* Shifts History Log & Managers Reconciliation Dashboard */}
      <div className="lg:col-span-7 bg-[#16191E] border border-slate-805 rounded-2xl shadow-sm p-5">
        <h2 className="font-bold text-white text-base mb-3 pb-3 border-b border-slate-850 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-500" />
          Shift Reconciliation Reports
        </h2>

        {/* History records */}
        <div className="overflow-y-auto max-h-[500px] space-y-4">
          {shifts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs text-slate-500">No shift reports entered on file.</p>
            </div>
          ) : (
            shifts.map((sh) => {
              const durationMin = sh.endTime ? Math.floor((sh.endTime - sh.startTime) / 60000) : 0;
              const isVerified = sh.status === 'verified';
              const isClosed = sh.status === 'completed';

              const isManager = currentUser?.role === 'manager';
              const isUnlockedForAttendant = sh.blindUnlocked === true;
              const isRevealed = isManager || isUnlockedForAttendant;

              // Local PIN code for this shift report card
              const currentPinInput = pinCodes[sh.id] || '';
              const pinErrorMessage = pinError[sh.id] || '';
              const pinSuccessMessage = pinSuccess[sh.id] || '';

              const handlePinUnlock = (shiftId: string) => {
                if (!currentPinInput) return;
                const ok = overrideBlindUnlockWithPIN(shiftId, currentPinInput);
                if (ok) {
                  setPinSuccess({ ...pinSuccess, [shiftId]: 'Master Key Accepted! Ledger numbers unlocked.' });
                  setPinError({ ...pinError, [shiftId]: '' });
                  setPinCodes({ ...pinCodes, [shiftId]: '' });
                } else {
                  setPinError({ ...pinError, [shiftId]: 'Invalid manager pin code!' });
                  setPinSuccess({ ...pinSuccess, [shiftId]: '' });
                }
              };

              return (
                <div key={sh.id} className="border border-slate-850 rounded-xl p-4 space-y-4 bg-[#111418]/45 hover:bg-[#111418] transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="text-xs font-black font-mono text-slate-200 block uppercase">Report ID: {sh.id.slice(-8)}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Attendant: <strong className="text-slate-400">{sh.attendantName}</strong>
                      </span>
                    </div>

                    <div className="flex gap-1.5 flex-wrap items-center">
                      {sh.status !== 'active' && (
                        <button
                          onClick={() => handleExportShiftSheet(sh)}
                          disabled={googleExporting && syncedShiftId === sh.id}
                          className="flex items-center gap-1.5 bg-emerald-600/10 hover:bg-emerald-600/25 disabled:bg-slate-800 border border-emerald-500/20 text-emerald-400 disabled:text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition select-none cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>
                            {googleExporting && syncedShiftId === sh.id ? 'Syncing...' : 'To Sheets'}
                          </span>
                        </button>
                      )}

                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isVerified
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : isClosed
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      }`}>
                        {sh.status.toUpperCase()}
                      </span>
                      {sh.verifiedBy && (
                        <span className="text-[9px] bg-[#0A0B0D] border border-slate-800 text-emerald-400 font-mono rounded py-0.5 px-1.5 font-semibold">
                          Verified by {sh.verifiedBy}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Core balancing analytics breakdown (MASKED or SHOWN based on blind balancing permissions) */}
                  <div className="relative overflow-hidden bg-[#0A0B0D]/50 rounded-xl border border-slate-850 p-3.5 space-y-3">
                    {!isRevealed ? (
                      <div className="text-center py-4 space-y-3.5">
                        <div className="flex justify-center">
                          <span className="p-2.5 bg-rose-500/10 text-rose-450 rounded-full border border-rose-500/20">
                            <Lock className="w-5 h-5 animate-pulse" />
                          </span>
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white">System Ledgers Encrypted (Attendant Lock)</h4>
                          <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1">
                            Calculated system totals are locked out from attedants to execute blind reconciliation checks. Request manager review or submit a pin key.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 max-w-md mx-auto pt-1">
                          {sh.unlockRequestPending ? (
                            <span className="text-[10px] bg-amber-550/10 border border-amber-500/20 text-amber-500 rounded-lg px-3.5 py-1.5 font-bold flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Requested! Awaiting Manager Verification...
                            </span>
                          ) : (
                            <button
                              onClick={() => requestBlindUnlock(sh.id)}
                              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-750 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                            >
                              Request Access Override
                            </button>
                          )}

                          {/* Quick supervisor PIN auth widget */}
                          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-[#0A0B0D] p-1 border border-slate-800 rounded-lg">
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="Manager PIN"
                              value={currentPinInput}
                              onChange={(e) => setPinCodes({ ...pinCodes, [sh.id]: e.target.value })}
                              className="w-20 bg-transparent text-xs text-center border-none focus:outline-none focus:ring-0 text-white font-mono"
                            />
                            <button
                              onClick={() => handlePinUnlock(sh.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded cursor-pointer transition"
                            >
                              Apply
                            </button>
                          </div>
                        </div>

                        {pinErrorMessage && <p className="text-[10px] text-rose-450 font-bold">{pinErrorMessage}</p>}
                        {pinSuccessMessage && <p className="text-[10px] text-emerald-400 font-bold">{pinSuccessMessage}</p>}
                      </div>
                    ) : (
                      // Ledger IS revealed: Render calculation figures and real-time variances
                      <div className="space-y-4">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold font-mono">
                          <Unlock className="w-4 h-4" />
                          <span>UNLOCKED: Live Variance Auditing Enabled</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <div>
                            <span className="text-[9px] text-slate-500 font-mono uppercase block">Logged Sales</span>
                            <span className="text-xs font-bold text-white block">{formatCurrency(sh.totalSales)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-mono uppercase block">Expenses</span>
                            <span className="text-xs font-bold text-rose-400 block">{formatCurrency(sh.totalExpenses)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-mono uppercase block">Automated Taxes</span>
                            <span className="text-xs font-bold text-slate-400 block">{formatCurrency(sh.taxCalculated)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-500 font-mono uppercase block">Duration</span>
                            <span className="text-xs font-semibold text-slate-300 block">
                              {sh.endTime ? `${durationMin} mins` : 'ActiveNow'}
                            </span>
                          </div>
                        </div>

                        {/* Revenue by source breakdown along with Physical Variance checks */}
                        {sh.endTime && (
                          <div className="space-y-2 border-t border-slate-850 pt-2.5">
                            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Financial Audit Receipts (Variance Analysis)</span>
                            <div className="space-y-1.5">
                              {Object.entries(sh.revenueBreakdown || {}).map(([method, amount]) => {
                                const physical = Number(sh.attendantCounts?.[method as any] ?? 0);
                                const sysAmount = Number(amount);
                                const variance = physical - sysAmount;
                                return (
                                  <div key={method} className="bg-[#111418] border border-slate-850 p-2 text-xs flex justify-between items-center rounded-lg font-mono">
                                    <span className="text-[9px] text-slate-500 block uppercase font-mono font-medium truncate">
                                      {method.replace('_', ' ')}
                                    </span>

                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <span className="text-[9px] text-slate-500 block font-normal leading-none mb-0.5">Physical | System</span>
                                        <span className="text-[10px] font-semibold text-slate-300 block">
                                          {formatCurrency(physical)} | {formatCurrency(sysAmount)}
                                        </span>
                                      </div>

                                      <div className="min-w-[80px] text-right">
                                        {variance === 0 ? (
                                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">Balanced</span>
                                        ) : variance > 0 ? (
                                          <span className="text-[9px] font-semibold text-teal-400 bg-teal-500/10 px-1 py-0.5 rounded border border-teal-500/20">
                                            +{formatCurrency(variance)} Surplus
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-semibold text-rose-450 bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/20">
                                            {formatCurrency(variance)} Short
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Operational Manager commands for approval requests */}
                  {isManager && sh.unlockRequestPending && (
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="text-[10px]">
                        <p className="font-bold text-amber-500 uppercase tracking-widest">Attendant Unlock Request</p>
                        <p className="text-slate-450">Supervisor attention required for audit balancing.</p>
                      </div>
                      <button
                        onClick={() => approveBlindUnlockForShift(sh.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg border border-emerald-700 cursor-pointer transition flex items-center gap-1"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Grant Ledger Access
                      </button>
                    </div>
                  )}

                  {/* Notes & comments */}
                  {sh.notes && (
                    <div className="bg-[#0A0B0D]/30 border border-slate-850 p-2.5 rounded-lg text-xs text-[#94a3b8] italic">
                      Remarks: "{sh.notes}"
                    </div>
                  )}

                  {/* Operational Manager Reconciliation Button Interface */}
                  {!isVerified && sh.status !== 'active' && isManager && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-[10px] tracking-wider uppercase font-mono text-slate-400 block">Manager Reconciliation & Audit Verification</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Log audit status, shortage/surplus checks..."
                          value={managerVerificationNotes}
                          onChange={(e) => setManagerVerificationNotes(e.target.value)}
                          className="flex-1 bg-[#0A0B0D] border border-slate-800 text-xs text-white rounded-lg p-1.5 focus:border-emerald-500 focus:outline-none placeholder:text-slate-650"
                        />
                        <button
                          onClick={() => {
                            verifyShiftReport(sh.id, managerVerificationNotes);
                            setManagerVerificationNotes('');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Verify & Sync
                        </button>
                      </div>
                    </div>
                  )}

                  {syncedShiftId === sh.id && shiftSyncStatus && (
                    <div className={`p-2.5 rounded-xl text-[10px] font-medium border ${syncedShiftUrl ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'} flex items-center justify-between gap-2`}>
                      <span>{shiftSyncStatus}</span>
                      {syncedShiftUrl && (
                        <a
                          href={syncedShiftUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-400 font-extrabold hover:underline underline-offset-2 uppercase text-[9px]"
                        >
                          <span>Open Sheet</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
