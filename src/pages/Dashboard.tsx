import { useState } from 'react';
import { 
  TrendingUp, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  UserPlus,
  Calendar as CalendarIcon,
  FileText,
  X,
  Download,
  Share2,
  Loader2,
  Users
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { cn, formatMoney, formatMoneyCompact } from '@/src/lib/utils';
import { appPath } from '../lib/routes';

const REVENUE_DATA_6M = [
  { name: 'Nov', income: 84_000_000, projects: 3 },
  { name: 'Dec', income: 100_800_000, projects: 4 },
  { name: 'Jan', income: 96_000_000, projects: 4 },
  { name: 'Feb', income: 72_000_000, projects: 3 },
  { name: 'Mar', income: 120_000_000, projects: 5 },
  { name: 'Apr', income: 108_000_000, projects: 6 },
];

const REVENUE_DATA_1Y = [
  { name: 'May', income: 67_200_000, projects: 2 },
  { name: 'Jun', income: 76_800_000, projects: 3 },
  { name: 'Jul', income: 98_400_000, projects: 4 },
  { name: 'Aug', income: 91_200_000, projects: 3 },
  { name: 'Sep', income: 108_000_000, projects: 5 },
  { name: 'Oct', income: 93_600_000, projects: 4 },
  ...REVENUE_DATA_6M
];

import { useProjects } from '../context/ProjectsContext';
import {
  countRunningProjects,
  countCompletedProjects,
  countPendingTasks,
  sumProjectAmounts,
} from '../lib/dashboardStats';

export default function Dashboard() {
  const { user } = useAuth();
  const { t, language } = useSettings();
  const navigate = useNavigate();
  const { projects, partners, isLoading } = useProjects();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeRange, setTimeRange] = useState<'6M' | '1Y'>('6M');

  const activeProjectsCount = countRunningProjects(projects);
  const completedProjectsCount = countCompletedProjects(projects);
  const totalRevenue = sumProjectAmounts(projects);
  const pendingTasksCount = countPendingTasks(projects);

  const stats: {
    label: string;
    value: string;
    icon: typeof Wallet;
    color: string;
    change?: string;
    trend?: 'up' | 'down';
  }[] = [
    {
      label: t('total_revenue'),
      value: formatMoney(totalRevenue, language),
      icon: Wallet,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: t('active_projects'),
      value: activeProjectsCount.toString(),
      icon: Briefcase,
      color: 'bg-accent-light text-accent-primary',
    },
    {
      label: t('completed'),
      value: completedProjectsCount.toString(),
      icon: CheckCircle2,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: t('pending_tasks'),
      value: pendingTasksCount.toString(),
      icon: Clock,
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  // Report Modal State
  const [reportType, setReportType] = useState<'Monthly' | 'Project'>('Monthly');
  const [reportTimeRange, setReportTimeRange] = useState('Last 30 Days');
  const [includeOptions, setIncludeOptions] = useState<string[]>([
    'revenue_charts',
    'project_progress',
    'payment_status',
    'partner_contributions'
  ]);

  const chartData = timeRange === '6M' ? REVENUE_DATA_6M : REVENUE_DATA_1Y;

  const handleNewReport = () => {
    setIsReportModalOpen(true);
  };

  const toggleIncludeOption = (option: string) => {
    setIncludeOptions(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  const generateReport = () => {
    if (includeOptions.length === 0) {
      alert(t('select_at_least_one'));
      return;
    }

    setIsGenerating(true);
    console.log('Generating Report:', {
      type: reportType,
      range: reportTimeRange,
      included: includeOptions
    });

    setTimeout(() => {
      setIsGenerating(false);
      alert(t('report_generated'));
      setIsReportModalOpen(false);
    }, 2000);
  };

  const handleShareReport = () => {
    const shareData = {
      title: t('new_report'),
      text: `${t('new_report')} ${reportTimeRange}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData)
        .catch((error) => console.log('Error sharing', error));
    } else {
      navigator.clipboard.writeText(shareData.url);
      alert(t('copy_clipboard'));
    }
  };

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'new_project':
        navigate(appPath('/projects'), { state: { openModal: true } });
        break;
      case 'invite_partner':
        navigate(appPath('/partners'));
        break;
      case 'schedule_meeting':
        navigate(appPath('/calendar'));
        break;
      case 'view_analytics':
        const chartElement = document.getElementById('revenue-chart');
        if (chartElement) {
          chartElement.scrollIntoView({ behavior: 'smooth' });
        }
        break;
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('welcome_back')}, {user?.name?.split(' ')[0] || 'there'}!</h1>
          <p className="text-slate-500 mt-1">{t('daily_summary')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleNewReport}
            className="bg-accent-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-accent-primary/20 flex items-center gap-2"
          >
            <FileText size={18} />
            <span>{t('new_report')}</span>
          </button>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Plus, label: t('new_project'), color: 'text-accent-primary', bg: 'bg-accent-light', action: 'new_project' },
          { icon: UserPlus, label: t('invite_partner'), color: 'text-emerald-600', bg: 'bg-emerald-50', action: 'invite_partner' },
          { icon: CalendarIcon, label: t('schedule'), color: 'text-blue-600', bg: 'bg-blue-50', action: 'schedule_meeting' },
          { icon: TrendingUp, label: t('analytics'), color: 'text-amber-600', bg: 'bg-amber-50', action: 'view_analytics' },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => handleQuickAction(action.action)}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-left"
          >
            <div className={`p-2.5 rounded-xl ${action.bg} ${action.color}`}>
              <action.icon size={20} />
            </div>
            <span className="text-sm font-bold text-slate-700">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              {stat.change != null && stat.trend != null ? (
                <div
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                    stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {stat.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.change}
                </div>
              ) : null}
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>


      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div id="revenue-chart" className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">{t('revenue_overview')}</h3>
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '6M' | '1Y')}
              className="bg-slate-50 border-none rounded-lg text-sm px-3 py-1.5 outline-none focus:ring-2 focus:ring-accent-primary/20 cursor-pointer"
            >
              <option value="6M">{t('last_6_months')}</option>
              <option value="1Y">{t('last_year')}</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary-hex, #4f46e5)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--accent-primary-hex, #4f46e5)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={(value) => formatMoneyCompact(Number(value), language)}
                />
                <Tooltip 
                  formatter={(value: number) => formatMoney(Number(value), language)}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="var(--accent-primary-hex, #4f46e5)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">{t('team_members')}</h3>
            <button
              onClick={() => navigate(appPath('/team'))}
              className="text-xs font-bold text-accent-primary hover:underline"
            >
              {t('manage_team')}
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded w-24" />
                    <div className="h-2 bg-slate-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">{t('no_team_members')}</p>
              <button
                onClick={() => navigate(appPath('/team'), { state: { openAdd: true } })}
                className="mt-3 text-xs font-bold text-accent-primary hover:underline"
              >
                {t('add_first_member')}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-5">
                {partners.slice(0, 5).map((member) => {
                  const memberProjects = projects.filter(p => p.partnerId === member.id);
                  const workload = Math.min(memberProjects.length * 25, 100);
                  return (
                    <div key={member.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-8 h-8 rounded-lg object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-accent-light rounded-lg flex items-center justify-center text-[10px] font-bold text-accent-primary">
                              {member.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-slate-900">{member.name}</p>
                            <p className="text-[10px] text-slate-400">{member.role || 'Member'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">
                          {memberProjects.length} {memberProjects.length === 1 ? t('project_count_one') : t('project_count_other')}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            workload > 90 ? 'bg-rose-500' :
                            workload > 70 ? 'bg-amber-500' : 'bg-accent-primary'
                          }`}
                          style={{ width: `${Math.max(workload, 10)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">{partners.length} {t('members_total')}</span>
                </div>
                <div className="flex -space-x-2">
                  {partners.slice(0, 4).map(member => (
                    member.avatar ? (
                      <img
                        key={member.id}
                        src={member.avatar}
                        alt={member.name}
                        className="w-6 h-6 rounded-full border-2 border-white object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div key={member.id} className="w-6 h-6 rounded-full border-2 border-white bg-accent-light flex items-center justify-center text-[8px] font-bold text-accent-primary">
                        {member.name.charAt(0)}
                      </div>
                    )
                  ))}
                  {partners.length > 4 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500">
                      +{partners.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <header className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{t('generate_report')}</h3>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </header>
              
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('report_type')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setReportType('Monthly')}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-sm",
                          reportType === 'Monthly' 
                            ? "bg-white border-2 border-accent-primary text-accent-primary" 
                            : "bg-white border border-slate-100 text-slate-500 hover:border-slate-200"
                        )}
                      >
                        {t('monthly_summary')}
                      </button>
                      <button 
                        onClick={() => setReportType('Project')}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-sm",
                          reportType === 'Project' 
                            ? "bg-white border-2 border-accent-primary text-accent-primary" 
                            : "bg-white border border-slate-100 text-slate-500 hover:border-slate-200"
                        )}
                      >
                        {t('project_specific')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('time_range')}</label>
                    <select 
                      value={reportTimeRange}
                      onChange={(e) => setReportTimeRange(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none cursor-pointer"
                    >
                      <option value="Last 30 Days">{t('last_30_days')}</option>
                      <option value="Last Quarter">{t('last_quarter')}</option>
                      <option value="Last Year">{t('last_year_vi')}</option>
                      <option value="Custom Range">{t('custom_range')}</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('include_in_report')}</p>
                    <div className="space-y-2">
                      {[
                        { id: 'revenue_charts', label: t('revenue_charts') },
                        { id: 'project_progress', label: t('project_progress') },
                        { id: 'payment_status', label: t('payment_status') },
                        { id: 'partner_contributions', label: t('partner_contributions') }
                      ].map(item => (
                        <label key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={includeOptions.includes(item.id)}
                            onChange={() => toggleIncludeOption(item.id)}
                            className="w-4 h-4 rounded border-slate-300 text-accent-primary focus:ring-accent-primary"
                          />
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={generateReport}
                    disabled={isGenerating}
                    className="flex-1 py-3 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {t('generating')}
                      </>
                    ) : (
                      <>
                        <FileText size={18} />
                        {t('generate_pdf')}
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleShareReport}
                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
