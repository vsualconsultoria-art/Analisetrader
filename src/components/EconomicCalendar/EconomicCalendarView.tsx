import React from 'react';
import { EconomicEvent } from '../../types/market.js';
import { Calendar, AlertCircle } from 'lucide-react';

interface EconomicCalendarViewProps {
  events: EconomicEvent[];
}

export const EconomicCalendarView: React.FC<EconomicCalendarViewProps> = ({ events }) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1f293d] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            Calendário Econômico & Macro
          </h2>
          <p className="text-xs text-slate-400">
            Eventos de alto impacto com potencial de causar volatilidade extrema nos índices e derivativos B3.
          </p>
        </div>

        <span className="font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">
          Eventos mapeados: <strong className="text-indigo-400">{events.length}</strong>
        </span>
      </div>

      {/* Events Table */}
      <div className="rounded-lg border border-[#1f293d] bg-[#0c111c] overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#090d15] text-slate-400 border-b border-[#1f293d] uppercase text-[10px]">
            <tr>
              <th className="px-4 py-3">Data / Hora</th>
              <th className="px-4 py-3">País / Origem</th>
              <th className="px-4 py-3">Evento Macroeconômico</th>
              <th className="px-4 py-3">Impacto</th>
              <th className="px-4 py-3">Projeção</th>
              <th className="px-4 py-3">Anterior</th>
              <th className="px-4 py-3">Período</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#172033] text-slate-200">
            {events.map((ev) => (
              <tr key={ev.id} className="hover:bg-[#111827] transition-colors">
                <td className="px-4 py-3 text-slate-300 font-semibold whitespace-nowrap">
                  {ev.date} · {ev.time}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {ev.country}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-100">
                  {ev.title}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded ${
                      ev.impact === 'ALTO'
                        ? 'bg-rose-950/50 text-rose-400 border border-rose-800/40'
                        : 'bg-amber-950/50 text-amber-400 border border-amber-800/40'
                    }`}
                  >
                    <AlertCircle className="h-3 w-3" />
                    {ev.impact}
                  </span>
                </td>
                <td className="px-4 py-3 text-emerald-400 font-bold">
                  {ev.forecast}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {ev.previous}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {ev.period}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
