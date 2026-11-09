import { MapPin, Route, Wallet, Layers3 } from 'lucide-react';

interface AnalyticsDashboardProps {
  localRoadData: any[];
}

const isRoad = (item: any) => /road/i.test(`${item.type || ''} ${item.projectCategory || ''}`);

const parseAmount = (value?: string) => {
  const amount = Number((value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
};

const formatCurrency = (amount: number) => `₱ ${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export function AnalyticsDashboard({ localRoadData }: AnalyticsDashboardProps) {
  const roads = localRoadData.filter(isRoad);
  const investment = roads.reduce((total, road) => total + parseAmount(road.contractedAmount || road.appropriation), 0);
  const barangays = new Set(roads.map(road => road.barangay || road.location).filter(Boolean));
  const concreteRoads = roads.filter(road => /concrete|pccp/i.test(`${road.components || ''} ${road.description || ''} ${road.projectDescription || ''}`)).length;
  const asphaltRoads = roads.filter(road => /asphalt|bituminous/i.test(`${road.components || ''} ${road.description || ''} ${road.projectDescription || ''}`)).length;
  const identifiedPavements = concreteRoads + asphaltRoads;
  const concretePercent = identifiedPavements ? Math.round((concreteRoads / identifiedPavements) * 100) : 0;
  const asphaltPercent = identifiedPavements ? 100 - concretePercent : 0;

  const metrics = [
    {
      label: 'Total Road Project Investment',
      value: formatCurrency(investment),
      note: investment ? 'Based on recorded contract amounts' : 'No contract amounts recorded',
      icon: Wallet,
      color: 'text-blue-600',
    },
    {
      label: 'Pavement Type Ratio',
      value: identifiedPavements ? `${concretePercent}% Concrete · ${asphaltPercent}% Asphalt` : 'Not specified',
      note: identifiedPavements ? `${identifiedPavements} roads with pavement details` : 'Add pavement materials to project details',
      icon: Layers3,
      color: 'text-emerald-600',
    },
    {
      label: 'Barangays Covered',
      value: String(barangays.size),
      note: `${roads.length} cataloged road section${roads.length === 1 ? '' : 's'}`,
      icon: MapPin,
      color: 'text-amber-600',
    },
  ];

  return (
    <main className="min-h-screen bg-[#E3EEF9] p-5 text-slate-800 sm:p-8">
      <header className="mb-7">
        <h1 className="text-xl font-semibold tracking-tight text-blue-700">Road Network Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Local road investments, pavement classifications, and network distribution.</p>
      </header>

      <section className="mb-7 grid grid-cols-1 gap-5 md:grid-cols-3">
        {metrics.map(({ label, value, note, icon: Icon, color }) => (
          <article key={label} className="min-h-[145px] rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="mt-2 break-words text-xl font-bold text-blue-700">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{note}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-md sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-bold text-blue-950">Barangay Road Classification &amp; Pavement Distribution</h2>
            <p className="mt-1 text-sm text-slate-400">Inventory of registered local road sections and their recorded condition</p>
          </div>
          <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">Municipality of Mabini</span>
        </div>

        {roads.length ? (
          <div className="divide-y divide-slate-100">
            {roads.map((road, index) => {
              const condition = road.condition || 'Not rated';
              const risk = ['Poor', 'Bad'].includes(condition) ? 'High' : condition === 'Fair' ? 'Medium' : 'Low';
              const pavementDescription = road.components || road.description || road.projectDescription || road.projectCategory || road.type || 'Pavement details not recorded';

              return (
                <article key={road.id || `${road.name}-${index}`} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-slate-800">{road.roadName || road.name || road.projectName || 'Unnamed road section'}</h3>
                    <p className="mt-1 truncate text-sm text-slate-400">
                      {road.barangay || road.location || 'Barangay not recorded'} · {pavementDescription}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-5 text-sm">
                    <span className={`rounded-lg px-3 py-1.5 ${condition === 'Good' ? 'bg-blue-50 text-blue-700' : condition === 'Fair' ? 'bg-amber-50 text-amber-700' : condition === 'Not rated' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-700'}`}>{condition}</span>
                    <span className="min-w-[95px] text-right text-slate-500">Risk: {risk}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Route className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">No road projects have been cataloged yet.</p>
            <p className="mt-1 text-xs text-slate-400">Add a road project to see its investment, pavement, and condition analytics.</p>
          </div>
        )}
      </section>
    </main>
  );
}
