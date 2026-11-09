import { useEffect, useRef, useState } from 'react';
import { ClipboardCheck, Calendar, X, Search, ChevronRight, FileText, AlertCircle, Pencil, Trash2, Printer, Plus } from 'lucide-react';
import { AutoGrowTextarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { PrintDocument, type PrintSection } from './PrintDocument';
import { recordClientActivity } from '@/lib/activity-log-client';

interface Inspection {
  id: string;
  localRoadId: string;
  localRoadName: string;
  date: string;
  conditionRating: number;
  remarks: string;
  inspector: string;
  inspectionType?: string;
  conditionRatings?: Record<string, string>;
  attachment?: {
    name: string;
    type: string;
    dataUrl: string;
  };
  validationStatus?: string;
  isAnnualFollowUp?: boolean;
  isScheduledAnnualFollowUp?: boolean;
  isValidationInspection?: boolean;
  isPendingValidationInspection?: boolean;
  annualFollowUpYear?: number;
  projectName?: string;
  projectCategory?: string;
  projectDescription?: string;
  location?: string;
  dateStarted?: string;
  targetCompletionDate?: string;
  noOfExtensions?: string;
  actualCompletionDate?: string;
  roadNetworkId?: string;
  roadName?: string;
  components?: string;
  description?: string;
}

interface InspectionModuleProps {
  inspections: Inspection[];
  localRoadList: any[];
  onAddInspection: (inspection: Omit<Inspection, 'id'>) => void;
  onEditInspection: (inspection: Inspection) => Promise<boolean>;
  onDeleteInspection: (id: string) => Promise<boolean>;
  currentUser: string;
  userRole?: string;
}

const inspectionFormTabs = [
  { id: 'project', label: 'Project Info' },
  { id: 'road', label: 'Road Info' },
  { id: 'inspection', label: 'Inspection Details' },
] as const;

const conditionAssessmentLabels = [
  'Concrete',
  'Asphalt',
  'Gravel',
  'Earth',
  'Shoulder',
  'Side Drain',
  'Sidewalk',
];

export function InspectionModule({ inspections, localRoadList, onAddInspection, onEditInspection, onDeleteInspection, currentUser, userRole = '' }: InspectionModuleProps) {
  const isAdminReadDeleteOnly = userRole === 'Admin';
  const isInspector = userRole === 'Staff - Inspector';
  const [showForm, setShowForm] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedInspection, setSelectedInspection] = useState<{ inspection: Inspection; referenceId: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Inspection | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<(typeof inspectionFormTabs)[number]['id']>('project');
  const formScrollRef = useRef<HTMLDivElement>(null);
  const projectSectionRef = useRef<HTMLElement>(null);
  const roadSectionRef = useRef<HTMLElement>(null);
  const inspectionSectionRef = useRef<HTMLElement>(null);
  const formSectionRefs = [projectSectionRef, roadSectionRef, inspectionSectionRef];
  const [attachmentName, setAttachmentName] = useState('No file chosen');
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [validationNotice, setValidationNotice] = useState('');
  const [printSections, setPrintSections] = useState<PrintSection[] | null>(null);
  const [printAttachment, setPrintAttachment] = useState<Inspection['attachment']>();
  const [selectedInspectionAttachment, setSelectedInspectionAttachment] = useState<Inspection['attachment'] | null>(null);
  const canPrint = userRole === 'Admin' || userRole === 'Staff - Inspector';
  const [conditionRatings, setConditionRatings] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    localRoadId: '',
    projectName: '',
    projectCategory: '',
    projectDescription: '',
    location: '',
    dateStarted: '',
    targetCompletionDate: '',
    noOfExtensions: '',
    actualCompletionDate: '',
    roadNetworkId: '',
    roadName: '',
    components: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    inspectionType: '',
    conditionRating: 'Good',
    remarks: '',
  });

  const startNewInspection = () => {
    setEditingInspection(null);
    setConditionRatings({});
    setSelectedAttachment(null);
    setAttachmentName('No file chosen');
    setValidationNotice('');
    setActiveFormTab('project');
    setFormData({
      localRoadId: '',
      projectName: '',
      projectCategory: '',
      projectDescription: '',
      location: '',
      dateStarted: '',
      targetCompletionDate: '',
      noOfExtensions: '',
      actualCompletionDate: '',
      roadNetworkId: '',
      roadName: '',
      components: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      inspectionType: '',
      conditionRating: 'Good',
      remarks: '',
    });
    setShowForm(true);
  };

  useEffect(() => {
    if (!showForm) return;
    formScrollRef.current?.scrollTo({ top: 0 });
  }, [showForm, editingInspection]);

  const moveToFormTab = (index: number) => {
    const scrollContainer = formScrollRef.current;
    const section = formSectionRefs[index].current;
    if (scrollContainer && section) {
      const top = section.getBoundingClientRect().top
        - scrollContainer.getBoundingClientRect().top
        + scrollContainer.scrollTop;
      scrollContainer.scrollTo({ top, behavior: 'smooth' });
    }
    setActiveFormTab(inspectionFormTabs[index].id);
  };
  const updateActiveFormTab = () => {
    const containerTop = formScrollRef.current?.getBoundingClientRect().top ?? 0;
    const currentIndex = formSectionRefs.reduce((current, sectionRef, index) => (
      sectionRef.current && sectionRef.current.getBoundingClientRect().top <= containerTop + 110 ? index : current
    ), 0);
    setActiveFormTab(inspectionFormTabs[currentIndex].id);
  };
  const returnToSection = (sectionRef: React.RefObject<HTMLElement>, tab: (typeof inspectionFormTabs)[number]['id'], selector?: string) => {
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

  const selectedProject = localRoadList.find(item => item.id === formData.localRoadId);
  const conditionRatingOptions = ['Good', 'Fair', 'Poor', 'Bad', 'N/A'];
  const inspectionFilters = ['All', 'For inspection', 'Inspected'];

  const getRatingScore = (rating: number | string) => {
    const numericRating = Number(rating);
    if (Number.isFinite(numericRating)) return numericRating;
    const normalizedRating = String(rating).toLowerCase();
    if (normalizedRating === 'good') return 9;
    if (normalizedRating === 'fair') return 7;
    if (normalizedRating === 'poor') return 4;
    if (normalizedRating === 'bad') return 2;
    return 0;
  };

  const getConditionLabel = (inspection: Inspection) => {
    const rating = getRatingScore(inspection.conditionRating);
    if (rating >= 8) return 'Good';
    if (rating >= 5) return 'Fair';
    if (rating > 0) return 'Poor';
    return 'Pending Validation';
  };

  const isPendingInspectionRecord = (inspection: Inspection) =>
    inspection.isScheduledAnnualFollowUp === true ||
    inspection.isPendingValidationInspection === true ||
    (inspection.isValidationInspection === true && inspection.isPendingValidationInspection !== false);

  const filteredInspections = inspections
    .slice()
    .reverse()
    .map((inspection, index) => ({
      inspection,
      referenceId: `INSP-${inspection.date?.slice(0, 4) || new Date().getFullYear()}-${String(index + 1).padStart(3, '0')}`,
    }))
    .filter(({ inspection, referenceId }) => {
      const matchesFilter = activeFilter === 'All' ||
        (activeFilter === 'For inspection'
        ? isPendingInspectionRecord(inspection)
        : !isPendingInspectionRecord(inspection));
      const road = localRoadList.find((item) => item.id === inspection.localRoadId);
      const searchableText = [
        inspection.localRoadName,
        inspection.inspector,
        referenceId,
        road?.roadNetworkId,
      ].filter(Boolean).join(' ').toLowerCase();
      return matchesFilter && searchableText.includes(searchTerm.trim().toLowerCase());
    });

  const handleConditionRatingChange = (rowLabel: string, value: string) => {
    setConditionRatings(prev => ({ ...prev, [rowLabel]: value }));
    setFormData(prev => ({ ...prev, conditionRating: value }));
    setValidationNotice('');
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      setSelectedAttachment(null);
      setAttachmentName('No file chosen');
      setValidationNotice('Choose an attachment in PDF, JPG, or PNG format.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSelectedAttachment(null);
      setAttachmentName('No file chosen');
      setValidationNotice('The attachment must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }

    setSelectedAttachment(file);
    setAttachmentName(file.name);
    setValidationNotice('');
  };

  const startEditingInspection = (inspection: Inspection) => {
    const road = localRoadList.find((item) => item.id === inspection.localRoadId);
    const overallRating = getConditionLabel(inspection);
    setEditingInspection(inspection);
    setConditionRatings(inspection.conditionRatings || Object.fromEntries(
      conditionAssessmentLabels.map((label) => [label, overallRating === 'Pending Validation' ? 'N/A' : overallRating]),
    ));
    setFormData((previous) => ({
      ...previous,
      localRoadId: inspection.localRoadId,
      projectName: road?.projectName || road?.name || inspection.projectName || inspection.localRoadName,
      projectCategory: road?.projectCategory || road?.type || inspection.projectCategory || '',
      projectDescription: road?.projectDescription || road?.description || inspection.projectDescription || '',
      location: road?.location || inspection.location || '',
      dateStarted: road?.dateBuilt || inspection.dateStarted || '',
      targetCompletionDate: road?.targetCompletionDate || inspection.targetCompletionDate || '',
      noOfExtensions: road?.noOfExtensions || inspection.noOfExtensions || '',
      actualCompletionDate: road?.actualCompletionDate || inspection.actualCompletionDate || '',
      roadNetworkId: road?.roadNetworkId || inspection.roadNetworkId || '',
      roadName: road?.roadName || road?.name || inspection.roadName || inspection.localRoadName,
      components: road?.components || inspection.components || '',
      description: road?.description || inspection.description || '',
      date: inspection.date,
      inspectionType: inspection.inspectionType || '',
      conditionRating: String(inspection.conditionRating),
      remarks: inspection.remarks || '',
    }));
    setSelectedAttachment(null);
    setAttachmentName(inspection.attachment?.name || 'No file chosen');
    setValidationNotice('');
    setActiveFormTab('project');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const localRoad = localRoadList.find(item => item.id === formData.localRoadId);
    const selectedRatings = Object.values(conditionRatings).filter((rating) => rating !== 'N/A');
    const missingConditionRatings = conditionAssessmentLabels.filter((label) => !conditionRatings[label]);
    const validationMessages = [];
    if (!localRoad) validationMessages.push('Select a Project / Program / Activity Name.');
    if (!formData.date) validationMessages.push('Enter the inspection date.');
    if (!formData.inspectionType) validationMessages.push('Select an inspection type.');
    if (missingConditionRatings.length > 0) {
      validationMessages.push('Select a condition rating for every road element. Choose N/A when it does not apply.');
    }
    if (!formData.remarks.trim()) validationMessages.push('Enter the inspection findings.');
    if (!selectedAttachment && !editingInspection?.attachment) validationMessages.push('Attach a PDF, JPG, or PNG file (10 MB maximum).');
    if (validationMessages.length > 0) {
      setValidationNotice(validationMessages.join(' '));
      if (!localRoad) returnToSection(projectSectionRef, 'project', '[aria-label="Project / Program / Activity Name"]');
      else if (!formData.date || !formData.inspectionType) returnToSection(inspectionSectionRef, 'inspection', 'input[type="date"]');
      else if (missingConditionRatings.length > 0) returnToSection(inspectionSectionRef, 'inspection');
      else returnToSection(inspectionSectionRef, 'inspection', 'textarea');
      return;
    }

    if (localRoad) {
      let attachment = editingInspection?.attachment;
      if (selectedAttachment) {
        try {
          attachment = await new Promise<NonNullable<Inspection['attachment']>>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result !== 'string') {
                reject(new Error('Unable to read the selected attachment.'));
                return;
              }
              resolve({
                name: selectedAttachment.name,
                type: selectedAttachment.type,
                dataUrl: reader.result,
              });
            };
            reader.onerror = () => reject(reader.error || new Error('Unable to read the selected attachment.'));
            reader.readAsDataURL(selectedAttachment);
          });
        } catch (error) {
          console.error('Failed to read inspection attachment.', error);
          setValidationNotice('The selected attachment could not be read. Please choose the file again.');
          return;
        }
      }
      const averageRating = selectedRatings.length
        ? selectedRatings.reduce((total, rating) => total + getRatingScore(rating), 0) / selectedRatings.length
        : 0;
      const inspectionData = {
        ...formData,
        attachment,
        conditionRating: averageRating,
        conditionRatings,
        validationStatus: editingInspection?.validationStatus || 'Pending Validation',
        localRoadName: localRoad.name,
        inspector: editingInspection?.inspector || currentUser,
      };
      if (editingInspection) {
        const saved = await onEditInspection({ ...editingInspection, ...inspectionData });
        if (!saved) return;
      } else {
        onAddInspection(inspectionData);
      }
      setEditingInspection(null);
      setConditionRatings({});
      setSelectedAttachment(null);
      setValidationNotice('');
      setAttachmentName('No file chosen');
      setFormData({
        localRoadId: '',
        projectName: '',
        projectCategory: '',
        projectDescription: '',
        location: '',
        dateStarted: '',
        targetCompletionDate: '',
        noOfExtensions: '',
        actualCompletionDate: '',
        roadNetworkId: '',
        roadName: '',
        components: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        inspectionType: '',
        conditionRating: 'Good',
        remarks: '',
      });
      setShowForm(false);
    }
  };

  const printInspection = (inspection: Inspection, referenceId: string) => {
    const road = localRoadList.find((item) => item.id === inspection.localRoadId);
    const projectName = road?.projectName || road?.name || inspection.projectName || inspection.localRoadName;
    const assessmentFields = conditionAssessmentLabels.map((label) => ({
      label,
      value: inspection.conditionRatings?.[label] || 'N/A',
    }));
    void recordClientActivity(
      currentUser,
      'Print Requested',
      `Requested print for inspection ${referenceId} (${projectName})`,
    ).catch((error: unknown) => console.error('Failed to record inspection print activity.', error));
    setPrintAttachment(inspection.attachment);
    setPrintSections([
      {
        title: 'Project Information',
        fields: [
          { label: 'Project / Program / Activity Name', value: projectName, width: 'half' },
          { label: 'Project Category', value: road?.projectCategory || road?.type || inspection.projectCategory, width: 'half' },
          { label: 'Project Description', value: road?.projectDescription || road?.description || inspection.projectDescription },
          { label: 'Location', value: road?.location || inspection.location, width: 'half' },
          { label: 'Date Started', value: road?.dateBuilt || inspection.dateStarted, width: 'half' },
          { label: 'Target Completion Date', value: road?.targetCompletionDate || inspection.targetCompletionDate, width: 'half' },
          { label: 'No. of Extensions', value: road?.noOfExtensions || inspection.noOfExtensions, width: 'half' },
          { label: 'Actual Completion Date', value: road?.actualCompletionDate || inspection.actualCompletionDate, width: 'half' },
        ],
      },
      {
        title: 'Road Information',
        fields: [
          { label: 'Road Network ID No.', value: road?.roadNetworkId || inspection.roadNetworkId, width: 'half' },
          { label: 'Road Name', value: road?.roadName || road?.name || inspection.roadName, width: 'half' },
          { label: 'Components', value: road?.components || inspection.components, width: 'full' },
          { label: 'Description', value: road?.description || inspection.description, width: 'full' },
        ],
      },
      {
        title: 'Inspector Information',
        fields: [
          { label: 'Inspection Date', value: inspection.date, width: 'half' },
          { label: 'Inspection Type', value: inspection.inspectionType, width: 'half' },
        ],
      },
      {
        title: 'Local Road Condition Assessment',
        fields: assessmentFields,
      },
      {
        title: 'Inspection Findings',
        fields: [{ label: 'Findings', value: inspection.remarks }],
      },
      {
        title: 'Prepared by',
        fields: [
          { label: 'Site Inspector', value: inspection.inspector },
        ],
      },
    ]);
    setSelectedInspection(null);
  };

  return (
    <>
    {printSections && (
      <PrintDocument
        title="Local Road Project Inspection Results"
        sections={printSections}
        attachment={printAttachment}
        onComplete={() => {
          setPrintSections(null);
          setPrintAttachment(undefined);
        }}
      />
    )}
    <div className="inspection-results flex min-h-screen flex-col bg-[#E3EEF9] p-6 text-slate-800 sm:px-7">
      <div className="flex w-full flex-1 flex-col">
        <div className="mb-9 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-blue-700">Inspection Management</h1>
            <p className="inspection-subtitle mt-1 text-base text-slate-500">
              Field audits, local road condition assessments, and inspection findings.
            </p>
          </div>
          {!isAdminReadDeleteOnly && (
            <button
              type="button"
              onClick={startNewInspection}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-semibold text-white shadow-md transition hover:brightness-105"
            >
              <Plus className="h-5 w-5" />
              Add Inspection
            </button>
          )}
        </div>

        {showForm && (
          <div className="module-form-backdrop fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="module-form-panel relative z-[10000] flex h-[min(560px,calc(100vh-48px))] min-h-0 w-full max-w-[840px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3">
                <div>
                  <h2 className="text-xl font-bold text-white">{editingInspection ? 'Edit Inspection' : 'Encoding Inspection'}</h2>
                  <p className="text-sm text-blue-100">Municipal Engineering Office · Inspection Entry</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingInspection(null);
                    setConditionRatings({});
                    setSelectedAttachment(null);
                    setAttachmentName('No file chosen');
                    setValidationNotice('');
                  }}
                  className="text-gray-300 transition-colors hover:text-white"
                  aria-label="Close inspection form"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex shrink-0 gap-2 overflow-x-auto border-b bg-slate-50 px-4 py-2" aria-label="Inspection form sections">
                {inspectionFormTabs.map((tab, index) => (
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

              <form onSubmit={handleSubmit} className="form-modal-fields flex min-h-0 flex-1 flex-col overflow-hidden">
                <div
                  ref={formScrollRef}
                  onScroll={updateActiveFormTab}
                  className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
                >
                <section ref={projectSectionRef} className="scroll-mt-4 border-b pb-6">
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Project / Program / Activity Name*</label>
                      <input
                        type="text"
                        value={formData.projectName}
                        readOnly
                        aria-label="Project / Program / Activity Name"
                        aria-required="true"
                        className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700"
                      />
                      <p className="mt-1 text-xs text-gray-500">Automatically populated from the validated project.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Project Category</label>
                      <input
                        type="text"
                        value={formData.projectCategory}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Description</label>
                    <textarea
                      value={formData.projectDescription}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date Started</label>
                      <input
                        type="date"
                        value={formData.dateStarted}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target Completion Date</label>
                      <input
                        type="date"
                        value={formData.targetCompletionDate}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">No. of Extensions</label>
                      <input
                        type="text"
                        value={formData.noOfExtensions}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Actual Completion Date</label>
                      <input
                        type="date"
                        value={formData.actualCompletionDate}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
                </section>

                <section ref={roadSectionRef} className="scroll-mt-4 border-b pb-6 pt-5">
                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Road Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Road Network ID No.</label>
                      <input
                        type="text"
                        value={formData.roadNetworkId}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Road Name</label>
                      <input
                        type="text"
                        value={formData.roadName}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Components</label>
                    <input
                      type="text"
                      value={formData.components}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      rows={2}
                    />
                  </div>
                </div>
                </section>

                <section ref={inspectionSectionRef} className="scroll-mt-4 pt-5">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspector Information</h3>
                  <div className="rounded-lg border border-gray-300 overflow-hidden bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                      <div className="border-r border-gray-300">
                        <label className="block px-4 pt-3 text-[1.05rem] font-bold text-gray-900">Inspection Date*</label>
                        <div className="p-3 bg-[#f3f4f6]">
                          <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-base"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block px-4 pt-3 text-[1.05rem] font-bold text-gray-900">Inspection Type*</label>
                        <div className="p-3 bg-[#f3f4f6]">
                          <Select
                            value={formData.inspectionType}
                            onValueChange={(value) => setFormData({ ...formData, inspectionType: value })}
                            required
                          >
                            <SelectTrigger aria-label="Inspection type">
                              <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Acceptance Inspection">Acceptance Inspection</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Local Road Condition Assessment*</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
                    <table className="w-full border-collapse text-left text-sm text-gray-800">
                      <thead>
                        <tr className="bg-[#1a1d3f] text-white">
                          <th className="border-r border-gray-300 px-3 py-3 font-semibold align-top w-1/4">Pavement Type / Road Elements</th>
                          <th className="border-r border-gray-300 px-3 py-3 font-semibold align-top w-1/4">Condition Rating</th>
                          <th className="px-3 py-3 font-semibold align-top w-1/2">Field Condition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            label: 'Concrete',
                            details: {
                              Good: 'Sound, even, and no cracks or scaling, normal speed ok at 70-80 kph.',
                              Fair: 'Even with very minimal hair-line cracks and very minimal surface wearing, normal speed ok at 50-60 kph.',
                              Poor: 'Slightly uneven with minor cracks (<=3mm. width) and wearing surface, joint sealant deterioration, normal speed ok at 30-40 kph.',
                              Bad: 'With major cracks, shattered slabs, joint deterioration and cut/slip, can only travel very slowly, normal speed ok at 20-30 kph.',
                              'N/A': 'Not applicable – type/element not present.'
                            }
                          },
                          {
                            label: 'Asphalt',
                            details: {
                              Good: 'Sound, well-shaped, even and waterproof, normal speed ok at 70-80 kph.',
                              Fair: 'Even with minor patches and very minimal wearing surface but still waterproof, normal speed ok at 50-60 kph.',
                              Poor: 'Very uneven and porous, with potholes and cracks (<=3mm. Width) normal speed 30-40 kph.',
                              Bad: 'Very broken up, rough, with base failures, edge break, can only travel very slowly, normal speed ok at 20-30 kph.',
                              'N/A': 'Not applicable – type/element not present.'
                            }
                          },
                          {
                            label: 'Gravel',
                            details: {
                              Good: 'Good shape and surface, does not hold water.',
                              Fair: 'Flat camber with minor potholes and holding some water.',
                              Poor: 'Depressions common, drainage impeded.',
                              Bad: 'Extensive ponding, water tends to flow on the road.',
                              'N/A': 'Not applicable – type/element not present.'
                            }
                          },
                          {
                            label: 'Earth',
                            details: {
                              Good: 'Good shape and surface, does not hold water.',
                              Fair: 'Flat camber with minor potholes and holding some water.',
                              Poor: 'Depressions common, drainage impeded.',
                              Bad: 'Extensive ponding, water tends to flow on the road, impassable when wet.',
                              'N/A': 'Not applicable – type/element not present.'
                            }
                          },
                          {
                            label: 'Shoulder',
                            details: {
                              Good: 'Adequate width, even surface and well maintained.',
                              Fair: 'Adequate width, slightly uneven, with few potholes, inadequate maintenance.',
                              Poor: 'Inadequate width, very uneven or with many edge break and no maintenance.',
                              Bad: 'No effective shoulders, very silted road edge and with plenty of vegetation.',
                              'N/A': 'Not applicable – type/element not present.'
                            }
                          },
                          {
                            label: 'Side Drain',
                            details: {
                              Good: 'Road edge well above side drains, well defined side drains, sufficient depth, sufficient side slopes to drain water.',
                              Fair: 'Road edge slightly level with side drains, not fully efficient side drains, water can cross the road.',
                              Poor: 'Road edge slightly below ground level, no side drains or totally blocked side drains, some ponding of water.',
                              Bad: 'Road edge well below ground level — road serving as a drain to surrounding areas.',
                              'N/A': 'Not applicable – type/element not present.'
                            }
                          },
                          {
                            label: 'Sidewalk',
                            details: {
                              Good: 'Sufficient width, even surface, no vegetation, not holding water.',
                              Fair: 'Sufficient width, with minimal vegetation and slightly uneven.',
                              Poor: 'Insufficient width, with ponding of water, insufficient maintenance.',
                              Bad: 'No maintenance or no sidewalk.',
                              'N/A': 'Not applicable – type/element not present.'
                            }
                          }
                        ].map((row) => (
                          <tr key={row.label} className="border-t border-gray-300 align-top">
                            <td className="border-r border-gray-300 px-3 py-3 align-top font-medium">{row.label}</td>
                            <td className="border-r border-gray-300 px-3 py-3 align-top">
                              <div className="flex flex-col gap-3">
                                {conditionRatingOptions.map((option) => (
                                  <label key={`${row.label}-${option}`} className="flex items-center gap-2 text-gray-700">
                                    <input
                                      type="radio"
                                      name={`condition-${row.label}`}
                                      value={option}
                                      checked={conditionRatings[row.label] === option}
                                      onChange={() => handleConditionRatingChange(row.label, option)}
                                      className="h-4 w-4 text-[#0ea5e9]"
                                    />
                                    <span>{option}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top text-gray-700">
                              <div className="divide-y divide-gray-300 overflow-hidden border border-gray-300">
                                {conditionRatingOptions.map((option) => {
                                  const isSelected = conditionRatings[row.label] === option;
                                  return (
                                    <div
                                      key={`${row.label}-${option}`}
                                      className={isSelected ? 'bg-[#eaf9ff]' : 'bg-white'}
                                    >
                                      <div className="flex items-center justify-between px-2 py-2">
                                        <span className={`text-sm font-bold uppercase tracking-wide ${isSelected ? 'text-[#0ea5e9]' : 'text-gray-700'}`}>
                                          {option}
                                        </span>
                                        {isSelected && <span className="text-[10px] font-medium text-[#0ea5e9]">Selected</span>}
                                      </div>
                                      <p className="px-2 pb-2 text-sm leading-relaxed text-gray-700">
                                        {row.details[option as keyof typeof row.details]}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 text-xs text-gray-600">
                    <span className="font-medium">N/A: Not applicable – type/element not present.</span>
                  </div>
                </div>

                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspection Findings*</h3>
                  <AutoGrowTextarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900 resize-y"
                    placeholder="Enter inspection findings..."
                    required
                  />
                </div>

                <div className="border-b pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachment*</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="inline-flex cursor-pointer items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50 transition-colors min-w-[140px]">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        aria-label="Required inspection attachment"
                        onChange={handleAttachmentChange}
                      />
                      Choose File
                    </label>
                    <span className="text-sm text-gray-700">{attachmentName}</span>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">Supported File Formats: PDF, JPG, PNG | Max Size: 10 MB</p>
                </div>

                <div className="border-b pb-6 text-gray-900">
                  <p className="text-sm">Prepared by:</p>
                  <p className="font-bold uppercase">{currentUser}</p>
                  <p className="text-sm">Site Inspector</p>
                </div>
                </section>
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
                  {validationNotice && (
                    <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{validationNotice}</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingInspection(null);
                      setConditionRatings({});
                      setSelectedAttachment(null);
                      setAttachmentName('No file chosen');
                      setValidationNotice('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingInspection ? 'Save Changes' : 'Submit Inspection'}
                  </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        <Dialog
          open={selectedInspection !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedInspection(null);
          }}
        >
          {selectedInspection && (() => {
            const { inspection, referenceId } = selectedInspection;
            const score = Math.round(getRatingScore(inspection.conditionRating) * 10);
            const details = Object.entries(inspection.conditionRatings || {})
              .filter(([, value]) => value !== 'N/A');
            const defects = details.filter(([, value]) => value === 'Fair' || value === 'Poor' || value === 'Bad');
            const condition = getConditionLabel(inspection);
            const road = localRoadList.find((item) => item.id === inspection.localRoadId);
            const projectName = road?.projectName || road?.name || inspection.projectName || inspection.localRoadName;

            return (
              <DialogContent className="inspection-detail-dialog card-details-dialog max-h-[min(620px,calc(100vh-32px))] overflow-hidden rounded-2xl border-0 bg-white p-0 text-slate-800 shadow-2xl sm:max-w-[840px]">
                <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 pr-14 text-white">
                  <DialogTitle className="text-xl font-bold text-white">{projectName}</DialogTitle>
                  <DialogDescription className="text-sm text-blue-100">Municipal Engineering Office · Inspection Entry · {referenceId}</DialogDescription>
                </div>
                <div className="max-h-[calc(min(620px,100vh-32px)-76px)] space-y-5 overflow-y-auto px-6 pb-8 pt-5">
                  <section className="border-b pb-6">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">Project Information</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      { label: 'Project / Program / Activity Name *', value: projectName },
                      { label: 'Project Category', value: road?.projectCategory || road?.type || inspection.projectCategory || 'Local Road' },
                      { label: 'Location', value: road?.location || inspection.location || 'Not specified' },
                      { label: 'Inspection Date *', value: inspection.date || 'Not specified' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
                        <span className="block min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-700">{value}</span>
                      </div>
                    ))}
                  </div>
                  </section>

                  <section className="border-b pb-6">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">Road Information</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {[
                        ['Road Network ID No.', road?.roadNetworkId || inspection.roadNetworkId || 'Not specified'],
                        ['Road Name', road?.roadName || road?.name || inspection.roadName || 'Not specified'],
                      ].map(([label, value]) => (
                        <div key={label}><span className="mb-2 block text-sm font-medium text-gray-700">{label}</span><span className="block min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-700">{value}</span></div>
                      ))}
                    </div>
                  </section>

                  <section className="border-b pb-6">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">Inspection Details</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {[
                        ['Inspector *', inspection.inspector || 'Not specified'],
                        ['Inspection Type *', inspection.inspectionType || 'Not specified'],
                        ['Integrity', `${score}%`],
                        ['Condition', condition],
                        [inspection.isAnnualFollowUp ? 'Follow-up Status' : 'Validation Status', inspection.validationStatus || 'Pending Validation'],
                      ].map(([label, value]) => (
                        <div key={label}><span className="mb-2 block text-sm font-medium text-gray-700">{label}</span><span className="block min-h-[3rem] rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-700">{value}</span></div>
                      ))}
                    </div>
                    <p className="mb-2 mt-4 block text-sm font-medium text-gray-700">Observation Notes</p>
                    <p className="min-h-[5rem] whitespace-pre-wrap rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm leading-6 text-gray-700">
                      {inspection.remarks || 'No inspection notes provided.'}
                    </p>
                  </section>
                  {(road?.projectDescription || road?.description || inspection.projectDescription || inspection.roadNetworkId || road?.roadNetworkId) && (
                    <section>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Project Details</h3>
                      <div className="space-y-3 rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-700">
                        {(road?.projectDescription || road?.description || inspection.projectDescription) && (
                          <p><span className="font-semibold text-slate-700">Scope: </span>{road?.projectDescription || road?.description || inspection.projectDescription}</p>
                        )}
                        {(road?.roadNetworkId || inspection.roadNetworkId) && (
                          <p><span className="font-semibold text-slate-700">Road Network ID: </span>{road?.roadNetworkId || inspection.roadNetworkId}</p>
                        )}
                      </div>
                    </section>
                  )}

                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Condition Assessment</h3>
                    {details.length > 0 ? (
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {details.map(([element, rating]) => (
                          <li key={element} className="flex items-center justify-between gap-3 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm">
                            <span className="text-slate-600">{element}</span>
                            <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${
                              rating === 'Good' ? 'bg-emerald-50 text-emerald-700' :
                              rating === 'Fair' ? 'bg-amber-50 text-amber-700' :
                              'bg-rose-50 text-rose-700'
                            }`}>{rating}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-3 text-sm text-gray-500">
                        No condition details recorded.
                      </p>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Defects &amp; Maintenance Requisitions</h3>
                    {defects.length > 0 ? (
                      <ul className="space-y-1.5">
                        {defects.map(([element, rating]) => (
                          <li key={element} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600">
                            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                            <span>{element}{details.length > 1 ? ` · ${rating}` : ''}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-3 text-sm text-gray-500">
                        {details.length > 0 ? 'No defects identified.' : 'No condition details recorded.'}
                      </p>
                    )}
                  </section>
                  <section className="border-t pt-5">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-600">Submitted Attachments</h3>
                    {inspection.attachment ? (
                      <div className="overflow-hidden rounded-lg border border-gray-300 bg-gray-100">
                        <button
                          type="button"
                          onClick={() => setSelectedInspectionAttachment(inspection.attachment ?? null)}
                          className="flex w-full flex-col items-center justify-center bg-slate-100 p-3 text-sm text-blue-700 hover:bg-blue-50"
                        >
                          {inspection.attachment.type.startsWith('image/') ? (
                            <img src={inspection.attachment.dataUrl} alt="" className="h-28 w-full object-contain" />
                          ) : (
                            <FileText className="mb-2 h-10 w-10" aria-hidden="true" />
                          )}
                          <span className="mt-2 font-medium hover:underline">{inspection.attachment.name}</span>
                          <span className="mt-1 text-xs text-slate-500">Select to view full attachment</span>
                        </button>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-3 text-sm text-gray-500">
                        No attachments available.
                      </p>
                    )}
                  </section>
                  {canPrint && (
                    <div className="flex justify-end border-t border-slate-200 pt-5">
                      <button type="button" onClick={() => printInspection(inspection, referenceId)} className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800">
                        <Printer className="h-4 w-4" /> Print
                      </button>
                    </div>
                  )}
                </div>
              </DialogContent>
            );
          })()}
        </Dialog>

        <Dialog open={selectedInspectionAttachment !== null} onOpenChange={(open) => !open && setSelectedInspectionAttachment(null)}>
          {selectedInspectionAttachment && (
            <DialogContent className="max-h-[min(760px,calc(100vh-32px))] overflow-hidden rounded-2xl border-0 bg-white p-0 text-slate-800 shadow-2xl sm:max-w-[900px]">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-4 pr-12 text-white">
                <DialogTitle className="truncate text-base font-bold text-white">{selectedInspectionAttachment.name}</DialogTitle>
                <DialogDescription className="mt-1 text-xs text-blue-100">{selectedInspectionAttachment.type || 'File'}</DialogDescription>
              </div>
              <div className="flex max-h-[calc(min(760px,100vh-32px)-84px)] min-h-[320px] items-center justify-center overflow-auto bg-slate-100 p-6">
                {selectedInspectionAttachment.type.startsWith('image/') ? (
                  <img
                    src={selectedInspectionAttachment.dataUrl}
                    alt={selectedInspectionAttachment.name}
                    className="max-h-[min(620px,calc(100vh-160px))] max-w-full object-contain"
                  />
                ) : (
                  <iframe
                    src={selectedInspectionAttachment.dataUrl}
                    title={selectedInspectionAttachment.name}
                    className="h-[min(620px,calc(100vh-160px))] w-full rounded-lg border border-slate-200 bg-white"
                  />
                )}
              </div>
            </DialogContent>
          )}
        </Dialog>

        <div className="mb-8 flex flex-col items-stretch justify-between gap-4 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <label className="relative block w-full sm:max-w-[620px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by asset, inspector, or reference ID..."
              aria-label="Search inspections"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1" role="group" aria-label="Filter inspections by status">
            {inspectionFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
                className={`shrink-0 rounded-xl px-4 py-2.5 font-medium transition ${
                  activeFilter === filter
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <section aria-labelledby="inspection-history-title">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="inspection-history-title" className="flex items-center gap-3 text-lg font-bold text-blue-900">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              Inspection History
            </h2>
            <span className="text-sm text-slate-500">{filteredInspections.length} {filteredInspections.length === 1 ? 'record' : 'records'} listed</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredInspections.map(({ inspection, referenceId }) => {
              const road = localRoadList.find((item) => item.id === inspection.localRoadId);
              const isPendingInspection = isPendingInspectionRecord(inspection);
              const projectName = road?.projectName || road?.name || inspection.projectName || inspection.localRoadName;
              return (
                <article
                  key={inspection.id}
                  tabIndex={0}
                  aria-label={`View full inspection ${referenceId} for ${projectName}`}
                  onClick={() => setSelectedInspection({ inspection, referenceId })}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setSelectedInspection({ inspection, referenceId });
                    }
                  }}
                  title="Click to view full inspection details"
                  className="group flex h-[300px] cursor-pointer flex-col rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:border-blue-300 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_12px_28px_rgba(37,99,235,0.16)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                    <div className="flex items-center justify-between gap-3 text-sm leading-5 text-slate-700">
                      <span className="truncate">{referenceId}</span>
                      <span className="shrink-0 text-right">{inspection.date || 'Date not specified'}</span>
                    </div>
                    <h3 className="inspection-road-name mt-3 line-clamp-2 text-base font-bold text-slate-900 transition-colors group-hover:text-blue-700" title={projectName}>
                      {projectName}
                    </h3>
                    <p className="inspection-road-category mt-1 text-sm text-slate-500">
                      {road?.projectCategory || road?.type || 'Local Road'}
                    </p>
                    <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {inspection.isScheduledAnnualFollowUp
                            ? `Annual Follow-up · ${inspection.annualFollowUpYear}`
                            : isPendingInspection
                            ? 'Validation Inspection'
                            : 'Inspection Findings'}
                      </span>
                      <p className="inspection-remarks mt-1 line-clamp-5 text-sm leading-6 text-slate-700">
                        {inspection.isScheduledAnnualFollowUp
                          ? `Inspection due by ${inspection.date}. Edit this entry to record the annual inspection.`
                          : isPendingInspection
                          ? 'The project was validated. Edit this entry to record inspection findings.'
                          : inspection.remarks || 'No observation notes recorded.'}
                      </p>
                    </div>
                  <footer className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isPendingInspection
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {isPendingInspection ? 'Pending' : 'Completed'}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="flex shrink-0 items-center gap-1.5 text-sm text-slate-500">
                        <Calendar className="h-4 w-4" />
                        {inspection.date || 'Date not specified'}
                      </span>
                      {!isAdminReadDeleteOnly && <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEditingInspection(inspection);
                        }}
                        aria-label={`${isPendingInspection ? 'Record' : 'Edit'} inspection ${referenceId}`}
                        title={isPendingInspection ? 'Record inspection' : 'Edit inspection'}
                        className="rounded-md p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {isPendingInspection
                          ? <ClipboardCheck className="h-4 w-4" />
                          : <Pencil className="h-4 w-4" />}
                      </button>}
                      {!isInspector && !inspection.isScheduledAnnualFollowUp && <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDelete(inspection);
                        }}
                        aria-label={`Delete inspection ${referenceId}`}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedInspection({ inspection, referenceId });
                        }}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"
                      >
                        Details <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
            {filteredInspections.length === 0 && (
              <div className="col-span-full rounded-[22px] border border-slate-200 bg-white px-6 py-14 text-center text-slate-500">
                {inspections.length === 0
                  ? 'No inspections recorded yet. Add your first inspection above.'
                  : 'No inspections match your search or selected filter.'}
              </div>
            )}
          </div>
        </section>
        <div className="mb-10 mt-auto flex flex-col gap-2 border-t border-slate-200 px-1 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Showing {filteredInspections.length} of {inspections.length} total inspection records</span>
          <span className="font-medium text-blue-700">Municipality of Mabini, Batangas</span>
        </div>
      </div>
      <ConfirmActionDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete inspection?"
        description={`Delete the inspection for ${pendingDelete?.localRoadName || 'this road'}? This action cannot be undone.`}
        onConfirm={() => {
          if (pendingDelete) void onDeleteInspection(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
    </>
  );
}
