/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  ArrowRight, 
  Plus, 
  FileText, 
  Wrench, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileDown,
  Search,
  Filter,
  RefreshCw,
  LayoutDashboard,
  Heart,
  TrendingUp,
  Activity,
  Settings,
  Pencil,
  Trash2,
  X,
  User,
  Calendar,
  List,
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  LabelList,
  Label
} from 'recharts';
import { jsPDF } from 'jspdf';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { useLiftData } from './data';
import { Building, Lift, ServiceReport, BreakdownReport } from './types';
import LiftStatusView from './components/LiftStatusView';
import Login from './components/Login';
import { LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = React.useState(auth.currentUser);
  const [authLoading, setAuthLoading] = React.useState(true);

  React.useEffect(() => {
    return auth.onAuthStateChanged((user) => {
      setUser(user);
      setAuthLoading(false);
    });
  }, []);

  const { 
    buildings, lifts, reports, breakdowns, loading: dataLoading,
    addReport, deleteReport, updateLiftStatus, 
    addBuilding, updateBuilding, deleteBuilding,
    addLift, updateLift, deleteLift,
    addBreakdown, updateBreakdown, deleteBreakdown
  } = useLiftData();

  const [activeView, setActiveView] = useState<'overview' | 'dashboard' | 'history' | 'breakdowns' | 'alerts' | 'liftStatus'>('overview');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // History & Breakdown Filters
  const [historySearch, setHistorySearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [breakdownDateFrom, setBreakdownDateFrom] = useState('');
  const [breakdownDateTo, setBreakdownDateTo] = useState('');

  // Modals state
  const [showAddReport, setShowAddReport] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState<{show: boolean, breakdown?: BreakdownReport}>({ show: false });
  const [showBuildingModal, setShowBuildingModal] = useState<{show: boolean, building?: Building}>({ show: false });
  const [showLiftModal, setShowLiftModal] = useState<{show: boolean, lift?: Lift}>({ show: false });
  
  const [selectedLiftId, setSelectedLiftId] = useState<string>('');
  
  const activityTrendData = useMemo(() => {
    const days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const maintenanceCount = reports.filter(r => r.date === dateStr).length;
      const breakdownCount = breakdowns.filter(b => b.date === dateStr).length;
      
      days.push({
        name: dayName,
        Breakdowns: breakdownCount,
        Maintenance: maintenanceCount,
      });
    }
    return days;
  }, [reports, breakdowns]);

  const unitStatusData = useMemo(() => [
    { name: 'Operational', value: lifts.filter(l => l.status === 'Operational').length, color: '#064e3b' },
    { name: 'Maintenance', value: lifts.filter(l => l.status === 'Maintenance').length, color: '#0d9488' },
    { name: 'Out of Order', value: lifts.filter(l => l.status === 'Out of Order').length, color: '#dc2626' },
    { name: 'Not operational', value: lifts.filter(l => l.status === 'Not operational').length, color: '#94a3b8' },
  ], [lifts]);

  const fleetHealth = useMemo(() => {
    if (lifts.length === 0) return 0;
    return Math.round((lifts.filter(l => l.status === 'Operational').length / lifts.length) * 100);
  }, [lifts]);

  const selectedBuilding = useMemo(() => 
    buildings.find(b => b.id === selectedBuildingId), 
    [buildings, selectedBuildingId]
  );

  const buildingLifts = useMemo(() => 
    lifts.filter(l => l.buildingId === selectedBuildingId), 
    [lifts, selectedBuildingId]
  );

  const alertLifts = useMemo(() => 
    lifts.filter(l => l.status === 'Maintenance' || l.status === 'Out of Order' || l.status === 'Not operational'),
    [lifts]
  );

  const filteredReports = useMemo(() => {
    let result = reports;
    if (selectedBuildingId && activeView !== 'history') {
      result = result.filter(r => r.buildingId === selectedBuildingId);
    }
    
    if (activeView === 'history') {
      if (historySearch) {
        const query = historySearch.toLowerCase();
        result = result.filter(r => 
          r.technician.toLowerCase().includes(query) || 
          r.description.toLowerCase().includes(query) ||
          lifts.find(l => l.id === r.liftId)?.name.toLowerCase().includes(query) ||
          buildings.find(b => b.id === r.buildingId)?.name.toLowerCase().includes(query)
        );
      }
      if (dateFrom) result = result.filter(r => r.date >= dateFrom);
      if (dateTo) result = result.filter(r => r.date <= dateTo);
    }
    
    return result;
  }, [reports, selectedBuildingId, activeView, historySearch, dateFrom, dateTo, lifts, buildings]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Initialising Systems</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Syncing with Cloud</p>
        </div>
      </div>
    );
  }

  const handleExportPDF = (title: string) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(6, 78, 59); // GITAM Green
    doc.text(title.toUpperCase(), 20, 20);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 25, 190, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 32);
    
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('This is a summary report of lift activity and maintenance logs.', 20, 45);
    doc.text('For detailed logs, please refer to the digital dashboard.', 20, 52);
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Directorate of Hospitality • GITAM Deemed to be University', 20, 280);
    
    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  const handleViewServicePDF = (report: ServiceReport) => {
    const building = buildings.find(b => b.id === report.buildingId);
    const lift = lifts.find(l => l.id === report.liftId);
    
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(6, 78, 59); // GITAM Green
    doc.text('GITAM LIFT SERVICE REPORT', 20, 20);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 25, 190, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Report ID: ${report.id}`, 20, 35);
    doc.text(`Date: ${report.date}`, 150, 35);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.text('Asset Details', 20, 50);
    doc.setFontSize(11);
    doc.text(`Building: ${building?.name || 'N/A'}`, 20, 60);
    doc.text(`Lift Unit: ${lift?.name || 'N/A'}`, 20, 67);
    doc.text(`Technician: ${report.technician}`, 20, 74);
    
    doc.setFontSize(14);
    doc.text('Service Summary', 20, 90);
    doc.setFontSize(11);
    const descriptionLines = doc.splitTextToSize(report.description, 170);
    doc.text(descriptionLines, 20, 100);
    
    let currentY = 100 + (descriptionLines.length * 7);
    
    if (report.partsReplaced.length > 0) {
      doc.setFontSize(14);
      doc.text('Parts Replaced', 20, currentY + 10);
      doc.setFontSize(11);
      doc.text(report.partsReplaced.join(', '), 20, currentY + 20);
      currentY += 25;
    }
    
    doc.setFontSize(14);
    doc.text('Status & Cost', 20, currentY + 10);
    doc.setFontSize(11);
    doc.text(`Final Status: ${report.status}`, 20, currentY + 20);
    doc.text(`Service Cost: ${report.cost}`, 20, currentY + 27);
    doc.text(`Next Service: ${report.nextServiceDate}`, 20, currentY + 34);
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Directorate of Hospitality • GITAM Deemed to be University', 20, 280);
    
    doc.save(`service_report_${report.id}.pdf`);
  };

  const handleAddReport = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newReport: ServiceReport = {
      id: crypto.randomUUID(),
      liftId: formData.get('liftId') as string,
      buildingId: selectedBuildingId!,
      date: formData.get('date') as string,
      technician: formData.get('technician') as string,
      description: formData.get('description') as string,
      partsReplaced: (formData.get('parts') as string).split(',').map(p => p.trim()).filter(p => p),
      nextServiceDate: formData.get('nextDate') as string,
      cost: formData.get('cost') as string,
      status: formData.get('status') as ServiceReport['status'],
    };
    addReport(newReport);
    setShowAddReport(false);
  };

  const handleBuildingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;

    if (showBuildingModal.building) {
      updateBuilding(showBuildingModal.building.id, { name, location });
    } else {
      addBuilding({ id: crypto.randomUUID(), name, location });
    }
    setShowBuildingModal({ show: false });
  };

  const handleLiftSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const area = formData.get('area') as string;
    const model = formData.get('model') as string;
    const status = formData.get('status') as Lift['status'];

    if (showLiftModal.lift) {
      updateLift(showLiftModal.lift.id, { name, area, model, status });
    } else {
      addLift({ 
        id: crypto.randomUUID(), 
        buildingId: selectedBuildingId!, 
        name, 
        area,
        model, 
        status,
        lastServiceDate: '' 
      });
    }
    setShowLiftModal({ show: false });
  };

  const handleBreakdownSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const liftId = formData.get('liftId') as string;
    const lift = lifts.find(l => l.id === liftId);
    
    const breakdownData = {
      liftId,
      buildingId: lift?.buildingId || '',
      date: formData.get('date') as string,
      technician: formData.get('technician') as string,
      issue: formData.get('issue') as string,
      resolution: formData.get('resolution') as string,
      status: formData.get('status') as 'Resolved' | 'Pending' | 'In Progress',
    };

    if (showBreakdownModal.breakdown) {
      updateBreakdown(showBreakdownModal.breakdown.id, breakdownData);
    } else {
      addBreakdown({
        id: crypto.randomUUID(),
        ...breakdownData
      });
    }
    setShowBreakdownModal({ show: false });
  };

  const getStatusIcon = (status: Lift['status']) => {
    switch (status) {
      case 'Operational': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Maintenance': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Out of Order': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'Not operational': return <AlertCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: Lift['status']) => {
    switch (status) {
      case 'Operational': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Maintenance': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Out of Order': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Not operational': return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <nav className={`fixed left-0 top-0 h-full ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#f8fafc] border-r border-slate-200 flex flex-col z-10 transition-all duration-300`}>
        <div className={`p-6 mb-2 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shrink-0">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-bold text-lg tracking-tight text-slate-900 truncate">LiftReport</h1>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shrink-0">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors ${!isSidebarCollapsed ? '' : 'absolute -right-3 top-7 bg-white border border-slate-200 shadow-sm z-20'}`}
          >
            {isSidebarCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="px-4 space-y-1.5 flex-1">
          <button 
            onClick={() => { setActiveView('overview'); setSelectedBuildingId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${activeView === 'overview' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50' : 'text-slate-500 hover:bg-slate-100'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Dashboard' : ''}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </button>
          <button 
            onClick={() => setActiveView('alerts')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${activeView === 'alerts' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50' : 'text-slate-500 hover:bg-slate-100'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Alerts' : ''}
          >
            <div className="relative shrink-0">
              <AlertCircle className="w-4 h-4" />
              {alertLifts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white" />
              )}
            </div>
            {!isSidebarCollapsed && <span>Alerts</span>}
          </button>
          <button 
            onClick={() => { setActiveView('dashboard'); setSelectedBuildingId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${activeView === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50' : 'text-slate-500 hover:bg-slate-100'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Buildings' : ''}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Buildings</span>}
          </button>
          <button 
            onClick={() => setActiveView('history')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${activeView === 'history' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50' : 'text-slate-500 hover:bg-slate-100'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Service History' : ''}
          >
            <FileText className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Service History</span>}
          </button>
          <button 
            onClick={() => setActiveView('breakdowns')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${activeView === 'breakdowns' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50' : 'text-slate-500 hover:bg-slate-100'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Breakdown Reports' : ''}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Breakdown Reports</span>}
          </button>
          <button 
            onClick={() => setActiveView('liftStatus')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${activeView === 'liftStatus' ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm shadow-indigo-100/50' : 'text-slate-500 hover:bg-slate-100'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Lift Status' : ''}
          >
            <List className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Lift Status</span>}
          </button>
        </div>

        <div className="p-4 mt-auto border-t border-slate-100 bg-white">
          <div className={`flex items-center gap-2 mb-4 ${isSidebarCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
            {!isSidebarCollapsed && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connected</span>}
          </div>
          
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 shadow-sm">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-slate-400" />
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.displayName || 'Technician'}</p>
                <button 
                  onClick={() => signOut(auth)}
                  className="text-[10px] font-medium text-slate-400 hover:text-rose-600 uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  Log Out
                </button>
              </div>
            )}
            {isSidebarCollapsed && (
               <button 
                onClick={() => signOut(auth)}
                className="absolute right-2 p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-400 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
                title="Log Out"
               >
                 <LogOut className="w-3 h-3" />
               </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} p-10 max-w-[1400px] mx-auto transition-all duration-300`}>
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">System Dashboard</h2>
                <p className="text-slate-400 mt-1 font-medium text-sm">Real-time overview of lift infrastructure performance.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Buildings</p>
                  <p className="text-4xl font-black text-slate-900">{buildings.length}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                    <Settings className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Units</p>
                  <p className="text-4xl font-black text-slate-900">{lifts.length}</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                    <Heart className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Fleet Health</p>
                  <p className="text-4xl font-black text-slate-900">{fleetHealth}%</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Critical Units</p>
                  <p className="text-4xl font-black text-slate-900">{alertLifts.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Activity Trend</h3>
                      <p className="text-slate-400 text-xs font-medium mt-1">Breakdowns vs Maintenance (Last 7 Days)</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-slate-200" />
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={8} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        />
                        <Legend iconType="circle" align="right" verticalAlign="top" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                        <Bar dataKey="Breakdowns" fill="#dc2626" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="Breakdowns" position="top" style={{ fill: '#dc2626', fontSize: '10px', fontWeight: 700 }} />
                        </Bar>
                        <Bar dataKey="Maintenance" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="Maintenance" position="top" style={{ fill: '#4f46e5', fontSize: '10px', fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Unit Status</h3>
                      <p className="text-slate-400 text-xs font-medium mt-1">Fleet operational health</p>
                    </div>
                    <Activity className="w-5 h-5 text-slate-200" />
                  </div>
                  <div className="h-[300px] w-full flex flex-col items-center justify-center">
                    {lifts.length === 0 ? (
                      <div className="text-center">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No Data Available</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={unitStatusData}
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ value }) => value}
                          >
                            {unitStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div className="flex items-center gap-3 mb-8">
                    <Wrench className="w-5 h-5 text-indigo-500" />
                    <h4 className="text-sm font-black text-slate-900">Recent Services</h4>
                  </div>
                  {reports.length === 0 ? (
                    <p className="text-center text-xs font-bold text-slate-300 py-10">No recent activity.</p>
                  ) : (
                    <div className="space-y-6">
                      {reports.slice(0, 3).map(r => (
                        <div key={r.id} className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                            <FileText className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{lifts.find(l => l.id === r.liftId)?.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{r.date}</p>
                          </div>
                          <p className="text-xs font-black text-slate-900">{r.cost}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div className="flex items-center gap-3 mb-8">
                    <Heart className="w-5 h-5 text-rose-500" />
                    <h4 className="text-sm font-black text-slate-900">Predictive Maintenance</h4>
                  </div>
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">All units are in good health!</p>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                  <div className="flex items-center gap-3 mb-8">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <h4 className="text-sm font-black text-slate-900">Urgent Breakdowns</h4>
                  </div>
                  <div className="text-center py-6">
                    {breakdowns.filter(b => b.status === 'Pending' || b.status === 'In Progress').length === 0 ? (
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">All clear! No urgent breakdowns.</p>
                    ) : (
                      <div className="space-y-4">
                        {breakdowns.filter(b => b.status === 'Pending' || b.status === 'In Progress').slice(0, 2).map(b => (
                          <div key={b.id} className="p-4 bg-teal-50 rounded-2xl border border-teal-100 text-left">
                            <p className="text-xs font-black text-[#064e3b]">
                              {lifts.find(l => l.id === b.liftId)?.name}
                              <span className="text-[10px] font-bold text-teal-400 ml-2 uppercase">
                                ({buildings.find(bu => bu.id === lifts.find(l => l.id === b.liftId)?.buildingId)?.name})
                              </span>
                            </p>
                            <p className="text-[10px] text-teal-600 mt-1 line-clamp-1">{b.issue}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'alerts' && (
            <motion.div 
              key="alerts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Inspection Alerts</h2>
                <p className="text-slate-400 mt-1 font-medium text-sm">Lifts requiring mandatory inspections soon.</p>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] min-h-[400px] flex flex-col items-center justify-center p-10">
                {alertLifts.length === 0 ? (
                  <div className="text-center max-w-sm">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Everything looks good</h3>
                    <p className="text-slate-400 font-medium text-sm leading-relaxed">
                      No lifts have mandatory inspections scheduled in the next 30 days.
                    </p>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                    {alertLifts.map((lift) => (
                      <div key={lift.id} className="w-full bg-slate-50/50 rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lift.status === 'Out of Order' ? 'bg-rose-50' : 'bg-amber-50'}`}>
                            {getStatusIcon(lift.status)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-semibold text-slate-900">{lift.name}</h4>
                              <span className="text-slate-300">•</span>
                              <p className="text-sm font-medium text-slate-500">{buildings.find(b => b.id === lift.buildingId)?.name}</p>
                            </div>
                            <p className="text-sm text-slate-400 mt-0.5">{lift.model}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${getStatusColor(lift.status)}`}>
                            {lift.status}
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedBuildingId(lift.buildingId);
                              setActiveView('dashboard');
                            }}
                            className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
                          >
                            View Details
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'dashboard' && !selectedBuildingId && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">Portfolio Overview</h2>
                  <p className="text-slate-500 mt-1">Manage buildings and lift units.</p>
                </div>
                <button 
                  onClick={() => setShowBuildingModal({ show: true })}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Building
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buildings.map((building) => {
                  const bLifts = lifts.filter(l => l.buildingId === building.id);
                  const activeCount = bLifts.filter(l => l.status === 'Operational').length;
                  
                  return (
                    <motion.div
                      key={building.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <button 
                            onClick={() => setSelectedBuildingId(building.id)}
                            className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors"
                          >
                            <Building2 className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                          </button>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setShowBuildingModal({ show: true, building })}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteBuilding(building.id)}
                              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => setSelectedBuildingId(building.id)}
                          className="text-left w-full"
                        >
                          <h3 className="text-lg font-semibold text-slate-900">{building.name}</h3>
                          <p className="text-sm text-slate-500 mb-6">{building.location}</p>
                        </button>
                        
                        <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                          <div>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Units</p>
                            <p className="text-lg font-bold text-slate-900">{bLifts.length}</p>
                          </div>
                          <div className="w-px h-8 bg-slate-100" />
                          <div>
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Operational</p>
                            <p className="text-lg font-bold text-emerald-600">{activeCount}</p>
                          </div>
                          <button 
                            onClick={() => setSelectedBuildingId(building.id)}
                            className="ml-auto p-2 text-slate-300 group-hover:text-indigo-600 transition-colors"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeView === 'dashboard' && selectedBuildingId && (
            <motion.div 
              key="building-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button 
                onClick={() => setSelectedBuildingId(null)}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to Portfolio
              </button>

              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">{selectedBuilding?.name}</h2>
                  <p className="text-slate-500 mt-1">{selectedBuilding?.location} • {buildingLifts.length} Lift Units</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowLiftModal({ show: true })}
                    className="flex items-center gap-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Lift Unit
                  </button>
                  <button 
                    onClick={() => {
                      setShowAddReport(true);
                      if (buildingLifts.length > 0) setSelectedLiftId(buildingLifts[0].id);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Service Report
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {buildingLifts.map((lift) => (
                  <div key={lift.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-slate-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">{lift.name}</h4>
                        <p className="text-sm text-slate-500">{lift.model}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-1 text-left md:text-center px-0 md:px-8">
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Last Service</p>
                      <p className="text-sm font-semibold text-slate-700">{lift.lastServiceDate || 'No record'}</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all ${getStatusColor(lift.status)}`}>
                          {getStatusIcon(lift.status)}
                          {lift.status}
                        </div>
                        
                        <div className="flex gap-1">
                          {(['Operational', 'Maintenance', 'Out of Order', 'Not operational'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => updateLiftStatus(lift.id, status)}
                              title={`Set as ${status}`}
                              className={`p-1.5 rounded-lg transition-all hover:scale-110 shadow-sm border ${
                                lift.status === status 
                                  ? 'bg-white text-indigo-600 border-indigo-200 ring-2 ring-indigo-50 cursor-default' 
                                  : 'bg-white text-slate-400 border-slate-100 hover:text-indigo-600 hover:border-indigo-100'
                              }`}
                            >
                              {status === 'Operational' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                               status === 'Maintenance' ? <Clock className="w-3.5 h-3.5" /> :
                               <AlertCircle className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowLiftModal({ show: true, lift })}
                          className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteLift(lift.id)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Recent Reports for this Building</h3>
                <div className="space-y-4">
                  {filteredReports.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No service reports recorded for this building yet.</p>
                    </div>
                  ) : (
                    filteredReports.map((report) => (
                      <div key={report.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">Service Log</span>
                            <h4 className="text-lg font-bold text-slate-900 mt-2">{lifts.find(l => l.id === report.liftId)?.name || 'Unknown Unit'}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {report.date}</span>
                              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {report.technician}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-slate-900">{report.cost}</p>
                            <p className="text-xs text-slate-400">Service Cost</p>
                          </div>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed mb-4">{report.description}</p>
                        {report.partsReplaced.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {report.partsReplaced.map((part, i) => (
                              <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                                {part}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
                          <span className="text-slate-400">Next Scheduled Service: <span className="text-indigo-600 font-semibold">{report.nextServiceDate}</span></span>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => handleViewServicePDF(report)}
                              className="text-indigo-600 font-medium hover:underline"
                            >
                              View PDF
                            </button>
                            <button 
                              onClick={() => {
                                deleteReport(report.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete Service Log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">Service History</h2>
                  <p className="text-slate-400 mt-1 font-medium text-sm">Complete log of all maintenance activities.</p>
                </div>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                  <div className="flex items-center bg-white rounded-xl border border-slate-100 px-4 py-2.5 shadow-sm">
                    <Filter className="w-4 h-4 text-slate-300 mr-3" />
                    <input 
                      type="date" 
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="text-xs font-bold text-slate-600 outline-none bg-transparent"
                    />
                    <ArrowRight className="w-3 h-3 text-slate-200 mx-2" />
                    <input 
                      type="date" 
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="text-xs font-bold text-slate-600 outline-none bg-transparent"
                    />
                  </div>
                  <button 
                    onClick={() => handleExportPDF('Maintenance Logs')}
                    className="flex items-center justify-center gap-2 bg-white text-indigo-600 border border-slate-100 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all"
                  >
                    <FileDown className="w-4 h-4" />
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="max-w-md">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search logs..." 
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden min-h-[400px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="px-10 py-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Date & Technician</th>
                      <th className="px-6 py-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Asset</th>
                      <th className="px-6 py-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Status</th>
                      <th className="px-6 py-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Observation</th>
                      <th className="px-6 py-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Parts</th>
                      <th className="px-10 py-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-6 h-6 text-slate-200" />
                          </div>
                          <h4 className="text-xl font-black text-slate-900 mb-1">No results found</h4>
                          <p className="text-slate-400 font-medium text-xs">Try adjusting your search or filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((report) => {
                        const b = buildings.find(b => b.id === report.buildingId);
                        const l = lifts.find(l => l.id === report.liftId);
                        return (
                          <tr key={report.id} className="hover:bg-slate-50/30 transition-colors group">
                            <td className="px-10 py-6">
                              <p className="text-sm font-bold text-slate-900">{report.date}</p>
                              <p className="text-xs text-slate-400 font-medium mt-0.5">{report.technician}</p>
                            </td>
                            <td className="px-6 py-6">
                              <p className="text-sm font-bold text-slate-900">{l?.name || 'Deleted Unit'}</p>
                              <p className="text-xs text-slate-400 font-medium mt-0.5">{b?.name || 'Deleted Building'}</p>
                            </td>
                            <td className="px-6 py-6">
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg uppercase tracking-wider border border-emerald-100">Completed</span>
                            </td>
                            <td className="px-6 py-6">
                              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs line-clamp-2">{report.description}</p>
                            </td>
                            <td className="px-6 py-6">
                              <p className="text-xs font-bold text-slate-900">{report.partsReplaced.length} items</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate max-w-[150px]">{report.partsReplaced.join(', ')}</p>
                            </td>
                            <td className="px-10 py-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleViewServicePDF(report)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                  title="View PDF"
                                >
                                  <FileText className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => {
                                    deleteReport(report.id);
                                  }}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                  title="Delete Service Log"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
          {activeView === 'breakdowns' && (
            <motion.div 
              key="breakdowns"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">Breakdown Reports</h2>
                  <p className="text-slate-400 mt-1 font-medium text-sm">Track and manage emergency lift breakdowns.</p>
                </div>
                <div className="flex flex-col items-end gap-4">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                    <div className="flex items-center bg-white rounded-full border border-slate-100 px-6 py-3 shadow-sm">
                      <Filter className="w-4 h-4 text-slate-300 mr-3" />
                      <input 
                        type="date" 
                        value={breakdownDateFrom}
                        onChange={(e) => setBreakdownDateFrom(e.target.value)}
                        className="text-xs font-bold text-slate-600 outline-none bg-transparent"
                      />
                      <ArrowRight className="w-3 h-3 text-slate-200 mx-3" />
                      <input 
                        type="date" 
                        value={breakdownDateTo}
                        onChange={(e) => setBreakdownDateTo(e.target.value)}
                        className="text-xs font-bold text-slate-600 outline-none bg-transparent"
                      />
                    </div>
                    <button 
                      onClick={() => handleExportPDF('Breakdown Reports')}
                      className="flex items-center justify-center gap-2 bg-white text-slate-600 border border-slate-100 px-6 py-3 rounded-full text-xs font-black shadow-sm hover:shadow-md transition-all uppercase tracking-widest"
                    >
                      <FileDown className="w-4 h-4" />
                      Export PDF
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowBreakdownModal({ show: true })}
                    className="flex items-center gap-2 bg-[#ff1e39] text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4" />
                    Log Breakdown
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-[48px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)] min-h-[500px] flex flex-col items-center justify-center p-10">
                {breakdowns.length === 0 ? (
                  <div className="text-center max-w-sm">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-10 shadow-sm border border-slate-100">
                      <AlertCircle className="w-10 h-10 text-slate-200" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No breakdown reports recorded.</h3>
                    <p className="text-slate-400 font-medium text-sm leading-relaxed">
                      All systems are running smoothly.
                    </p>
                  </div>
                ) : (
                  <div className="w-full space-y-6">
                    {breakdowns
                      .filter(b => (!breakdownDateFrom || b.date >= breakdownDateFrom) && (!breakdownDateTo || b.date <= breakdownDateTo))
                      .map((b) => {
                        const building = buildings.find(building => building.id === b.buildingId);
                        const lift = lifts.find(lift => lift.id === b.liftId);
                        return (
                          <div key={b.id} className="bg-slate-50/30 rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-md transition-all relative group hover:bg-white">
                            <div className="absolute top-8 right-8 flex items-center gap-3">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${b.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : b.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                {b.status}
                              </span>
                              
                              <div className="flex bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
                                <button 
                                  onClick={() => setShowBreakdownModal({ show: true, breakdown: b })}
                                  className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all text-[10px] font-black uppercase tracking-tight"
                                  title="Update Status / Resolution"
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                  Update
                                </button>
                                <div className="w-px h-4 bg-slate-100 self-center" />
                                <button 
                                  onClick={() => deleteBreakdown(b.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Delete Report"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-start gap-6">
                              <div className={`p-4 rounded-2xl ${b.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                <AlertCircle className="w-8 h-8" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-xl font-bold text-slate-900">{lift?.name || 'Unknown Unit'}</h3>
                                  <span className="text-slate-300">•</span>
                                  <p className="text-slate-500 font-medium">{building?.name || 'Deleted Building'}</p>
                                </div>
                                
                                <div className="flex items-center gap-6 mb-6 text-sm text-slate-500">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {b.date}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <span className="font-semibold text-slate-700">{b.technician}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div>
                                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Issue Reported</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed bg-white p-5 rounded-2xl border border-slate-100">{b.issue}</p>
                                  </div>
                                  <div>
                                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Resolution</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed bg-white p-5 rounded-2xl border border-slate-100">
                                      {b.resolution || 'Resolution pending...'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'liftStatus' && (
            <motion.div 
              key="liftStatus"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Infrastructure Status</h2>
                <p className="text-slate-400 mt-1 font-medium text-sm">Detailed operational status grid of all lift units.</p>
              </div>

              <LiftStatusView buildings={buildings} lifts={lifts} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Building Modal (Add/Edit) */}
      <AnimatePresence>
        {showBuildingModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBuildingModal({ show: false })} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">{showBuildingModal.building ? 'Edit Building' : 'Add New Building'}</h3>
                <button onClick={() => setShowBuildingModal({ show: false })} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleBuildingSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Building Name</label>
                  <input name="name" defaultValue={showBuildingModal.building?.name} required placeholder="e.g. Skyline Tower" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location / Address</label>
                  <input name="location" defaultValue={showBuildingModal.building?.location} required placeholder="e.g. 123 Main St" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition-colors mt-4 shadow-lg shadow-indigo-100">
                  {showBuildingModal.building ? 'Save Changes' : 'Create Building'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lift Modal (Add/Edit) */}
      <AnimatePresence>
        {showLiftModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLiftModal({ show: false })} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">{showLiftModal.lift ? 'Edit Lift' : 'Add New Lift'}</h3>
                <button onClick={() => setShowLiftModal({ show: false })} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleLiftSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lift Name/Identifier</label>
                  <input name="name" defaultValue={showLiftModal.lift?.name} required placeholder="e.g. Lift A" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Area (Optional)</label>
                  <input name="area" defaultValue={showLiftModal.lift?.area} placeholder="e.g. FRONT SIDE" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model/Brand</label>
                  <input name="model" defaultValue={showLiftModal.lift?.model} required placeholder="e.g. Otis Gen2" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status</label>
                  <select name="status" defaultValue={showLiftModal.lift?.status || 'Operational'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Operational">Operational</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Out of Order">Out of Order</option>
                    <option value="Not operational">Not operational</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition-colors mt-4 shadow-lg shadow-indigo-100">
                  {showLiftModal.lift ? 'Save Changes' : 'Add Lift Unit'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Breakdown Modal */}
      <AnimatePresence>
        {showBreakdownModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBreakdownModal({ show: false })} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-50/30">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  {showBreakdownModal.breakdown ? 'Rectify / Edit Breakdown' : 'Log Breakdown Report'}
                </h3>
                <button onClick={() => setShowBreakdownModal({ show: false })} className="p-2 hover:bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form 
                key={showBreakdownModal.breakdown?.id || 'new'}
                onSubmit={handleBreakdownSubmit} 
                className="p-8 space-y-5"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lift Unit</label>
                    <select name="liftId" required defaultValue={showBreakdownModal.breakdown?.liftId} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500">
                      {lifts.map(l => <option key={l.id} value={l.id}>{l.name} ({buildings.find(b => b.id === l.buildingId)?.name})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Breakdown Date</label>
                    <input type="date" name="date" required defaultValue={showBreakdownModal.breakdown?.date || new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technician Name</label>
                    <input type="text" name="technician" placeholder="e.g. Mike Smith" required defaultValue={showBreakdownModal.breakdown?.technician} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status</label>
                    <select name="status" defaultValue={showBreakdownModal.breakdown?.status || 'Pending'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500">
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Description</label>
                  <textarea name="issue" rows={3} required defaultValue={showBreakdownModal.breakdown?.issue} placeholder="Describe the fault or emergency..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none"></textarea>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolution Details</label>
                  <textarea name="resolution" rows={3} defaultValue={showBreakdownModal.breakdown?.resolution} placeholder="How was it fixed? (Required for Resolved status)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none"></textarea>
                </div>

                <button type="submit" className="w-full bg-rose-600 text-white font-bold py-4 rounded-2xl hover:bg-rose-700 transition-colors mt-4 shadow-lg shadow-rose-100">
                  {showBreakdownModal.breakdown ? 'Update & Rectify' : 'Save Breakdown Report'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Report Modal */}
      <AnimatePresence>
        {showAddReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddReport(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">Log New Service Report</h3>
                <button onClick={() => setShowAddReport(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddReport} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lift Unit</label>
                    <select 
                      name="liftId" 
                      required 
                      value={selectedLiftId}
                      onChange={(e) => setSelectedLiftId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {buildingLifts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Date</label>
                    <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technician</label>
                    <input type="text" name="technician" placeholder="Name" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Cost / Amount</label>
                    <input type="text" name="cost" placeholder="e.g. $450 or Covered by AMC" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description of Work</label>
                  <textarea name="description" rows={3} required placeholder="What was maintained or fixed?" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parts Replaced (comma separated)</label>
                  <input type="text" name="parts" placeholder="e.g. Fuse, Cable, Oil" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Next Service Date</label>
                    <input type="date" name="nextDate" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operational Status After Service</label>
                    <select name="status" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="Operational">Operational</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Out of Order">Out of Order</option>
                      <option value="Not operational">Not operational</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
                    Save Service Report
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
