import { TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  localRoad: string;
  startDate: string;
  endDate: string;
  status: 'On Track' | 'Delayed' | 'Completed';
  progress: number;
  budget: number;
  spent: number;
  description: string;
}

export function ProjectProgressModule() {
  const projects: Project[] = [
    {
      id: '1',
      name: 'Bay Area Seawall Repair',
      localRoad: 'Bay Area Seawall',
      startDate: '2026-04-10',
      endDate: '2026-06-30',
      status: 'On Track',
      progress: 35,
      budget: 450000,
      spent: 157500,
      description: 'Emergency repair of eroded sections and reinforcement of weakened areas.',
    },
    {
      id: '2',
      name: 'Coastal Road Resurfacing',
      localRoad: 'Coastal Road Highway',
      startDate: '2026-04-15',
      endDate: '2026-05-30',
      status: 'On Track',
      progress: 60,
      budget: 280000,
      spent: 168000,
      description: 'Crack sealing and surface patching work along the coastal highway.',
    },
    {
      id: '3',
      name: 'Solo Bridge Rehabilitation',
      localRoad: 'Brgy. Solo Bridge',
      startDate: '2026-03-01',
      endDate: '2026-04-15',
      status: 'Delayed',
      progress: 45,
      budget: 350000,
      spent: 210000,
      description: 'Replacement of corroded railings and bridge deck surface rehabilitation.',
    },
    {
      id: '4',
      name: 'Main Street Bridge Repainting',
      localRoad: 'Main Street Bridge',
      startDate: '2026-03-20',
      endDate: '2026-03-22',
      status: 'Completed',
      progress: 100,
      budget: 120000,
      spent: 118500,
      description: 'Complete repainting and rust prevention treatment.',
    },
  ];

  const statusColors = {
    'On Track': 'bg-[#0ea5e9]/10 text-[#0ea5e9]',
    'Delayed': 'bg-[#0ea5e9]/10 text-[#0ea5e9]',
    'Completed': 'bg-[#38bdf8]/10 text-[#38bdf8]',
  };

  const onTrack = projects.filter(p => p.status === 'On Track').length;
  const delayed = projects.filter(p => p.status === 'Delayed').length;
  const completed = projects.filter(p => p.status === 'Completed').length;

  return (
    <div className="p-6 space-y-6 bg-[#E3EEF9] min-h-screen">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-blue-700">Project Progress</h1>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-3xl font-bold text-[#0ea5e9]">{projects.length}</p>
          <p className="text-sm text-gray-600 mt-1">Total Projects</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#0ea5e9]">
          <p className="text-3xl font-bold text-[#0ea5e9]">{onTrack}</p>
          <p className="text-sm text-gray-600 mt-1">On Track</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#0ea5e9]">
          <p className="text-3xl font-bold text-[#0ea5e9]">{delayed}</p>
          <p className="text-sm text-gray-600 mt-1">Delayed</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#38bdf8]">
          <p className="text-3xl font-bold text-[#0ea5e9]">{completed}</p>
          <p className="text-sm text-gray-600 mt-1">Completed</p>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#0ea5e9]">Active Projects</h2>
        {projects.map((project) => (
          <div key={project.id} className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
            project.status === 'On Track' ? 'border-[#0ea5e9]' :
            project.status === 'Delayed' ? 'border-[#0ea5e9]' :
            'border-[#38bdf8]'
          }`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#0ea5e9]">{project.name}</h3>
                <p className="text-sm text-gray-600">{project.localRoad}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                {project.status}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 mb-4">{project.description}</p>

            {/* Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Timeline</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-[#0ea5e9]">{project.startDate} → {project.endDate}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Budget Status</p>
                <p className="text-sm text-[#0ea5e9]">
                  ₱{project.spent.toLocaleString()} / ₱{project.budget.toLocaleString()}
                  <span className="text-xs text-gray-500 ml-2">
                    ({((project.spent / project.budget) * 100).toFixed(0)}%)
                  </span>
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-gray-600">Project Progress</p>
                <p className="text-sm font-bold text-[#0ea5e9]">{project.progress}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${
                    project.status === 'On Track' ? 'bg-[#0ea5e9]' :
                    project.status === 'Delayed' ? 'bg-[#0ea5e9]' :
                    'bg-[#38bdf8]'
                  }`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
