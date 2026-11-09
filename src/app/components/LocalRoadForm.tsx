import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AutoGrowTextarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ProjectAttachment {
  name: string;
  type: string;
  dataUrl: string;
  category: string;
}

interface LocalRoad {
  id: string;
  name: string;
  type: string;
  location: string;
  dateBuilt: string;
  condition: string;
  lastInspection?: string;
  projectName?: string;
  projectCategory?: string;
  projectDescription?: string;
  targetCompletionDate?: string;
  noOfExtensions?: string;
  actualCompletionDate?: string;
  roadNetworkId?: string;
  roadName?: string;
  barangay?: string;
  components?: string;
  description?: string;
  contractorName?: string;
  contractorAddress?: string;
  contactInformation?: string;
  pcadLicenseNo?: string;
  sourceOfFunds?: string;
  appropriation?: string;
  contractedAmount?: string;
  adjustProjectCost?: string;
  completionDate?: string;
  completionPercentage?: string;
  turnoverDate?: string;
  attachments?: ProjectAttachment[];
}

interface ProjectFormData {
  projectName: string;
  projectCategory: string;
  projectDescription: string;
  location: string;
  dateStarted: string;
  targetCompletionDate: string;
  noOfExtensions: string;
  actualCompletionDate: string;
  attachment: File[];
  roadNetworkId: string;
  roadName: string;
  barangay: string;
  components: string;
  description: string;
  contractorName: string;
  contractorAddress: string;
  contactInformation: string;
  pcadLicenseNo: string;
  sourceOfFunds: string;
  appropriation: string;
  contractedAmount: string;
  adjustProjectCost: string;
  completionDate: string;
  completionPercentage: string;
  turnoverDate: string;
  attachments: File[];
}

