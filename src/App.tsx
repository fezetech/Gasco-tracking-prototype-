import { useState } from 'react';
import { StoreProvider, useStore } from './services/store';
import { GoogleWorkspaceProvider } from './services/googleWorkspace';
import BiometricLogin from './components/BiometricLogin';
import TransactionForm from './components/TransactionForm';
import ShiftManagement from './components/ShiftManagement';
import CustomerManagement from './components/CustomerManagement';
import Analytics from './components/Analytics';
import {
  TrendingUp,
  LayoutGrid,
  ClipboardList,
  Fuel,
  LogOut,
  Wifi,
  WifiOff,
  CloudLightning,
  RefreshCw,
  Users,
} from 'lucide-react';

function DashboardAppContent() {
  const {
    currentUser,
    logout,
    isOnline,
    toggleConnectivity,
    syncQueueCount,
    syncing,
    syncOfflineDataFlag,
    activeShift,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'analytics' | 'transactions' | 'shift' | 'crm'>('analytics');

  // Gatekeeper auth access control
  if (!currentUser) {
    return <BiometricLogin />;
  }

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex flex-col font-sans text-slate-200">
      {/* Dynamic System Hub Status Header Bar */}
      <header className="bg-[#0F1217] text-white shadow-md sticky top-0 z-50 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 font-black tracking-tighter shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Fuel className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white m-0">
                Gasco Energy Ltd, Soroti <span className="text-slate-500 font-normal px-1">/</span> <span className="text-emerald-400">Terminal 401</span>
              </h1>
              <span className="text-[10px] text-emerald-500 font-mono font-semibold tracking-wider block uppercase">
                BALANCING TERMINAL • LIVE SENSORS
              </span>
            </div>
          </div>

          {/* Interactive Network Connectivity Controls & Queue Syncing Status */}
          <div className="flex items-center gap-4">
            <button
              id="connectivity-status-toggle"
              onClick={toggleConnectivity}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold select-none transition border cursor-pointer ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                  : 'bg-amber-950/40 border-amber-600/40 text-amber-500 hover:border-amber-500'
              }`}
              title="Click to toggle Network Connection Simulation"
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Online Sync Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 shrink-0" />
                  <span>Offline Mode</span>
                </>
              )}
            </button>

            {/* Offline queue sync status controller */}
            {syncQueueCount > 0 && (
              <button
                id="btn-sync-offline-queue"
                onClick={syncOfflineDataFlag}
                disabled={syncing || !isOnline}
                className={`flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-500 cursor-pointer active:scale-95 transition disabled:cursor-not-allowed`}
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${syncing ? 'animate-spin' : ''}`} />
                <span>
                  {syncing ? 'Syncing...' : `Sync ${syncQueueCount}`}
                </span>
              </button>
            )}

            {/* Logged in Employee metadata user badge */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <div className={`w-8 h-8 rounded-full ${currentUser.avatarColor} flex items-center justify-center text-white text-xs font-bold font-mono`}>
                {currentUser.name.split(' ')[0][0]}
              </div>
              <div className="hidden md:block">
                <span className="text-xs font-bold block leading-tight text-white">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 block tracking-wider uppercase font-semibold">
                  {currentUser.role} Account
                </span>
              </div>

              {/* Secure terminal log-out */}
              <button
                id="btn-logout"
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-450 hover:bg-slate-800/40 rounded-lg cursor-pointer transition ml-1"
                title="Lock Terminal Securely"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Views Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Selection Switcher Tab Navigation Controller */}
        <div className="bg-[#111418] border border-slate-800/50 p-1 rounded-2xl flex max-w-lg overflow-x-auto scrollbar-none">
          {[
            { id: 'analytics', label: 'Insights Dashboard', icon: LayoutGrid },
            { id: 'transactions', label: 'Realtime Sales', icon: ClipboardList },
            { id: 'shift', label: 'Shift Audit Log', icon: RefreshCw },
            { id: 'crm', label: 'Prepaid & Loyalty CRM', icon: Users },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#16191E] border border-slate-800 text-emerald-400 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#16191E]/30'
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0 text-emerald-500/80" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Display components view rendering based on active selection */}
        <div>
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'transactions' && <TransactionForm />}
          {activeTab === 'shift' && <ShiftManagement />}
          {activeTab === 'crm' && <CustomerManagement />}
        </div>
      </main>

      {/* Bottom Legal footer credits */}
      <footer className="bg-[#0D1014] border-t border-slate-800/50 py-4 mt-auto text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em]">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Active Device Console: Tablet-Responsive</span>
          <span>© Petrol Sales balancing and inventory compliance panel</span>
          <span>Security Guard Profile: <strong className="text-emerald-400">Verified</strong></span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <GoogleWorkspaceProvider>
        <DashboardAppContent />
      </GoogleWorkspaceProvider>
    </StoreProvider>
  );
}
