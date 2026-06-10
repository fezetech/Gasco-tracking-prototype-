import { useState, FormEvent } from 'react';
import { useStore } from '../services/store';
import { FuelType, PaymentMethod, TransactionCategory } from '../types';
import { TrendingUp, Coins, Fuel, AlertCircle, RefreshCw, BarChart2, PlusCircle, UserPlus, Trash2 } from 'lucide-react';

export default function Analytics() {
  const {
    tanks,
    transactions,
    currentUser,
    updatePrice,
    addStaffMember,
    resetAllData,
    staff,
  } = useStore();

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
