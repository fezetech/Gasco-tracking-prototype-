import { useState } from 'react';
import { useStore } from '../services/store';
import { Fingerprint, Eye, Lock, RefreshCw, KeyRound, Smartphone, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BiometricLogin() {
  const { staff, login } = useStore();
  const [selectedStaff, setSelectedStaff] = useState(staff[0] || null);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPinMask, setShowPinMask] = useState(true);
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [scanApproved, setScanApproved] = useState(false);

  const handleKeyPress = (num: string) => {
    setErrorMsg('');
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      
      // Auto-submit if PIN reaches 4 digits
      if (nextPin.length === 4) {
        submitPIN(nextPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const submitPIN = (completedPin: string) => {
    const res = login(completedPin);
    if (!res.success) {
      setErrorMsg(res.message);
      setPin('');
    }
  };

  // Simulate fingerprint / face recognition
  const handleBiometricToggle = () => {
    if (!selectedStaff) {
      setErrorMsg('Please select a staff profile first.');
      return;
    }
    setErrorMsg('');
    setBiometricScanning(true);

    // Simulate standard scanning sequence
    setTimeout(() => {
      setBiometricScanning(false);
      setScanApproved(true);
      
      setTimeout(() => {
        // Authenticate with user's registered PIN automatically
        const res = login(selectedStaff.pinCode);
        if (!res.success) {
          setErrorMsg('Biometric matching failed. Please key in your PIN.');
          setScanApproved(false);
        }
      }, 800);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center p-4 selection:bg-emerald-500/20">
      {/* Background visual graphics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-[#16191E] border border-slate-850 rounded-3xl overflow-hidden shadow-2xl relative z-10">
        {/* Terminal Header Bar */}
        <div className="bg-[#0F1217] px-6 py-4 border-b border-slate-800/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <span className="font-mono text-xs text-slate-400 tracking-wider uppercase">Petrol Terminal v2.4</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-mono font-medium text-emerald-400 uppercase tracking-widest">Enforce Shield</span>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center">
          <div className="text-center mb-6">
            <h1 id="login-title" className="text-2xl font-bold text-white tracking-tight">Staff Authentication</h1>
            <p className="text-slate-400 text-sm mt-1">Select your profile to unlock fuel balancing systems</p>
          </div>

          {/* Profiles Carousel */}
          <div className="w-full mb-6">
            <label className="text-xs font-mono text-slate-500 uppercase tracking-wider block mb-2 text-center">
              Active Shift Personnel
            </label>
            <div className="flex justify-center gap-3 overflow-x-auto py-1">
              {staff.map((employee) => {
                const isSelected = selectedStaff?.uid === employee.uid;
                return (
                  <button
                    key={employee.uid}
                    onClick={() => {
                      setSelectedStaff(employee);
                      setPin('');
                      setErrorMsg('');
                    }}
                    className={`flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 min-w-[100px] cursor-pointer ${
                      isSelected
                        ? 'bg-[#111418] border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-[#111418]/45 border-slate-800/80 hover:border-slate-700 hover:bg-[#111418]/80'
                    }`}
                  >
                    <div className={`w-10 h-10 ${employee.avatarColor} rounded-full flex items-center justify-center text-white text-sm font-semibold mb-1.5 shadow`}>
                      {employee.name.split(' ')[0][0]}
                    </div>
                    <span className="text-xs font-medium text-slate-200 text-center truncate w-20">
                      {employee.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize bg-slate-950/40 px-1.5 py-0.5 rounded mt-1">
                      {employee.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Biometric Scan Section / Feedback */}
          <div className="w-full flex flex-col items-center bg-[#111418]/50 rounded-2xl border border-slate-850 p-5 mb-6">
            {biometricScanning ? (
              <div className="flex flex-col items-center justify-center h-28">
                <div className="relative">
                  <Fingerprint className="w-16 h-16 text-emerald-400 animate-pulse" />
                  <motion.div
                    className="absolute inset-x-0 h-0.5 bg-emerald-300 shadow-md shadow-emerald-400/80"
                    initial={{ top: '10%' }}
                    animate={{ top: '90%' }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'easeIn' }}
                  />
                </div>
                <span className="text-xs font-mono text-emerald-400 mt-3 animate-pulse tracking-wide">
                  Reading biometric signature...
                </span>
              </div>
            ) : scanApproved ? (
              <div className="flex flex-col items-center justify-center h-28">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <span className="text-xs font-mono text-emerald-400 mt-2 font-semibold">
                  Access Granted!
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <button
                  id="biometric-scan-button"
                  onClick={handleBiometricToggle}
                  className="w-16 h-16 rounded-full bg-slate-800/40 hover:bg-slate-700/50 active:scale-95 border border-slate-705 flex items-center justify-center text-slate-300 hover:text-emerald-400 transition-all cursor-pointer group shadow"
                  title="Simulate Biometric FaceID / Fingerprint"
                >
                  <Fingerprint className="w-8 h-8 group-hover:scale-110 transition-transform" />
                </button>
                <span className="text-xs text-slate-400 mt-2 text-center">
                  Press sensor for <strong>Biometric Login</strong> or use keypad
                </span>
              </div>
            )}
          </div>

          {/* PIN Entering visual indicators */}
          <div className="w-full mb-4">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((index) => {
                const isEntered = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                      isEntered
                        ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-sm shadow-emerald-400/50'
                        : 'border-slate-800 bg-[#111418]'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-450 text-center mt-3 font-medium">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Pin Keyboard Numbers Entry */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs mt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                id={`pin-btn-${digit}`}
                onClick={() => handleKeyPress(digit)}
                className="h-12 rounded-full bg-[#111418] hover:bg-slate-800 active:bg-slate-750 text-white font-semibold text-lg border border-slate-800/60 hover:border-slate-700 transition cursor-pointer flex items-center justify-center active:scale-95"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={() => setShowPinMask(!showPinMask)}
              className="h-12 rounded-full bg-[#0F1217] text-slate-400 border border-slate-805 flex items-center justify-center hover:text-slate-200 cursor-pointer text-xs"
              title="Toggle Masking"
            >
              {showPinMask ? <Eye className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </button>
            <button
              id="pin-btn-0"
              onClick={() => handleKeyPress('0')}
              className="h-12 rounded-full bg-[#111418] hover:bg-slate-800 active:bg-slate-750 text-white font-semibold text-lg border border-slate-800/60 hover:border-slate-700 transition cursor-pointer flex items-center justify-center active:scale-95"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-12 rounded-full bg-[#0F1217] text-rose-450 hover:bg-rose-950/20 active:bg-rose-950/40 border border-slate-800 flex items-center justify-center cursor-pointer active:scale-95 text-xs font-semibold"
            >
              Delete
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>Defaults - Manager: PIN <strong>1111</strong> | Attendant: PIN <strong>2222</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
