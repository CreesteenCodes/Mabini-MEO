import { useState } from 'react';
import { Brain, AlertTriangle, TrendingUp, Activity, Sparkles, Loader2, CheckCircle } from 'lucide-react';

export interface PredictionResult {
  localRoadId: string;
  localRoadName: string;
  type: string;
  lastInspection: string;
  condition: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  priorityScore: number;
  justification: string;
  recommendation: string;
}

interface AIPredictionModuleProps {
  localRoadData: any[];
  inspections: any[];
  predictions: PredictionResult[];
  onPredictionsChange: (predictions: PredictionResult[]) => void;
}

const actionableRatings = new Set(['Fair', 'Poor', 'Bad']);

function isActionableAssessment(assessment: Record<string, string> | undefined): boolean {
  return Object.values(assessment || {}).some((rating) => actionableRatings.has(rating));
}

export function AIPredictionModule({
  localRoadData,
  inspections,
  predictions,
  onPredictionsChange,
}: AIPredictionModuleProps) {
  const [viewState, setViewState] = useState<'empty' | 'loading' | 'results'>(() =>
    predictions.length > 0 ? 'results' : 'empty'
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

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
      .filter(([, inspection]) => isActionableAssessment(inspection.conditionRatings))
      .map(([roadId]) => roadId)
  );
  const visiblePredictions = predictions.filter((prediction) => eligibleRoadIds.has(prediction.localRoadId));

  const steps = [
    'Preparing latest eligible inspection assessments',
    'Sending assessment data to Meta Llama via Vercel AI Gateway',
    'Validating generated priority recommendations',
    'Displaying results'
  ];

  const generatePredictions = async () => {
    setErrorMessage('');
    setViewState('loading');
    setCurrentStep(0);

    try {
      const items = localRoadData.flatMap((road) => {
        const inspection = latestInspectionByRoadId.get(road.id);
        if (!inspection || !isActionableAssessment(inspection.conditionRatings)) return [];

        return [{
          id: road.id,
          name: road.name,
          type: road.type,
          condition: road.condition,
          dateBuilt: road.dateBuilt || '',
          lastInspection: road.lastInspection || '',
          inspections: [{
            date: String(inspection.date || ''),
            conditionRating: Number(inspection.conditionRating),
            assessment: inspection.conditionRatings || {},
            inspectionFindings: String(inspection.remarks || ''),
          }],
        }];
      });
      if (items.length === 0) {
        throw new Error('No projects have a Fair, Poor, or Bad rating in their latest completed inspection. Projects rated only Good or N/A are not included.');
      }
      setCurrentStep(1);

      const response = await fetch('/api/ai-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to generate recommendations.');
      }
      if (!Array.isArray(payload?.data)) {
        throw new Error('The AI service returned an invalid response.');
      }

      setCurrentStep(2);
      const results: PredictionResult[] = payload.data.map((prediction: any) => {
        const road = localRoadData.find((item) => item.id === prediction.localRoadId);
        if (!road) throw new Error('The AI service returned a recommendation for an unknown road.');
        return {
          localRoadId: road.id,
          localRoadName: road.name,
          type: road.type,
          lastInspection: road.lastInspection || 'N/A',
          condition: road.condition,
          riskLevel: prediction.riskLevel,
          priorityScore: prediction.priorityScore,
          justification: prediction.justification,
          recommendation: prediction.recommendation,
        };
      });
      setCurrentStep(3);
      onPredictionsChange(results);
      setViewState('results');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to generate recommendations.');
      setViewState(predictions.length > 0 ? 'results' : 'empty');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-[#E3EEF9] min-h-screen">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-blue-700">AI Maintenance Recommendation</h1>
        </div>
        <button
          onClick={generatePredictions}
          disabled={viewState === 'loading'}
          className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold shadow-md transition hover:brightness-105 ${
            viewState === 'loading'
              ? 'bg-gray-300 cursor-not-allowed text-gray-600'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          {viewState === 'results' ? 'Regenerate' : 'Generate Recommendations'}
        </button>
      </div>

      {errorMessage && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Empty State */}
      {viewState === 'empty' && (
        <div className="bg-white rounded-xl shadow-lg p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#0ea5e9]/10 flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-[#0ea5e9]" />
          </div>
          <h2 className="text-xl font-bold text-[#0ea5e9] mb-2">No recommendations yet</h2>
          <p className="text-sm text-gray-600 text-center max-w-md">
            Click "Generate Recommendations" to let Meta Llama analyze the latest inspection data and generate maintenance priority recommendations.
          </p>
        </div>
      )}

      {/* Loading State */}
      {viewState === 'loading' && (
        <div className="bg-white rounded-xl shadow-lg p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#0ea5e9] animate-spin mb-6" />
          <h2 className="text-lg font-bold text-[#0ea5e9] mb-6">{steps[currentStep]}...</h2>

          <div className="w-full max-w-lg bg-gray-50 rounded-lg p-6 space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  index < currentStep ? 'bg-[#0ea5e9]' :
                  index === currentStep ? 'bg-[#38bdf8]' :
                  'bg-gray-300'
                }`} />
                <span className={`text-sm ${
                  index <= currentStep ? 'text-[#0ea5e9]' : 'text-gray-400'
                }`}>
                  {step}
                </span>
                {index < currentStep && (
                  <CheckCircle className="w-4 h-4 text-[#0ea5e9] ml-auto" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results State */}
      {viewState === 'results' && (
        <>
          {/* Prioritized List */}
          <div>
            <div className="space-y-4">
              {visiblePredictions.length > 0
                ? [...visiblePredictions].sort((a, b) => b.priorityScore - a.priorityScore).map((prediction) => (
                <article key={prediction.localRoadId} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_12px_28px_rgba(37,99,235,0.16)]">
                  {/* Header */}
                  <div className="mb-3">
                    <h3 className="text-base font-bold text-slate-900">{prediction.localRoadName}</h3>
                  </div>

                  {/* Meta */}
                  <p className="text-xs text-gray-600 mb-4">
                    {prediction.type} | Last inspected: {prediction.lastInspection} | Condition: {prediction.condition}
                  </p>

                  {/* Justification */}
                  <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">AI Justification</p>
                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                      {prediction.justification.replace(/\s*(Inspection findings:)/i, '\n$1')}
                    </p>
                  </div>

                  {/* Recommendation */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended Maintenance Activity</p>
                    <p className="text-sm leading-6 text-slate-700">{prediction.recommendation}</p>
                  </div>
                </article>
              ))
                : <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
                    No projects have a Fair, Poor, or Bad rating in their latest completed inspection. Projects rated only Good or N/A are not shown.
                  </p>}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 text-center">
            Generated: {new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })} | Head Engineer may review and override all recommendations
          </div>
        </>
      )}
    </div>
  );
}
