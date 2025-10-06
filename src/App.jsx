import React, { useState, useEffect } from 'react';
import { Search, Download, TrendingUp, Calendar, Droplets } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE_URL = 'https://hydapi.nve.no/api/v1';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationData, setStationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);

  // Initialize dates
  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(weekAgo.toISOString().split('T')[0]);
  }, []);

  // Fetch all stations
  const fetchStations = async () => {
    if (!apiKey) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/Stations`, {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': apiKey
        }
      });
      const data = await response.json();
      setStations(data.data || []);
      setFilteredStations(data.data || []);
      setShowApiKeyInput(false);
    } catch (error) {
      alert('Error fetching stations: ' + error.message);
    }
    setLoading(false);
  };

  // Search stations
  useEffect(() => {
    if (!searchTerm) {
      setFilteredStations(stations);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = stations.filter(s => 
      s.stationName?.toLowerCase().includes(term) ||
      s.riverName?.toLowerCase().includes(term) ||
      s.stationId?.includes(term)
    );
    setFilteredStations(filtered);
  }, [searchTerm, stations]);

  // Fetch station data
  const fetchStationData = async (stationId) => {
    if (!apiKey || !startDate || !endDate) return;
    
    setLoading(true);
    setStationData(null);
    
    try {
      const params = new URLSearchParams({
        StationId: stationId,
        Parameter: '1000',
        ResolutionTime: '0',
        ReferenceTime: `${startDate}/${endDate}`
      });
      
      const response = await fetch(`${API_BASE_URL}/Observations?${params}`, {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': apiKey
        }
      });
      
      const result = await response.json();
      
      if (result.data && result.data[0]) {
        const data = result.data[0];
        setStationData({
          stationId: data.stationId,
          stationName: data.stationName,
          parameter: data.parameterName,
          unit: data.unit,
          observations: data.observations || []
        });
      }
    } catch (error) {
      alert('Error fetching station data: ' + error.message);
    }
    setLoading(false);
  };

  // Download data as CSV
  const downloadCSV = () => {
    if (!stationData || !stationData.observations.length) return;
    
    const headers = ['Time', `Value (${stationData.unit})`];
    const rows = stationData.observations.map(obs => 
      [obs.time, obs.value].join(',')
    );
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stationData.stationId}_${startDate}_${endDate}.csv`;
    a.click();
  };

  // Prepare chart data
  const chartData = stationData?.observations.map(obs => ({
    time: new Date(obs.time).toLocaleDateString('no-NO', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }),
    value: obs.value
  })) || [];

  // Calculate statistics
  const stats = stationData ? {
    count: stationData.observations.length,
    min: Math.min(...stationData.observations.map(o => o.value || 0)),
    max: Math.max(...stationData.observations.map(o => o.value || 0)),
    avg: stationData.observations.reduce((sum, o) => sum + (o.value || 0), 0) / stationData.observations.length
  } : null;

  if (showApiKeyInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <Droplets className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">NVE Vannføringsdata</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your NVE API key"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={fetchStations}
              disabled={!apiKey || loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Droplets className="w-8 h-8" />
            <h1 className="text-3xl font-bold">NVE Vannføringsdata</h1>
          </div>
          <p className="text-blue-100">Søk og visualiser vannføringsdata fra norske målestasjoner</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Søk målestasjon
              </h2>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Søk etter navn, elv eller ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
              />
              <div className="text-sm text-gray-600 mb-2">
                {filteredStations.length} stasjoner funnet
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredStations.slice(0, 50).map(station => (
                  <button
                    key={station.stationId}
                    onClick={() => {
                      setSelectedStation(station);
                      fetchStationData(station.stationId);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedStation?.stationId === station.stationId
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-semibold text-sm">{station.stationName}</div>
                    <div className="text-xs text-gray-600">{station.riverName}</div>
                    <div className="text-xs text-gray-500 mt-1">ID: {station.stationId}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Datovelger
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fra dato</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Til dato</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                {selectedStation && (
                  <button
                    onClick={() => fetchStationData(selectedStation.stationId)}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    {loading ? 'Laster...' : 'Oppdater data'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedStation && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Velg en målestasjon</h3>
                <p className="text-gray-500">Søk og velg en målestasjon fra listen til venstre</p>
              </div>
            )}

            {selectedStation && !stationData && loading && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Henter data...</p>
              </div>
            )}

            {stationData && (
              <>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{stationData.stationName}</h2>
                      <p className="text-gray-600">ID: {stationData.stationId}</p>
                      <p className="text-sm text-gray-500 mt-1">{stationData.parameter}</p>
                    </div>
                    <button
                      onClick={downloadCSV}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Last ned CSV
                    </button>
                  </div>

                  {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Antall målinger</div>
                        <div className="text-xl font-bold text-blue-600">{stats.count}</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Minimum</div>
                        <div className="text-xl font-bold text-green-600">{stats.min.toFixed(2)} {stationData.unit}</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Maksimum</div>
                        <div className="text-xl font-bold text-red-600">{stats.max.toFixed(2)} {stationData.unit}</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Gjennomsnitt</div>
                        <div className="text-xl font-bold text-purple-600">{stats.avg.toFixed(2)} {stationData.unit}</div>
                      </div>
                    </div>
                  )}

                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis label={{ value: stationData.unit, angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          dot={false}
                          name={stationData.parameter}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold text-lg mb-3">Rådata</h3>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Tidspunkt</th>
                          <th className="px-4 py-2 text-right">Verdi ({stationData.unit})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stationData.observations.map((obs, idx) => (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-2">{new Date(obs.time).toLocaleString('no-NO')}</td>
                            <td className="px-4 py-2 text-right font-mono">{obs.value?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;