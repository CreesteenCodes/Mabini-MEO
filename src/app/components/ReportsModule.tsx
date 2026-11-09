import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, TrendingUp, Calendar } from 'lucide-react';

interface ReportsModuleProps {
  localRoadData: any[];
  inspections: any[];
  maintenanceRecords: any[];
  userRole: string;
}

export function ReportsModule({ localRoadData, inspections, maintenanceRecords, userRole }: ReportsModuleProps) {
  const conditionTrend = [
    { month: 'Jan', good: 8, fair: 4, poor: 2 },
    { month: 'Feb', good: 7, fair: 5, poor: 2 },
    { month: 'Mar', good: 6, fair: 6, poor: 3 },
    { month: 'Apr', good: 8, fair: 4, poor: 3 },
  ];

  const maintenanceCostByType = [
    { type: 'Routine', cost: 150000 },
    { type: 'Preventive', cost: 280000 },
    { type: 'Emergency', cost: 420000 },
    { type: 'Repair', cost: 350000 },
    { type: 'Rehabilitation', cost: 680000 },
  ];

  const localRoadAge = localRoadData.map(item => {
    const age = new Date().getFullYear() - new Date(item.dateBuilt).getFullYear();
    return {
      name: item.name,
      age: age,
      condition: item.condition,
    };
  });

  const typeDistribution = [
    { name: 'Roads', value: localRoadData.filter(i => i.type === 'Road').length, color: '#3568b5' },
    { name: 'Bridges', value: localRoadData.filter(i => i.type === 'Bridge').length, color: '#6990cc' },
    { name: 'Buildings', value: localRoadData.filter(i => i.type === 'Building').length, color: '#a4bce2' },
    { name: 'Seawalls', value: localRoadData.filter(i => i.type === 'Seawall').length, color: '#28539b' },
    { name: 'Flood Control', value: localRoadData.filter(i => i.type === 'Flood Control').length, color: '#244780' },
  ];

  const handleExportReport = (reportType: string) => {
    if (userRole !== 'Staff - Validator') {
      alert('Only Staff - Validator members can print reports.');
      return;
    }
    alert(`Printing ${reportType} report... (Feature would generate PDF/Excel in production)`);
  };

  const canPrint = userRole === 'Staff - Validator';

  return (
    <div className="p-6 space-y-6 bg-[#E3EEF9] min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-blue-700">Reports & Analytics</h1>
        </div>
        {canPrint && (
          <button
            onClick={() => handleExportReport('Full System')}
            className="bg-[#0ea5e9] text-white px-6 py-3 rounded-lg hover:bg-[#0284c7] transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Print Full Report
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-6 h-6 text-[#0ea5e9]" />
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-[#0ea5e9]">{localRoadData.length}</p>
          <p className="text-sm text-gray-600">Local Road Assets</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-6 h-6 text-[#38bdf8]" />
            <span className="text-xs text-gray-500">This Month</span>
          </div>
          <p className="text-2xl font-bold text-[#0ea5e9]">{inspections.length}</p>
          <p className="text-sm text-gray-600">Inspections Completed</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <Calendar className="w-6 h-6 text-[#7dd3fc]" />
            <span className="text-xs text-gray-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-[#0ea5e9]">{maintenanceRecords.length}</p>
          <p className="text-sm text-gray-600">Maintenance Activities</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <Download className="w-6 h-6 text-[#0ea5e9]" />
            <span className="text-xs text-gray-500">Budget</span>
          </div>
          <p className="text-2xl font-bold text-[#0ea5e9]">
            ₱{(maintenanceRecords.reduce((sum, m) => sum + m.cost, 0) / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-gray-600">Total Maintenance Cost</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#0ea5e9]">Condition Trend Analysis</h2>
            {canPrint && (
              <button
                onClick={() => handleExportReport('Condition Trend')}
                className="text-[#0ea5e9] hover:text-[#0284c7] text-sm flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Print
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={conditionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="good" stroke="#3568b5" strokeWidth={2} name="Good" />
              <Line type="monotone" dataKey="fair" stroke="#6990cc" strokeWidth={2} name="Fair" />
              <Line type="monotone" dataKey="poor" stroke="#28539b" strokeWidth={2} name="Poor" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#0ea5e9]">Maintenance Cost by Type</h2>
            {canPrint && (
              <button
                onClick={() => handleExportReport('Maintenance Costs')}
                className="text-[#0ea5e9] hover:text-[#0284c7] text-sm flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Print
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={maintenanceCostByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="cost" fill="#3568b5" name="Cost (₱)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#0ea5e9]">Local Road Type Distribution</h2>
            {canPrint && (
              <button
                onClick={() => handleExportReport('Type Distribution')}
                className="text-[#0ea5e9] hover:text-[#0284c7] text-sm flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Print
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#3568b5"
                dataKey="value"
              >
                {typeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#0ea5e9]">Local Road Age Analysis</h2>
            {canPrint && (
              <button
                onClick={() => handleExportReport('Age Analysis')}
                className="text-[#0ea5e9] hover:text-[#0284c7] text-sm flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Print
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={localRoadAge.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={120}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <YAxis label={{ value: 'Age (years)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="age" fill="#3568b5" name="Age (years)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#0ea5e9]">Summary Statistics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-[#0ea5e9]/10 to-[#0ea5e9]/20 rounded-lg p-6 border border-[#0ea5e9]/30">
            <h3 className="font-semibold text-[#0ea5e9] mb-3">Local Road Condition</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-[#0ea5e9]/70">Good Condition:</span>
                <span className="font-bold text-[#0ea5e9]">
                  {localRoadData.filter(i => i.condition === 'Good').length}
                  ({((localRoadData.filter(i => i.condition === 'Good').length / localRoadData.length) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#0ea5e9]/70">Fair Condition:</span>
                <span className="font-bold text-[#0ea5e9]">
                  {localRoadData.filter(i => i.condition === 'Fair').length}
                  ({((localRoadData.filter(i => i.condition === 'Fair').length / localRoadData.length) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#0ea5e9]/70">Poor Condition:</span>
                <span className="font-bold text-[#0ea5e9]">
                  {localRoadData.filter(i => i.condition === 'Poor').length}
                  ({((localRoadData.filter(i => i.condition === 'Poor').length / localRoadData.length) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#38bdf8]/10 to-[#38bdf8]/20 rounded-lg p-6 border border-[#38bdf8]/30">
            <h3 className="font-semibold text-[#0ea5e9] mb-3">Inspection Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-[#0ea5e9]/70">Total Inspections:</span>
                <span className="font-bold text-[#0ea5e9]">{inspections.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#0ea5e9]/70">Avg Rating:</span>
                <span className="font-bold text-[#0ea5e9]">
                  {inspections.length > 0
                    ? (inspections.reduce((sum, i) => sum + i.conditionRating, 0) / inspections.length).toFixed(1)
                    : '0'}/10
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#0ea5e9]/70">Coverage:</span>
                <span className="font-bold text-[#0ea5e9]">
                  {((new Set(inspections.map(i => i.localRoadId)).size / localRoadData.length) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#7dd3fc]/10 to-[#7dd3fc]/20 rounded-lg p-6 border border-[#7dd3fc]/30">
            <h3 className="font-semibold text-[#0ea5e9] mb-3">Maintenance Activity</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-[#0ea5e9]/70">Completed:</span>
                <span className="font-bold text-[#0ea5e9]">
                  {maintenanceRecords.filter(m => m.status === 'Completed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#0ea5e9]/70">In Progress:</span>
                <span className="font-bold text-[#0ea5e9]">
                  {maintenanceRecords.filter(m => m.status === 'In Progress').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#0ea5e9]/70">Scheduled:</span>
                <span className="font-bold text-[#0ea5e9]">
                  {maintenanceRecords.filter(m => m.status === 'Scheduled').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
