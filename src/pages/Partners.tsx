import { useState, FormEvent } from 'react';
import { MOCK_PARTNERS, MOCK_PROJECTS } from '@/src/constants';
import { Mail, Phone, MoreVertical, Plus, MessageSquare, X, User, Briefcase, Trash2, Edit2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Partner, Project } from '@/src/types';
import { cn } from '@/src/lib/utils';

export default function Partners() {
  const [partners, setPartners] = useState<Partner[]>(MOCK_PARTNERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<Partial<Partner>>({
    name: '',
    role: '',
    email: '',
    avatar: '',
    projects: [],
  });

  const handleOpenModal = (partner?: Partner) => {
    if (partner) {
      setEditingPartner(partner);
      setFormData(partner);
    } else {
      setEditingPartner(null);
      setFormData({
        name: '',
        role: '',
        email: '',
        avatar: `https://i.pravatar.cc/150?u=${Math.random()}`,
        projects: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetail = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsDetailOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editingPartner) {
      setPartners(partners.map(p => p.id === editingPartner.id ? { ...p, ...formData } as Partner : p));
    } else {
      const newPartner: Partner = {
        ...formData,
        id: `p${Math.random().toString(36).substr(2, 9)}`,
      } as Partner;
      setPartners([newPartner, ...partners]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this partner?')) {
      setPartners(partners.filter(p => p.id !== id));
      if (selectedPartner?.id === id) setIsDetailOpen(false);
    }
  };

  const getPartnerProjects = (projectIds: string[]) => {
    return MOCK_PROJECTS.filter(p => projectIds.includes(p.id));
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Partners</h1>
          <p className="text-slate-500 mt-1">Collaborate with designers, developers, and stakeholders.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-accent-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-accent-primary/20 flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Add Partner</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map((partner, idx) => (
          <motion.div
            key={partner.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => handleOpenDetail(partner)}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-xl transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="relative">
                <img 
                  src={partner.avatar || `https://ui-avatars.com/api/?name=${partner.name}`} 
                  alt={partner.name} 
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleOpenModal(partner); }}
                  className="p-2 text-slate-400 hover:text-accent-primary hover:bg-accent-light rounded-xl transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(partner.id); }}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-900">{partner.name}</h3>
            <p className="text-sm text-accent-primary font-medium mb-4">{partner.role}</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-slate-500 hover:text-slate-800 transition-colors">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Mail size={14} />
                </div>
                <span className="text-xs truncate">{partner.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 hover:text-slate-800 transition-colors">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <MessageSquare size={14} />
                </div>
                <span className="text-xs">Chat on Slack</span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex -space-x-2">
                {getPartnerProjects(partner.projects).slice(0, 3).map((p) => (
                  <div key={p.id} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400 overflow-hidden">
                    {p.name.charAt(0)}
                  </div>
                ))}
                {partner.projects.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                    +{partner.projects.length - 3}
                  </div>
                )}
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {partner.projects.length} Projects
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <header className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingPartner ? 'Edit Partner' : 'Add New Partner'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                  <X size={20} />
                </button>
              </header>
              <form onSubmit={handleSubmit} className="p-8 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Alex Rivera"
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Role</label>
                  <input 
                    required
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. UI/UX Designer"
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                  <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="alex@example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all"
                  >
                    {editingPartner ? 'Update' : 'Add Partner'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailOpen && selectedPartner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="h-32 bg-gradient-to-r from-accent-primary/20 to-accent-primary/5 relative">
                <button 
                  onClick={() => setIsDetailOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-white/50 backdrop-blur-md text-slate-600 hover:bg-white rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="px-8 pb-8 -mt-12 relative flex-1 overflow-y-auto">
                <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
                  <img 
                    src={selectedPartner.avatar || `https://ui-avatars.com/api/?name=${selectedPartner.name}`} 
                    alt={selectedPartner.name} 
                    className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedPartner.name}</h2>
                    <p className="text-accent-primary font-bold">{selectedPartner.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { handleOpenModal(selectedPartner); setIsDetailOpen(false); }}
                      className="p-3 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedPartner.id)}
                      className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Contact Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                          <Mail className="text-accent-primary" size={18} />
                          <span className="text-sm font-medium text-slate-700">{selectedPartner.email}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                          <MessageSquare className="text-emerald-500" size={18} />
                          <span className="text-sm font-medium text-slate-700">Slack: @{selectedPartner.name.toLowerCase().replace(' ', '.')}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Stats</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-accent-light rounded-2xl">
                          <p className="text-2xl font-bold text-accent-primary">{selectedPartner.projects.length}</p>
                          <p className="text-[10px] font-bold text-accent-primary/60 uppercase">Total Projects</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-2xl">
                          <p className="text-2xl font-bold text-emerald-600">
                            {getPartnerProjects(selectedPartner.projects).filter(p => p.status === 'Completed').length}
                          </p>
                          <p className="text-[10px] font-bold text-emerald-600/60 uppercase">Completed</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Associated Projects</h4>
                    <div className="space-y-3">
                      {getPartnerProjects(selectedPartner.projects).map(project => (
                        <div key={project.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-accent-primary/30 transition-all group">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-bold text-slate-900 group-hover:text-accent-primary transition-colors">{project.name}</h5>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full",
                              project.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : "bg-accent-light text-accent-primary"
                            )}>
                              {project.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500">{project.client}</p>
                            <p className="text-xs font-bold text-slate-900">{project.progress}%</p>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-accent-primary" style={{ width: `${project.progress}%` }} />
                          </div>
                        </div>
                      ))}
                      {selectedPartner.projects.length === 0 && (
                        <p className="text-sm text-slate-400 italic text-center py-8">No projects assigned yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
