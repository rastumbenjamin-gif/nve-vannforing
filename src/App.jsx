import React, { useState, useEffect } from 'react';
import { Search, Download, TrendingUp, Calendar, Droplets, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE_URL = 'https://hydapi.nve.no/api/v1';

function App() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_NVE_API_KEY || '');
  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationData, setStationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [parameter, setParameter] = useState('1001');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!import.meta.env.VITE_NVE_API_KEY);

  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(weekAgo.toISOString().split('T')[0]);
  }, []);

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

  const fetchStationData = async (stationId) => {
    if (!apiKey || !startDate || !endDate) return;
    
    setLoading(true);
    setStationData(null);
    
    try {
      const params = new URLSearchParams({
        StationId: stationId,
        Parameter: parameter,
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

  const chartData = stationData?.observations.map(obs => ({
    time: new Date(obs.time).toLocaleDateString('no-NO', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }),
    value: obs.value
  })) || [];

  const stats = stationData ? {
    count: stationData.observations.length,
    min: Math.min(...stationData.observations.map(o => o.value || 0)),
    max: Math.max(...stationData.observations.map(o => o.value || 0)),
    avg: stationData.observations.reduce((sum, o) => sum + (o.value || 0), 0) / stationData.observations.length
  } : null;

  if (showApiKeyInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <Droplets className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">NVE Vannføringsdata</h1>
          <p className="text-center text-gray-600 mb-8">Søk og visualiser vannføringsdata fra norske målestasjoner</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">API Nøkkel</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Skriv inn din NVE API nøkkel"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                onKeyPress={(e) => e.key === 'Enter' && fetchStations()}
              />
            </div>
            <button
              onClick={fetchStations}
              disabled={!apiKey || loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? 'Kobler til...' : 'Koble til'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <Droplets className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">NVE Vannføringsdata</h1>
              <p className="text-blue-100 text-sm">Norges vassdrags- og energidirektorat</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 border-b border-blue-200">
                <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  Søk målestasjon
                </h2>
              </div>
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Søk etter navn, elv eller ID..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="text-sm text-gray-600 mt-3 mb-2 font-medium">
                  {filteredStations.length} stasjon{filteredStations.length !== 1 ? 'er' : ''} funnet
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {filteredStations.slice(0, 50).map(station => (
                    <button
                      key={station.stationId}
                      onClick={() => {
                        setSelectedStation(station);
                        fetchStationData(station.stationId);
                      }}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedStation?.stationId === station.stationId
                          ? 'bg-blue-50 border-blue-500 shadow-md'
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow'
                      }`}
                    >
                      <div className="font-semibold text-sm text-gray-800">{station.stationName}</div>
                      <div className="text-xs text-gray-600 mt-1">{station.riverName}</div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">ID: {station.stationId}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 border-b border-green-200">
                <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Innstillinger
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parameter</label>
                  <select
                    value={parameter}
                    onChange={(e) => setParameter(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                  >
                    <option value="1001">Vannføring (m³/s)</option>
                    <option value="1000">Vannstand (m)</option>
                    <option value="1003">Vanntemperatur (°C)</option>
                    <option value="17">Lufttemperatur (°C)</option>
                    <option value="2001">Snødybde (cm)</option>
                    <option value="3001">Nedbør (mm)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fra dato</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Til dato</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none"
                  />
                </div>
                {selectedStation && (
                  <button
                    onClick={() => fetchStationData(selectedStation.stationId)}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Laster...' : 'Hent data'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {!selectedStation && (
              <div className="bg-white rounded-xl shadow-md p-16 text-center">
                <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">Velg en målestasjon</h3>
                <p className="text-gray-500 text-lg">Søk og velg en målestasjon fra listen til venstre for å se data</p>
              </div>
            )}

            {selectedStation && !stationData && loading && (
              <div className="bg-white rounded-xl shadow-md p-16 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg font-medium">Henter data...</p>
              </div>
            )}

            {stationData && (
              <>
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 border-b border-blue-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-1">{stationData.stationName}</h2>
                        <p className="text-gray-600 font-mono text-sm">ID: {stationData.stationId}</p>
                        <p className="text-sm text-gray-600 mt-2 bg-white px-3 py-1 rounded-full inline-block">
                          {stationData.parameter}
                        </p>
                      </div>
                      <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl font-semibold"
                      >
                        <Download className="w-4 h-4" />
                        Last ned CSV
                      </button>
                    </div>
                  </div>

                  {stats && (
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200">
                          <div className="text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wide">Målinger</div>
                          <div className="text-2xl font-bold text-blue-700">{stats.count}</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200">
                          <div className="text-xs font-semibold text-green-600 mb-1 uppercase tracking-wide">Minimum</div>
                          <div className="text-2xl font-bold text-green-700">{stats.min.toFixed(2)}</div>
                          <div className="text-xs text-green-600 mt-1">{stationData.unit}</div>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border-2 border-red-200">
                          <div className="text-xs font-semibold text-red-600 mb-1 uppercase tracking-wide">Maksimum</div>
                          <div className="text-2xl font-bold text-red-700">{stats.max.toFixed(2)}</div>
                          <div className="text-xs text-red-600 mt-1">{stationData.unit}</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-200">
                          <div className="text-xs font-semibold text-purple-600 mb-1 uppercase tracking-wide">Gjennomsnitt</div>
                          <div className="text-2xl font-bold text-purple-700">{stats.avg.toFixed(2)}</div>
                          <div className="text-xs text-purple-600 mt-1">{stationData.unit}</div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                        <div className="h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis 
                                dataKey="time" 
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                              />
                              <YAxis 
                                label={{ value: stationData.unit, angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '2px solid #3b82f6',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                dot={false}
                                name={stationData.parameter}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                    <h3 className="font-bold text-lg text-gray-800">Rådata</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 sticky top-0 border-b-2 border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tidspunkt</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Verdi ({stationData.unit})</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {stationData.observations.map((obs, idx) => (
                            <tr key={idx} className="hover:bg-blue-50 transition-colors">
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                                {new Date(obs.time).toLocaleString('no-NO')}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-mono font-semibold text-gray-800">
                                {obs.value?.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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