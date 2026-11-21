import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Plus, Trash2, Info } from 'lucide-react';
import {
  ALTERNATIVE_TRANSPORT_MODES,
  BASELINE_TRANSPORT_MODES,
  QUICK_SUSTAINABLE_ACTIONS,
} from '../data/constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { LanguageCode, SustainabilityLogEntry } from '../types/freshair';
import { getLocalDateIso } from '../utils/aqi';
import { calculateTripSavingsKg } from '../utils/calculations';

interface SustainabilityViewProps {
  language: LanguageCode;
  defaultCommuteKm: number;
}

function formatDayShort(dateISO: string): string {
  const parsed = new Date(`${dateISO}T12:00:00`);
  return parsed.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

export const SustainabilityView: React.FC<SustainabilityViewProps> = ({
  language,
  defaultCommuteKm,
}) => {
  const [logs, setLogs] = useLocalStorage<SustainabilityLogEntry[]>(
    'freshair_sustainability_logs_v1',
    [],
  );

  // Commute calculator state
  const [distanceKm, setDistanceKm] = useState<number>(Math.max(1, defaultCommuteKm || 12));
  const [baselineId, setBaselineId] = useState<string>('petrol_car');
  const [alternativeId, setAlternativeId] = useState<string>('metro_rail');
  const [logDate, setLogDate] = useState<string>(getLocalDateIso(0));

  useEffect(() => {
    if (defaultCommuteKm > 0) {
      setDistanceKm(defaultCommuteKm);
    }
  }, [defaultCommuteKm]);

  const baselineMode =
    BASELINE_TRANSPORT_MODES.find((m) => m.id === baselineId) ?? BASELINE_TRANSPORT_MODES[0];
  const alternativeMode =
    ALTERNATIVE_TRANSPORT_MODES.find((m) => m.id === alternativeId) ?? ALTERNATIVE_TRANSPORT_MODES[0];

  const estimatedTripSavingsKg = useMemo(() => {
    return calculateTripSavingsKg(
      distanceKm,
      baselineMode.gramsCo2PerKm,
      alternativeMode.gramsCo2PerKm,
    );
  }, [distanceKm, baselineMode.gramsCo2PerKm, alternativeMode.gramsCo2PerKm]);

  const weeklyChartData = useMemo(() => {
    const days: Array<{ dateISO: string; label: string; co2Kg: number; actionsCount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const dateISO = getLocalDateIso(i);
      const dayLogs = logs.filter((entry) => entry.dateISO === dateISO);
      const sum = dayLogs.reduce((acc, item) => acc + item.co2SavedKg, 0);
      days.push({
        dateISO,
        label: formatDayShort(dateISO),
        co2Kg: Number(sum.toFixed(2)),
        actionsCount: dayLogs.length,
      });
    }
    return days;
  }, [logs]);

  const weeklyTotals = useMemo(() => {
    const totalKg = weeklyChartData.reduce((acc, d) => acc + d.co2Kg, 0);
    const totalActions = weeklyChartData.reduce((acc, d) => acc + d.actionsCount, 0);
    const activeDays = weeklyChartData.filter((d) => d.actionsCount > 0).length;
    return {
      totalKg: Number(totalKg.toFixed(2)),
      totalActions,
      activeDays,
    };
  }, [weeklyChartData]);

  const allTimeKg = useMemo(
    () => Number(logs.reduce((acc, l) => acc + l.co2SavedKg, 0).toFixed(2)),
    [logs],
  );

  const handleLogQuickAction = (action: (typeof QUICK_SUSTAINABLE_ACTIONS)[number]) => {
    const newEntry: SustainabilityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dateISO: getLocalDateIso(0),
      actionId: action.id,
      label: language === 'hi' ? action.labelHi : action.label,
      category: action.category,
      co2SavedKg: action.co2SavedKg,
      assumptionNote: action.assumptionNote,
    };
    setLogs((prev) => [newEntry, ...prev]);
  };

  const handleLogCustomCommute = (e: React.FormEvent) => {
    e.preventDefault();
    if (estimatedTripSavingsKg <= 0) return;

    const newEntry: SustainabilityLogEntry = {
      id: `commute-${Date.now()}`,
      dateISO: logDate,
      actionId: `commute-${baselineMode.id}-to-${alternativeMode.id}`,
      label: `${alternativeMode.label} instead of ${baselineMode.label} (${distanceKm} km)`,
      category: 'transport',
      co2SavedKg: estimatedTripSavingsKg,
      distanceKm,
      assumptionNote: `${distanceKm} km × (${baselineMode.gramsCo2PerKm} − ${alternativeMode.gramsCo2PerKm}) g CO2e/p-km = ${estimatedTripSavingsKg} kg CO2e avoided (estimate).`,
    };
    setLogs((prev) => [newEntry, ...prev]);
  };

  const handleDeleteLog = (id: string) => {
    setLogs((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Summary Row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <p className="text-xs font-medium text-[#526460]">Estimated 7-Day Emissions Avoided</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-[#0F766E]">
            {weeklyTotals.totalKg.toFixed(2)}{' '}
            <span className="text-sm font-normal text-[#526460]">kg CO₂e</span>
          </p>
          <p className="mt-1 text-xs text-[#647571]">Based strictly on actions logged by you</p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <p className="text-xs font-medium text-[#526460]">Logged Actions This Week</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-[#0F1F1C]">
            {weeklyTotals.totalActions}
          </p>
          <p className="mt-1 text-xs text-[#647571] font-mono tabular-nums">
            Active on {weeklyTotals.activeDays} of last 7 days
          </p>
        </div>

        <div className="bg-white border border-[#E2E8E4] rounded-xl p-5">
          <p className="text-xs font-medium text-[#526460]">Cumulative Logged Savings</p>
          <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-[#0F1F1C]">
            {allTimeKg.toFixed(2)}{' '}
            <span className="text-sm font-normal text-[#526460]">kg CO₂e</span>
          </p>
          <p className="mt-1 text-xs text-[#647571]">Estimated · Stored locally in your browser</p>
        </div>
      </section>

      {/* Weekly Progress Chart + Transport Alternative Calculator */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-[#E2E8E4] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0F1F1C]">
              Weekly Emissions Savings Progress
            </h2>
            <p className="text-xs text-[#647571] mt-0.5">
              Estimated daily kg CO₂e avoided across the last 7 days
            </p>
          </div>

          <div className="h-64 w-full mt-5">
            {weeklyTotals.totalActions > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EAEFEA" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#647571', fontFamily: 'JetBrains Mono' }}
                    stroke="#DCE3DF"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#647571', fontFamily: 'JetBrains Mono' }}
                    stroke="#DCE3DF"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#DCE3DF',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: unknown) => [
                      typeof value === 'number' ? `${value.toFixed(2)} kg CO₂e (est.)` : '0 kg',
                      'Avoided',
                    ]}
                  />
                  <Bar dataKey="co2Kg" fill="#0F766E" radius={[4, 4, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full border border-dashed border-[#DCE3DF] rounded-lg flex flex-col items-center justify-center text-center px-6">
                <p className="text-sm font-medium text-[#0F1F1C]">No actions logged in the past 7 days</p>
                <p className="text-xs text-[#647571] mt-1 max-w-sm">
                  Use the Transport Calculator or Quick Sustainable Actions below to log your first low-emission choice and watch your weekly chart build.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Transport Alternative Calculator */}
        <form
          onSubmit={handleLogCustomCommute}
          className="lg:col-span-5 bg-white border border-[#E2E8E4] rounded-xl p-6 flex flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-base font-semibold text-[#0F1F1C]">
                Transport Alternative Calculator
              </h3>
              <p className="text-xs text-[#647571] mt-0.5">
                Compare a commute shift and log estimated CO₂e savings.
              </p>
            </div>

            <label className="block text-xs font-medium text-[#445652]">
              Replaced Mode (Baseline)
              <select
                value={baselineId}
                onChange={(e) => setBaselineId(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
              >
                {BASELINE_TRANSPORT_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.gramsCo2PerKm} g/km)
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-[#445652]">
              Low-Emission Alternative Taken
              <select
                value={alternativeId}
                onChange={(e) => setAlternativeId(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
              >
                {ALTERNATIVE_TRANSPORT_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.gramsCo2PerKm} g/km)
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-[#445652]">
                Distance (km)
                <input
                  type="number"
                  min={1}
                  max={300}
                  step="0.5"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1.5 w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </label>
              <label className="block text-xs font-medium text-[#445652]">
                Date
                <input
                  type="date"
                  value={logDate}
                  max={getLocalDateIso(0)}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 text-sm font-mono bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EDF1EE] space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[#647571]">Estimated Savings</span>
              <span className="font-mono tabular-nums text-xl font-semibold text-[#0F766E]">
                {estimatedTripSavingsKg.toFixed(2)} kg CO₂e
              </span>
            </div>
            {estimatedTripSavingsKg <= 0 && (
              <p className="text-xs text-[#A16207]">
                Choose a lower-emission alternative than the baseline mode to calculate positive savings.
              </p>
            )}
            <button
              type="submit"
              disabled={estimatedTripSavingsKg <= 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-50 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Log Commute Savings
            </button>
          </div>
        </form>
      </section>

      {/* Quick Sustainable Lifestyle Actions */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-[#0F1F1C]">
          Log Daily Sustainable Actions
        </h3>
        <p className="text-xs text-[#647571] mt-0.5">
          Click any action you completed today to add its estimated CO₂e reduction to your weekly progress.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {QUICK_SUSTAINABLE_ACTIONS.map((action) => (
            <div
              key={action.id}
              className="border border-[#E6ECE9] rounded-lg p-3.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#0F1F1C]">
                  {language === 'hi' ? action.labelHi : action.label}
                </p>
                <p className="text-xs text-[#647571] mt-0.5">{action.assumptionNote}</p>
              </div>
              <button
                type="button"
                onClick={() => handleLogQuickAction(action)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0F766E] bg-[#0F766E]/8 hover:bg-[#0F766E]/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="font-mono tabular-nums">{action.co2SavedKg.toFixed(2)} kg</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Logged History */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="font-display text-base font-semibold text-[#0F1F1C]">Recent Activity Log</h3>
          <span className="font-mono tabular-nums text-xs text-[#647571]">{logs.length} entries</span>
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-[#647571] py-4">
            No sustainability entries logged yet. Every item you log above appears here with its exact calculation basis.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E2E8E4] text-xs text-[#647571]">
                  <th className="py-2.5 pr-4 font-medium">Date</th>
                  <th className="py-2.5 pr-4 font-medium">Action</th>
                  <th className="py-2.5 pr-4 font-medium">Basis</th>
                  <th className="py-2.5 pr-4 font-medium text-right">Est. Saved</th>
                  <th className="py-2.5 font-medium text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1EE]">
                {logs.slice(0, 15).map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#FAFBF9]">
                    <td className="py-3 pr-4 font-mono tabular-nums text-xs text-[#526460] whitespace-nowrap">
                      {entry.dateISO}
                    </td>
                    <td className="py-3 pr-4 text-xs sm:text-sm font-medium text-[#0F1F1C]">
                      {entry.label}
                    </td>
                    <td className="py-3 pr-4 text-xs text-[#647571] max-w-xs">{entry.assumptionNote}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums text-xs sm:text-sm font-semibold text-[#0F766E] text-right whitespace-nowrap">
                      {entry.co2SavedKg.toFixed(2)} kg
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteLog(entry.id)}
                        aria-label={`Remove ${entry.label}`}
                        className="p-1.5 text-[#647571] hover:text-[#B91C1C] rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Transparent Calculation Assumptions */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6">
        <div className="flex items-start gap-2.5 mb-4">
          <Info className="h-4 w-4 text-[#0F766E] shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-base font-semibold text-[#0F1F1C]">
              Transparent Calculation Assumptions &amp; Emission Factors
            </h3>
            <p className="text-xs text-[#647571] mt-0.5">
              All values in this tracker are standardized estimates derived from published India GHG Program (WRI India) &amp; UK DEFRA reference ranges. Actual emissions vary by vehicle age, traffic congestion, occupancy, and regional electricity grid mix (~0.72 kg CO₂e/kWh assumed for Indian urban grids).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8E4] text-[#647571]">
                <th className="py-2 pr-4 font-medium">Mode</th>
                <th className="py-2 pr-4 font-medium text-right">Factor (g CO₂e / p-km)</th>
                <th className="py-2 font-medium">Documented Assumption</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1EE] text-[#445652]">
              {[...BASELINE_TRANSPORT_MODES, ...ALTERNATIVE_TRANSPORT_MODES].map((factor) => (
                <tr key={factor.id}>
                  <td className="py-2.5 pr-4 font-medium text-[#0F1F1C] whitespace-nowrap">
                    {factor.label}
                  </td>
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-right text-[#0F1F1C]">
                    {factor.gramsCo2PerKm}
                  </td>
                  <td className="py-2.5">{factor.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