interface LocalRoadFormProps {
  item?: LocalRoad | null;
  editId?: string;
  onSave: (item: Omit<LocalRoad, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

const projectCategories = [
  'National Road',
  'Provincial Road',
  'City Road',
  'Municipal Road',
  'Barangay Road',
  'Other Specify',
];

const localRoadFormTabs = [
  { id: 'project', label: 'Project Info' },
  { id: 'road', label: 'Road Info' },
  { id: 'contractor', label: 'Contractor Info' },
  { id: 'financial', label: 'Financial Info' },
  { id: 'turnover', label: 'Turnover Info' },
] as const;

const getInitialFormData = (road?: LocalRoad | null): ProjectFormData => ({
  projectName: road?.projectName || road?.name || '',
  projectCategory: road?.projectCategory || road?.type || '',
  projectDescription: road?.projectDescription || road?.description || '',
  location: road?.location || '',
  dateStarted: road?.dateBuilt || '',
  targetCompletionDate: road?.targetCompletionDate || '',
  noOfExtensions: road?.noOfExtensions || '',
  actualCompletionDate: road?.actualCompletionDate || '',
  attachment: [],
  roadNetworkId: road?.roadNetworkId || '',
  roadName: road?.roadName || road?.name || '',
  barangay: road?.barangay || '',
  components: road?.components || '',
  description: road?.description || '',
  contractorName: road?.contractorName || '',
  contractorAddress: road?.contractorAddress || '',
  contactInformation: road?.contactInformation || '',
  pcadLicenseNo: road?.pcadLicenseNo || '',
  sourceOfFunds: road?.sourceOfFunds || '',
  appropriation: road?.appropriation || '',
  contractedAmount: road?.contractedAmount || '',
  adjustProjectCost: road?.adjustProjectCost || '',
  completionDate: road?.completionDate || '',
  completionPercentage: road?.completionPercentage || '',
  turnoverDate: road?.turnoverDate || '',
  attachments: [],
});

export function LocalRoadForm({ item, editId, onSave, onClose }: LocalRoadFormProps) {
  const [activeFormTab, setActiveFormTab] = useState<(typeof localRoadFormTabs)[number]['id']>('project');
  const [formData, setFormData] = useState<ProjectFormData>(() => getInitialFormData(item));
  const [requiredFieldsError, setRequiredFieldsError] = useState('');

  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);

  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const attachmentsInputRef = useRef<HTMLInputElement>(null);
  const formScrollRef = useRef<HTMLFormElement>(null);
  const projectSectionRef = useRef<HTMLElement>(null);
  const roadSectionRef = useRef<HTMLElement>(null);
  const contractorSectionRef = useRef<HTMLElement>(null);
  const financialSectionRef = useRef<HTMLElement>(null);
  const turnoverSectionRef = useRef<HTMLElement>(null);
  const formSectionRefs = [projectSectionRef, roadSectionRef, contractorSectionRef, financialSectionRef, turnoverSectionRef];

  useEffect(() => {
    if (item) {
      setFormData(getInitialFormData(item));
    }
  }, [item, editId]);

  useEffect(() => {
    formScrollRef.current?.scrollTo({ top: 0 });
    setActiveFormTab('project');
  }, [editId]);

  // Auto-update roadName when location changes
  useEffect(() => {
    if (item) return;
    setFormData(prev => ({
      ...prev,
      roadName: prev.location,
    }));
  }, [formData.location, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = [
      { label: 'Project / Program / Activity Name', value: formData.projectName, tab: 'project' },
      { label: 'Project Category', value: formData.projectCategory, tab: 'project' },
      { label: 'Project Description', value: formData.projectDescription, tab: 'project' },
      { label: 'Location', value: formData.location, tab: 'project' },
      { label: 'Date Started', value: formData.dateStarted, tab: 'project' },
      { label: 'Target Completion Date', value: formData.targetCompletionDate, tab: 'project' },
      { label: 'No. of Extensions', value: formData.noOfExtensions, tab: 'project' },
      { label: 'Actual Completion Date', value: formData.actualCompletionDate, tab: 'project' },
      { label: 'Road Network ID No.', value: formData.roadNetworkId, tab: 'road' },
      { label: 'Road Name', value: formData.roadName, tab: 'road' },
      { label: 'Barangay', value: formData.barangay, tab: 'road' },
      { label: 'Components', value: formData.components, tab: 'road' },
      { label: 'Description', value: formData.description, tab: 'road' },
      { label: 'Contractor Name', value: formData.contractorName, tab: 'contractor' },
      { label: 'Contractor Address', value: formData.contractorAddress, tab: 'contractor' },
      { label: 'Contact Information', value: formData.contactInformation, tab: 'contractor' },
      { label: 'PCAD License No.', value: formData.pcadLicenseNo, tab: 'contractor' },
      { label: 'Source of Funds', value: formData.sourceOfFunds, tab: 'financial' },
      { label: 'Appropriation', value: formData.appropriation, tab: 'financial' },
      { label: 'Contracted Amount', value: formData.contractedAmount, tab: 'financial' },
      { label: 'Adjust Project Cost', value: formData.adjustProjectCost, tab: 'financial' },
      { label: 'Completion Date', value: formData.completionDate, tab: 'turnover' },
      { label: 'Completion Percentage', value: formData.completionPercentage, tab: 'turnover' },
      { label: 'Turnover and Acceptance Date', value: formData.turnoverDate, tab: 'turnover' },
    ] as const;
    const missingFields = requiredFields.filter(({ label, value }) =>
      !value.trim() || (label === 'Project Category' && value.trim() === 'Other Specify')
    );

    if (missingFields.length > 0) {
      setRequiredFieldsError(`Complete all required fields: ${missingFields.map(({ label }) => label).join(', ')}.`);
      const firstMissing = missingFields[0];
      const tabIndex = localRoadFormTabs.findIndex(tab => tab.id === firstMissing.tab);
      setActiveFormTab(firstMissing.tab);
      const section = formSectionRefs[tabIndex]?.current;
      const scrollContainer = formScrollRef.current;
      if (section && scrollContainer) {
        const top = section.getBoundingClientRect().top
          - scrollContainer.getBoundingClientRect().top
          + scrollContainer.scrollTop;
        scrollContainer.scrollTo({ top, behavior: 'smooth' });
      }
      window.setTimeout(() => {
        const focusTarget = firstMissing.label === 'Project Category'
          ? section?.querySelector<HTMLElement>('[aria-label="Project category"]')
          : section?.querySelector<HTMLElement>('input[required]:not(:disabled), textarea[required]');
        focusTarget?.focus();
      }, 0);
      return;
    }
    setRequiredFieldsError('');

    const uploadedAttachments = await Promise.all([
      ...formData.attachment.map(file => ({ file, category: 'Project Attachment' })),
      ...formData.attachments.map(file => ({ file, category: 'Turnover Certificate' })),
    ].map(({ file, category }) => new Promise<ProjectAttachment>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        type: file.type,
        dataUrl: String(reader.result),
        category,
      });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    })));

    const localRoadData = {
      name: formData.projectName,
      type: formData.projectCategory,
      location: formData.location,
      dateBuilt: formData.dateStarted,
      condition: 'Good',
      projectName: formData.projectName,
      projectCategory: formData.projectCategory,
      projectDescription: formData.projectDescription,
      targetCompletionDate: formData.targetCompletionDate,
      noOfExtensions: formData.noOfExtensions,
      actualCompletionDate: formData.actualCompletionDate,
      roadNetworkId: formData.roadNetworkId,
      roadName: formData.roadName,
      barangay: formData.barangay,
      components: formData.components,
      description: formData.description,
      contractorName: formData.contractorName,
      contractorAddress: formData.contractorAddress,
      contactInformation: formData.contactInformation,
      pcadLicenseNo: formData.pcadLicenseNo,
      sourceOfFunds: formData.sourceOfFunds,
      appropriation: formData.appropriation,
      contractedAmount: formData.contractedAmount,
      adjustProjectCost: formData.adjustProjectCost,
      completionDate: formData.completionDate,
      completionPercentage: formData.completionPercentage,
      turnoverDate: formData.turnoverDate,
      attachments: [...(item?.attachments || []), ...uploadedAttachments],
    };
    onSave(editId ? { ...localRoadData, id: editId } : localRoadData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'attachment' | 'attachments') => {
    const newFiles = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ...newFiles],
    }));
    // Reset the input value so user can select the same files again
    e.target.value = '';
  };

  const removeFile = (field: 'attachment' | 'attachments', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const formatCurrency = (value: string) => {
    return value.split('\n').map(line => {
      const digits = line.replace(/\D/g, '');
      return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }).join('\n');
  };

  const handleCurrencyChange = (field: 'appropriation' | 'contractedAmount' | 'adjustProjectCost', value: string) => {
    const formatted = formatCurrency(value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  const handleInputChange = (field: keyof ProjectFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFilePreview = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewFile({ file, url });
  };

  const closePreview = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
  };

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/');
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
    setActiveFormTab(localRoadFormTabs[index].id);
  };
  const updateActiveFormTab = () => {
    const scrollTop = formScrollRef.current?.getBoundingClientRect().top ?? 0;
    const currentIndex = formSectionRefs.reduce((activeIndex, sectionRef, index) => (
      sectionRef.current && sectionRef.current.getBoundingClientRect().top <= scrollTop + 110
        ? index
        : activeIndex
    ), 0);
    setActiveFormTab(localRoadFormTabs[currentIndex].id);
  };

  return (
    <div className="module-form-backdrop fixed inset-0 bg-slate-950/55 backdrop-blur-md flex items-center justify-center z-[9999] p-4 overflow-auto">
      <div className="module-form-panel bg-white rounded-2xl shadow-2xl w-full max-w-[840px] h-[min(560px,calc(100vh-48px))] relative z-[10000] overflow-hidden flex flex-col">
        <div className="flex min-h-[68px] shrink-0 justify-between items-center px-6 py-3 border-b bg-gradient-to-r from-blue-700 to-blue-600">
          <div>
            <h2 className="text-xl font-bold text-white">
              {editId ? 'Edit Local Road Project' : 'Local Road Project Information'}
            </h2>
            <p className="text-sm text-blue-100">Municipal Engineering Office · Infrastructure Encoder Entry</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-300 hover:text-white" aria-label="Close form">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex shrink-0 gap-2 overflow-x-auto border-b bg-slate-50 px-4 py-2" aria-label="Local road form sections">
          {localRoadFormTabs.map((tab, index) => (
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

        <form
          ref={formScrollRef}
          onSubmit={handleSubmit}
          onChange={() => setRequiredFieldsError('')}
          onScroll={updateActiveFormTab}
          className="form-modal-fields min-h-0 flex-1 overflow-y-auto px-6 py-5"
        >
          {requiredFieldsError && (
            <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {requiredFieldsError}
            </p>
          )}
          {/* Project Information */}
          <section ref={projectSectionRef} className="scroll-mt-4 border-b pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project / Program / Activity Name *
                </label>
                <AutoGrowTextarea
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  rows={2}
                  className="w-full resize-y px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Category *
                </label>
                <Select
                  value={
                    projectCategories.includes(formData.projectCategory)
                      ? formData.projectCategory
                      : formData.projectCategory
                        ? 'Other Specify'
                        : ''
                  }
                  onValueChange={(value) => {
                    setFormData({ ...formData, projectCategory: value });
                    setRequiredFieldsError('');
                  }}
                  required
                >
                  <SelectTrigger
                    aria-label="Project category"
                    aria-invalid={Boolean(
                      requiredFieldsError &&
                      (!formData.projectCategory.trim() || formData.projectCategory.trim() === 'Other Specify')
                    )}
                    aria-describedby={
                      requiredFieldsError &&
                      (!formData.projectCategory.trim() || formData.projectCategory.trim() === 'Other Specify')
                        ? 'project-category-error'
                        : undefined
                    }
                  >
                    <SelectValue placeholder="-- Select a Project Category --" />
                  </SelectTrigger>
                  <SelectContent>
                  {!projectCategories.includes(formData.projectCategory) && formData.projectCategory && (
                    <SelectItem value={formData.projectCategory}>{formData.projectCategory}</SelectItem>
                  )}
                  {projectCategories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                  </SelectContent>
                </Select>
                {(formData.projectCategory === 'Other Specify' ||
                  (formData.projectCategory !== '' && !projectCategories.includes(formData.projectCategory))) && (
                  <textarea
                    value={formData.projectCategory === 'Other Specify' ? '' : formData.projectCategory}
                    onChange={(e) => setFormData({ ...formData, projectCategory: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        const controls = Array.from(
                          e.currentTarget.form?.querySelectorAll<HTMLElement>(
                            'input:not([type="hidden"]), select, textarea, button'
                          ) ?? []
                        ).filter((control) => !control.hasAttribute('disabled') && control.tabIndex >= 0);
                        const nextControl = controls[controls.indexOf(e.currentTarget) + 1];
                        nextControl?.focus();
                      }
                    }}
                    rows={1}
                    placeholder="Specify project category"
                    className="mt-2 w-full resize-none px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                    aria-label="Specify project category"
                    required
                  />
                )}
                {requiredFieldsError &&
                  (!formData.projectCategory.trim() || formData.projectCategory.trim() === 'Other Specify') && (
                  <p id="project-category-error" role="alert" className="mt-2 text-sm text-red-600">
                    {formData.projectCategory.trim() === 'Other Specify'
                      ? 'Enter a category when Other Specify is selected.'
                      : 'Select a project category before submitting.'}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description *
              </label>
              <AutoGrowTextarea
                value={formData.projectDescription}
                onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                rows={3}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location (Mabini, Batangas Barangay) *
              </label>
              <AutoGrowTextarea
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                rows={2}
                className="w-full resize-y px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                aria-label="Location (Mabini, Batangas Barangay)"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Started *
                </label>
                <input
                  type="date"
                  value={formData.dateStarted}
                  onChange={(e) => setFormData({ ...formData, dateStarted: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Completion Date *
                </label>
                <input
                  type="date"
                  value={formData.targetCompletionDate}
                  onChange={(e) => setFormData({ ...formData, targetCompletionDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  No. of Extensions *
                </label>
                <input
                  type="number"
                  value={formData.noOfExtensions}
                  onChange={(e) => setFormData({ ...formData, noOfExtensions: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actual Completion Date *
                </label>
                <input
                  type="date"
                  value={formData.actualCompletionDate}
                  onChange={(e) => setFormData({ ...formData, actualCompletionDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachment {formData.attachment.length > 0 && `(${formData.attachment.length} file${formData.attachment.length > 1 ? 's' : ''} selected)`}
              </label>
              
              {formData.attachment.length === 0 ? (
                <>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileChange(e, 'attachment')}
                    accept=".pdf,.jpg,.png"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported File Format: PDF, JPG, PNG | Max File Size: 10 MB
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-blue-50 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                >
                  + Add More Files
                </button>
              )}
              
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileChange(e, 'attachment')}
                accept=".pdf,.jpg,.png"
                className="hidden"
              />

              {formData.attachment.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                  {formData.attachment.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                      <button
                        type="button"
                        onClick={() => handleFilePreview(file)}
                        className="text-left flex-1 text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {isImageFile(file) && '🖼️ '}{file.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile('attachment', index)}
                        className="text-red-600 hover:text-red-800 text-sm ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Road Information */}
          <section ref={roadSectionRef} className="scroll-mt-4 border-b pb-6 pt-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Road Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Road Network ID No. *
                </label>
                <AutoGrowTextarea
                  value={formData.roadNetworkId}
                  onChange={(e) => setFormData({ ...formData, roadNetworkId: e.target.value })}
                  rows={2}
                  className="w-full resize-y px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Road Name * (Dependent on the Location Field)
                </label>
                <input
                  type="text"
                  value={formData.roadName}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed opacity-75"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barangay *
              </label>
              <AutoGrowTextarea
                value={formData.barangay}
                onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                rows={2}
                className="w-full resize-y px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Components *
              </label>
              <AutoGrowTextarea
                value={formData.components}
                onChange={(e) => setFormData({ ...formData, components: e.target.value })}
                rows={2}
                className="w-full resize-y px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <AutoGrowTextarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                rows={3}
                required
              />
            </div>
          </section>

          {/* Contractor Information */}
          <section ref={contractorSectionRef} className="scroll-mt-4 border-b pb-6 pt-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contractor Information</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contractor Name *
              </label>
              <AutoGrowTextarea
                value={formData.contractorName}
                onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                rows={2}
                className="w-full resize-y px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contractor Address *
              </label>
              <AutoGrowTextarea
                value={formData.contractorAddress}
                onChange={(e) => setFormData({ ...formData, contractorAddress: e.target.value })}
                rows={2}
                className="w-full resize-y px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Information *
              </label>
              <AutoGrowTextarea
                value={formData.contactInformation}
                onChange={(e) => setFormData({ ...formData, contactInformation: e.target.value })}
                rows={2}
                className="w-full resize-y px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PCAD License No. *
              </label>
              <AutoGrowTextarea
                value={formData.pcadLicenseNo}
                onChange={(e) => setFormData({ ...formData, pcadLicenseNo: e.target.value })}
                rows={2}
                className="w-full resize-y px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                required
              />
            </div>
          </section>

          {/* Financial Information */}
          <section ref={financialSectionRef} className="scroll-mt-4 border-b pb-6 pt-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source of Funds *
              </label>
              <AutoGrowTextarea
                value={formData.sourceOfFunds}
                onChange={(e) => setFormData({ ...formData, sourceOfFunds: e.target.value })}
                rows={2}
                className="w-full resize-y px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appropriation *
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#0ea5e9]">
                  <span className="px-4 py-3 bg-gray-100 text-gray-700 font-medium">Php</span>
                  <AutoGrowTextarea
                    value={formData.appropriation}
                    onChange={(e) => handleCurrencyChange('appropriation', e.target.value)}
                    rows={2}
                    className="min-h-[3rem] flex-1 resize-y px-4 py-3 border-0 text-gray-900 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contracted Amount *
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#0ea5e9]">
                  <span className="px-4 py-3 bg-gray-100 text-gray-700 font-medium">Php</span>
                  <AutoGrowTextarea
                    value={formData.contractedAmount}
                    onChange={(e) => handleCurrencyChange('contractedAmount', e.target.value)}
                    rows={2}
                    className="min-h-[3rem] flex-1 resize-y px-4 py-3 border-0 text-gray-900 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjust Project Cost *
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#0ea5e9]">
                  <span className="px-4 py-3 bg-gray-100 text-gray-700 font-medium">Php</span>
                  <AutoGrowTextarea
                    value={formData.adjustProjectCost}
                    onChange={(e) => handleCurrencyChange('adjustProjectCost', e.target.value)}
                    rows={2}
                    className="min-h-[3rem] flex-1 resize-y px-4 py-3 border-0 text-gray-900 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Completion and Turnover Information */}
          <section ref={turnoverSectionRef} className="scroll-mt-4 border-b pb-6 pt-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion and Turnover Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Date *
                </label>
                <input
                  type="date"
                  value={formData.completionDate}
                  onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completion Percentage *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.completionPercentage}
                  onChange={(e) => setFormData({ ...formData, completionPercentage: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Turnover and Acceptance Date *
                </label>
                <input
                  type="date"
                  value={formData.turnoverDate}
                  onChange={(e) => setFormData({ ...formData, turnoverDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachment {formData.attachments.length > 0 && `(${formData.attachments.length} file${formData.attachments.length > 1 ? 's' : ''} selected)`}
              </label>
              
              {formData.attachments.length === 0 ? (
                <>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileChange(e, 'attachments')}
                    accept=".pdf,.jpg,.png"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported File Format: PDF, JPG, PNG | Max File Size: 10 MB
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => attachmentsInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-blue-50 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                >
                  + Add More Files
                </button>
              )}
              
              <input
                ref={attachmentsInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileChange(e, 'attachments')}
                accept=".pdf,.jpg,.png"
                className="hidden"
              />

              {formData.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                      <button
                        type="button"
                        onClick={() => handleFilePreview(file)}
                        className="text-left flex-1 text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {isImageFile(file) && '🖼️ '}{file.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile('attachments', index)}
                        className="text-red-600 hover:text-red-800 text-sm ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Submit
            </button>
          </div>
        </form>

        {/* File Preview Modal */}
        {previewFile && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10001] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto relative">
              <button
                onClick={closePreview}
                className="sticky top-0 right-0 p-3 bg-red-600 text-white hover:bg-red-700 rounded-full float-right"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 break-all">{previewFile.file.name}</h3>
                {isImageFile(previewFile.file) ? (
                  <img
                    src={previewFile.url}
                    alt="Preview"
                    className="w-full max-h-[60vh] object-contain rounded-lg"
                  />
                ) : (
                  <div className="bg-gray-100 p-8 rounded-lg text-center">
                    <p className="text-gray-600 mb-4">📄 PDF File</p>
                    <p className="text-sm text-gray-500 mb-6">PDFs cannot be previewed in the browser</p>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = previewFile.url;
                        link.download = previewFile.file.name;
                        link.click();
                      }}
                      className="px-6 py-2 bg-[#0ea5e9] text-white rounded-lg hover:bg-[#0284c7] transition-colors font-medium mb-4"
                    >
                      ⬇️ Download PDF
                    </button>
                    <p className="text-xs text-gray-400 mt-4">File size: {(previewFile.file.size / 1024).toFixed(2)} KB</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
