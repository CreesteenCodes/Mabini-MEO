import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Wrench, Calendar, Search, MapPin, Pencil, Trash2, X, Printer, ClipboardCheck, Play } from 'lucide-react';
import { AutoGrowTextarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { PrintDocument, type PrintSection } from './PrintDocument';
import { recordClientActivity } from '@/lib/activity-log-client';

interface Maintenance {
  id: string;
  localRoadId: string;
  localRoadName: string;
  type: string;
  scheduledDate: string;
  completedDate?: string;
  cost: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Deferred';
  description: string;
}

interface MaintenanceModuleProps {
  maintenanceRecords: Maintenance[];
  localRoadList: any[];
  inspections: any[];
  onAddMaintenance: (maintenance: Omit<Maintenance, 'id'>) => void;
  onEditMaintenance: (maintenance: Maintenance) => void;
  onDeleteMaintenance: (id: string) => void;
  onUpdateStatus: (id: string, status: Maintenance['status'], completedDate?: string) => void;
  currentUser: string;
  userRole?: string;
}

const maintenanceFormTabs = [
  { id: 'project', label: 'Project Info' },
  { id: 'activity', label: 'Maintenance Info' },
] as const;

export function MaintenanceModule({ maintenanceRecords, localRoadList, inspections, onAddMaintenance, onEditMaintenance, onDeleteMaintenance, onUpdateStatus, currentUser, userRole = '' }: MaintenanceModuleProps) {
  const isAdminReadDeleteOnly = userRole === 'Admin';
  const isEncoder = userRole === 'Staff - Encoder';
  const [showForm, setShowForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedMaintenance, setSelectedMaintenance] = useState<{ record: Maintenance; referenceId: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Maintenance | null>(null);
  const [projectError, setProjectError] = useState('');
  const [activityError, setActivityError] = useState('');
  const [printSections, setPrintSections] = useState<PrintSection[] | null>(null);
  const canPrint = userRole === 'Admin' || userRole === 'Staff - Encoder';
  const [activeFormTab, setActiveFormTab] = useState<(typeof maintenanceFormTabs)[number]['id']>('project');
  const formScrollRef = useRef<HTMLFormElement>(null);
  const projectSectionRef = useRef<HTMLElement>(null);
  const activitySectionRef = useRef<HTMLElement>(null);
  const formSectionRefs = [projectSectionRef, activitySectionRef];
  const maintenanceFilters = ['All', 'For maintenance', 'Completed'];
  const statusStyles: Record<Maintenance['status'], string> = {
    Scheduled: 'border-amber-200 bg-amber-50 text-amber-700',
    'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
    Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Deferred: 'border-slate-200 bg-slate-100 text-slate-600',
  };
  const completedInspections = inspections.filter((inspection) =>
    inspection.isScheduledAnnualFollowUp !== true &&
    inspection.isPendingValidationInspection !== true &&
    !(inspection.isValidationInspection === true && inspection.isPendingValidationInspection !== false)
  );
  const latestInspectionByRoadId = new Map<string, any>();
  for (const inspection of completedInspections) {
    const current = latestInspectionByRoadId.get(inspection.localRoadId);
    if (!current || String(inspection.date || '').localeCompare(String(current.date || '')) > 0) {
      latestInspectionByRoadId.set(inspection.localRoadId, inspection);
    }
  }
  const eligibleRoadIds = new Set(
    Array.from(latestInspectionByRoadId.entries())
      .filter(([, inspection]) => {
        const ratings = Object.values(inspection.conditionRatings || {});
        return ratings.length > 0
          ? ratings.some((rating) => rating === 'Fair' || rating === 'Poor' || rating === 'Bad')
          : Number(inspection.conditionRating) > 0 && Number(inspection.conditionRating) < 8;
      })
      .map(([roadId]) => roadId)
  );
  const eligibleProjects = localRoadList.filter((item) =>
    eligibleRoadIds.has(item.id) ||
    (editingRecordId !== null && maintenanceRecords.some((record) =>
      record.id === editingRecordId && record.localRoadId === item.id
    ))
  );
  const visibleRecords = maintenanceRecords
    .slice()
    .reverse()
    .map((record, index) => ({
      record,
      referenceId: `MNT-${record.scheduledDate?.slice(0, 4) || new Date().getFullYear()}-${String(index + 1).padStart(3, '0')}`,
    }))
    .filter(({ record, referenceId }) => {
      const road = localRoadList.find((item) => item.id === record.localRoadId);
      const matchesStatus = statusFilter === 'All' ||
        (statusFilter === 'For maintenance' ? record.status !== 'Completed' : record.status === 'Completed');
      const query = searchTerm.trim().toLowerCase();
      const searchable = [
        referenceId,
        record.localRoadName,
        road?.projectName,
        road?.roadNetworkId,
        road?.barangay,
        road?.location,
        record.description,
        record.type,
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && searchable.includes(query);
    });
  const [formData, setFormData] = useState({
    localRoadId: '',
    projectName: '',
    projectCategory: '',
    projectDescription: '',
    location: '',
    contractor: '',
    dateStarted: '',
    completionDate: '',
    maintenanceType: 'Corrective Type',
    maintenanceActivities: '',
    remarks: '',
    type: 'Corrective Type',
    scheduledDate: '',
    cost: 0,
    description: '',
  });

  useEffect(() => {
    if (!showForm) return;
    formScrollRef.current?.scrollTo({ top: 0 });
  }, [showForm, editingRecordId]);

  const selectedProject = localRoadList.find(item => item.id === formData.localRoadId);
  const openMaintenanceDetails = (record: Maintenance, referenceId: string) => {
    setSelectedMaintenance({ record, referenceId });
  };
  const printMaintenance = (record: Maintenance, referenceId: string) => {
    const road = localRoadList.find((item) => item.id === record.localRoadId);
    void recordClientActivity(
      currentUser,
      'Print Requested',
      `Requested print for maintenance record ${referenceId} (${road?.projectName || road?.name || record.localRoadName})`,
    ).catch((error: unknown) => console.error('Failed to record maintenance print activity.', error));
    setPrintSections([
      {
        title: 'Project Information',
        fields: [
          { label: 'Project / Program / Activity Name', value: road?.projectName || road?.name || record.localRoadName, width: 'half' },
          { label: 'Project Category', value: road?.projectCategory || road?.type, width: 'half' },
          { label: 'Location', value: road?.location || road?.barangay, width: 'full' },
          { label: 'Contractor', value: road?.contractorName, width: 'full' },
          { label: 'Project Description', value: road?.projectDescription || road?.description, width: 'full' },
        ],
      },
      {
        title: 'Maintenance Activity Information',
        fields: [
          { label: 'Date Started', value: road?.dateBuilt, width: 'third' },
          { label: 'Completion Date', value: record.completedDate, width: 'third' },
          { label: 'Type of Maintenance', value: record.type, width: 'third' },
          { label: 'Status', value: record.status, width: 'third' },
          { label: 'Scheduled Date', value: record.scheduledDate, width: 'third' },
          { label: 'Budget', value: `Php ${Number(record.cost || 0).toLocaleString()}`, width: 'third' },
          { label: 'Maintenance Activities', value: record.description, width: 'full' },
        ],
      },
    ]);
    setSelectedMaintenance(null);
  };
  const moveToFormTab = (index: number) => {
    const scrollContainer = formScrollRef.current;
    const section = formSectionRefs[index].current;
    if (scrollContainer && section) {
      const top = section.getBoundingClientRect().top
        - scrollContainer.getBoundingClientRect().top
        + scrollContainer.scrollTop;
      scrollContainer.scrollTo({ top, behavior: 'smooth' });
    }
    setActiveFormTab(maintenanceFormTabs[index].id);
  };
  const updateActiveFormTab = () => {
    const scrollTop = formScrollRef.current?.getBoundingClientRect().top ?? 0;
    const currentIndex = formSectionRefs.reduce((current, sectionRef, index) => (
      sectionRef.current && sectionRef.current.getBoundingClientRect().top <= scrollTop + 110 ? index : current
    ), 0);
    setActiveFormTab(maintenanceFormTabs[currentIndex].id);
  };
  const returnToSection = (sectionRef: React.RefObject<HTMLElement>, tab: (typeof maintenanceFormTabs)[number]['id'], selector?: string) => {
    setActiveFormTab(tab);
    const scrollContainer = formScrollRef.current;
    const section = sectionRef.current;
    if (scrollContainer && section) {
      const top = section.getBoundingClientRect().top
        - scrollContainer.getBoundingClientRect().top
        + scrollContainer.scrollTop;
      scrollContainer.scrollTo({ top, behavior: 'smooth' });
    }
    window.setTimeout(() => {
      const field = selector ? sectionRef.current?.querySelector<HTMLElement>(selector) : null;
      field?.focus();
    }, 0);
  };

  const handleProjectSelection = (projectId: string) => {
    const selected = localRoadList.find(item => item.id === projectId);

    setProjectError('');
    setFormData(prev => ({
      ...prev,
      localRoadId: projectId,
      projectName: selected?.projectName || selected?.name || '',
      projectCategory: selected?.projectCategory || selected?.type || '',
      projectDescription: selected?.projectDescription || selected?.description || '',
      location: selected?.location || '',
      contractor: selected?.contractorName || '',
      dateStarted: selected?.dateBuilt || '',
      completionDate: selected?.actualCompletionDate || '',
      type: prev.type,
      scheduledDate: prev.scheduledDate,
      cost: prev.cost,
      description: prev.description,
    }));
  };

  const resetForm = () => {
    setEditingRecordId(null);
    setProjectError('');
    setActivityError('');
    setFormData({
      localRoadId: '',
      projectName: '',
      projectCategory: '',
      projectDescription: '',
      location: '',
      contractor: '',
      dateStarted: '',
      completionDate: '',
      maintenanceType: 'Corrective Type',
      maintenanceActivities: '',
      remarks: '',
      type: 'Corrective Type',
      scheduledDate: '',
      cost: 0,
      description: '',
    });
  };

  const startEditing = (record: Maintenance) => {
    const road = localRoadList.find((item) => item.id === record.localRoadId);
    setEditingRecordId(record.id);
    setActiveFormTab('project');
    setFormData({
      localRoadId: record.localRoadId,
      projectName: road?.projectName || road?.name || record.localRoadName,
      projectCategory: road?.projectCategory || road?.type || '',
      projectDescription: road?.projectDescription || road?.description || '',
      location: road?.location || '',
      contractor: road?.contractorName || '',
      dateStarted: road?.dateBuilt || '',
      completionDate: record.scheduledDate,
      maintenanceType: record.type,
      maintenanceActivities: record.description,
      remarks: record.description,
      type: record.type,
      scheduledDate: record.scheduledDate,
      cost: record.cost,
      description: record.description,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.localRoadId) {
      setProjectError('Please select a project before submitting the maintenance activity.');
      returnToSection(projectSectionRef, 'project', '[aria-label="Select project"]');
      return;
    }
    if (!formData.dateStarted || !formData.completionDate || !formData.maintenanceType || !formData.maintenanceActivities.trim()) {
      setActivityError([
        !formData.dateStarted ? 'Date started is required.' : '',
        !formData.completionDate ? 'Completion date is required.' : '',
        !formData.maintenanceType ? 'Select a maintenance type.' : '',
        !formData.maintenanceActivities.trim() ? 'Enter the maintenance activities.' : '',
      ].filter(Boolean).join(' '));
      returnToSection(activitySectionRef, 'activity', !formData.completionDate ? 'input[type="date"]:not([readonly])' : 'textarea');
      return;
    }

    const localRoad = localRoadList.find(item => item.id === formData.localRoadId);
    if (localRoad) {
      const recordDetails = {
        localRoadId: formData.localRoadId,
        localRoadName: localRoad.name,
        type: formData.maintenanceType || formData.type,
        scheduledDate: formData.completionDate || formData.scheduledDate || formData.dateStarted,
        cost: Number(formData.cost) || 0,
        description: formData.maintenanceActivities || formData.remarks || formData.description,
      };
      if (editingRecordId) {
        const existingRecord = maintenanceRecords.find((record) => record.id === editingRecordId);
        if (!existingRecord) return;
        onEditMaintenance({ ...existingRecord, ...recordDetails });
      } else {
        onAddMaintenance({ ...recordDetails, status: 'Scheduled' });
      }
      resetForm();
      setShowForm(false);
    }
  };

  const handleDelete = (record: Maintenance) => {
    setPendingDelete(record);
  };

  return (
    <>
      {printSections && <PrintDocument title="Local Road Maintenance Activities" sections={printSections} onComplete={() => setPrintSections(null)} />}
      <div className="maintenance-management flex min-h-screen flex-col gap-6 bg-[#E3EEF9] p-6 text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-blue-700">Maintenance Management</h1>
          <p className="mt-1 text-sm text-slate-500">Road maintenance activities, schedules, and maintenance records.</p>
        </div>
        {!isAdminReadDeleteOnly && <button
          onClick={() => {
            resetForm();
            setActiveFormTab('project');
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-semibold text-white shadow-md transition hover:brightness-105"
        >
          <Plus className="w-5 h-5" />
          Schedule Maintenance
        </button>}
      </div>

      <section className="relative z-10 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <label className="relative block min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by road project, network ID, barangay, or activity..."
              aria-label="Search maintenance records"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1" role="group" aria-label="Filter maintenance records by status">
            {maintenanceFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                aria-pressed={statusFilter === filter}
                className={`shrink-0 rounded-xl px-4 py-2.5 font-medium transition ${
                  statusFilter === filter
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </section>

      {showForm && typeof document !== 'undefined' && createPortal(
        <div className="module-form-backdrop fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-md">
          <div className="module-form-panel relative z-[10000] flex h-[min(560px,calc(100vh-48px))] min-h-0 w-full max-w-[840px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="relative flex min-h-[84px] shrink-0 items-center justify-between overflow-visible border-b bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-4 text-white">
              <div className="min-w-0">
                <div className="text-xl font-bold leading-7 text-white">{editingRecordId ? 'Edit Maintenance Activity' : 'Local Road Project Maintenance Activity'}</div>
                <div className="text-sm leading-5 text-blue-100">Municipal Engineering Office · Maintenance Entry</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="Close maintenance form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex shrink-0 gap-2 overflow-x-auto border-b bg-slate-50 px-4 py-2" aria-label="Maintenance form sections">
              {maintenanceFormTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => moveToFormTab(index)}
                  aria-current={activeFormTab === tab.id ? 'step' : undefined}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    activeFormTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {index + 1}. {tab.label}
                </button>
              ))}
            </nav>

            <form ref={formScrollRef} onSubmit={handleSubmit} onScroll={updateActiveFormTab} className="form-modal-fields min-h-0 flex-1 overflow-y-auto px-6 py-5 text-gray-900">
              <section ref={projectSectionRef} className="scroll-mt-4 border-b pb-5">
                <h3 className="text-[1.05rem] font-bold mb-3 text-gray-900">Project Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Project / Program / Activity Name</label>
                    <Select value={formData.localRoadId} onValueChange={handleProjectSelection} required>
                      <SelectTrigger aria-label="Select project">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleProjects.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.projectName || item.name} ({item.projectCategory || item.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {eligibleProjects.length === 0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        No projects have a Fair, Poor, or Bad rating in their latest completed inspection.
                      </p>
                    )}
                    {projectError && (
                      <p role="alert" className="mt-2 text-xs font-medium text-red-600">
                        {projectError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Project Category</label>
                    <input
                      type="text"
                      value={formData.projectCategory}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-900 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Project Description</label>
                  <input
                    type="text"
                    value={formData.projectDescription}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contractor</label>
                  <input
                    type="text"
                    value={formData.contractor}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                </div>
              </section>

              <section ref={activitySectionRef} className="scroll-mt-4 pt-5">
                <h3 className="text-[1.05rem] font-bold mb-3 text-gray-900">Maintenance Activity Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date Started *</label>
                    <input
                      type="date"
                      value={formData.dateStarted}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-900 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Completion Date *</label>
                    <input
                      type="date"
                      value={formData.completionDate}
                      onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type of Maintenance *</label>
                    <Select
                      value={formData.maintenanceType}
                      onValueChange={(value) => setFormData({ ...formData, maintenanceType: value, type: value })}
                      required
                    >
                      <SelectTrigger aria-label="Maintenance type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Corrective Type">Corrective Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Maintenance Activities*</label>
                  <AutoGrowTextarea
                    value={formData.maintenanceActivities}
                    onChange={(e) => setFormData({ ...formData, maintenanceActivities: e.target.value, description: e.target.value })}
                    rows={3}
                    className="w-full resize-y px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-900"
                    required
                  />
                  {activityError && (
                    <p role="alert" className="mt-2 text-xs font-medium text-red-600">{activityError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                  <AutoGrowTextarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={3}
                    className="w-full resize-y px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-900"
                  />
                </div>
              </section>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors text-sm"
                >
                  {editingRecordId ? 'Save Changes' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <Dialog
        open={selectedMaintenance !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMaintenance(null);
        }}
      >
        {selectedMaintenance && (() => {
          const { record, referenceId } = selectedMaintenance;
          const road = localRoadList.find((item) => item.id === record.localRoadId);
          return (
            <DialogContent className="maintenance-detail-dialog card-details-dialog max-h-[min(620px,calc(100vh-32px))] overflow-hidden rounded-2xl border-0 bg-white p-0 text-slate-800 shadow-2xl sm:max-w-[840px]">
              <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 pr-14 text-white">
                <DialogTitle className="text-xl font-bold text-white">{road?.projectName || road?.name || record.localRoadName}</DialogTitle>
                <DialogDescription className="text-sm text-blue-100">Municipal Engineering Office · Maintenance Entry · {referenceId}</DialogDescription>
              </div>
              <div className="max-h-[calc(min(620px,100vh-32px)-76px)] overflow-y-auto px-6 pb-8 pt-5">
                <section className="border-b pb-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Project Information</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Project / Program / Activity Name</p>
                      <p className="min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">{road?.projectName || road?.name || record.localRoadName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Project Category</p>
                      <p className="min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">{road?.projectCategory || road?.type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Location</p>
                      <p className="min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">{road?.location || road?.barangay || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Contractor</p>
                      <p className="min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">{road?.contractorName || record.localRoadName || 'N/A'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="mb-2 text-sm font-medium text-gray-700">Project Description</p>
                      <p className="min-h-[5rem] whitespace-pre-wrap rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">
                        {road?.projectDescription || road?.description || 'N/A'}
                      </p>
                    </div>
                  </div>
                </section>
                <section className="pt-5">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Maintenance Activity Information</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Date Started *</p>
                      <p className="min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">{road?.dateBuilt || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Completion Date *</p>
                      <p className="min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">{record.completedDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Type of Maintenance *</p>
                      <p className="min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">{record.type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Status</p>
                      <p className="min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">{record.status}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Scheduled Date</p>
                      <p className="min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">{record.scheduledDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-700">Budget</p>
                      <p className="min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">Php {Number(record.cost || 0).toLocaleString()}</p>
                    </div>
                    <div className="md:col-span-3">
                      <p className="mb-2 text-sm font-medium text-gray-700">Maintenance Activities *</p>
                      <p className="min-h-[5rem] whitespace-pre-wrap rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700">
                        {record.description || 'N/A'}
                      </p>
                    </div>
                  </div>
                </section>
                {canPrint && (
                  <div className="mt-5 flex justify-end border-t border-slate-200 pt-5">
                    <button type="button" onClick={() => printMaintenance(record, referenceId)} className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800">
                      <Printer className="h-4 w-4" /> Print
                    </button>
                  </div>
                )}
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>

      <div className="flex items-center justify-between gap-4 py-1">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-blue-700">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
          Maintenance History
        </h2>
        <span className="text-sm text-slate-500">{visibleRecords.length} records listed</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visibleRecords.map(({ record, referenceId }) => {
            const road = localRoadList.find((item) => item.id === record.localRoadId);
            return (
              <article key={record.id} className="group flex h-[200px] flex-col rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-[0_0_0_3px_rgba(96,165,250,0.22),0_10px_25px_rgba(30,64,175,0.12)]">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`View maintenance details for ${road?.projectName || record.localRoadName}`}
                  className="flex flex-1 cursor-pointer flex-col outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  onClick={() => openMaintenanceDetails(record, referenceId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openMaintenanceDetails(record, referenceId);
                    }
                  }}
                >
                <div className="flex items-center justify-between gap-3 text-sm leading-5 text-slate-700">
                  <span className="truncate">{referenceId}</span>
                  <span className="shrink-0 text-right">
                    {record.completedDate || record.scheduledDate || 'Date not set'}
                  </span>
                </div>

                <h2 className="maintenance-card-title mt-3 truncate text-base font-bold text-slate-900 transition-colors group-hover:text-blue-700" title={road?.projectName || record.localRoadName}>
                    {road?.projectName || record.localRoadName}
                  </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {road?.barangay || road?.location || 'Location not set'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[record.status]}`}>
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-current" />{record.status}
                  </span>
                </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {record.completedDate ? `Completed: ${record.completedDate}` : `Target: ${record.scheduledDate || 'Not set'}`}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {!isAdminReadDeleteOnly && (
                      <>
                        <button type="button" onClick={(event) => { event.stopPropagation(); startEditing(record); }} aria-label={`Edit maintenance record for ${record.localRoadName}`} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        {record.status === 'Scheduled' && (
                          <button type="button" onClick={(event) => { event.stopPropagation(); onUpdateStatus(record.id, 'In Progress'); }} className="text-sm font-semibold text-blue-700 hover:underline">Start</button>
                        )}
                        {record.status === 'Deferred' && (
                          <button type="button" onClick={(event) => { event.stopPropagation(); onUpdateStatus(record.id, 'In Progress'); }} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
                            <Play className="h-3.5 w-3.5" /> Continue
                          </button>
                        )}
                        {record.status === 'In Progress' && (
                          <button type="button" onClick={(event) => { event.stopPropagation(); onUpdateStatus(record.id, 'Completed', new Date().toISOString().split('T')[0]); }} className="text-sm font-semibold text-emerald-600 hover:underline">Complete</button>
                        )}
                        {record.status !== 'Completed' && record.status !== 'Deferred' && (
                          <button type="button" onClick={(event) => { event.stopPropagation(); onUpdateStatus(record.id, 'Deferred'); }} className="text-sm text-slate-500 hover:text-slate-800">Defer</button>
                        )}
                      </>
                    )}
                    {!isEncoder && (
                      <button type="button" onClick={(event) => { event.stopPropagation(); handleDelete(record); }} aria-label={`Delete maintenance record for ${record.localRoadName}`} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {visibleRecords.length === 0 && (
            <div className="col-span-full rounded-[22px] border border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
              {maintenanceRecords.length === 0 ? 'No maintenance scheduled yet. Schedule your first maintenance above.' : 'No maintenance records match your search or filters.'}
            </div>
          )}
          </div>
      <div className="mb-10 mt-auto flex flex-col gap-2 border-t border-slate-200 px-1 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Showing {visibleRecords.length} of {maintenanceRecords.length} total maintenance records</span>
        <span className="font-medium text-blue-700">Municipality of Mabini, Batangas</span>
      </div>
      <ConfirmActionDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete maintenance record?"
        description={`Delete the maintenance record for ${pendingDelete?.localRoadName || 'this project'}? This action cannot be undone.`}
        onConfirm={() => {
          if (pendingDelete) onDeleteMaintenance(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
      </div>
    </>
  );
}
