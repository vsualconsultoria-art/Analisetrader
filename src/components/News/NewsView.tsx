import React, { useState } from 'react';
import { MarketNews } from '../../types/market.js';
import { Newspaper, TrendingUp, TrendingDown, Minus, ExternalLink, Zap } from 'lucide-react';

interface NewsViewProps {
  news: MarketNews[];
  onSelectSymbol: (symbol: string) => void;
}

export const NewsView: React.FC<NewsViewProps> = ({
  news,
  onSelectSymbol,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Petróleo & Fatos Relevantes', 'Minério de Ferro', 'Selic & IPCA', 'Criptomoedas', 'Big Techs & IA', 'Dólar & Câmbio'];

  const filtered = news.filter((n) => {
    if (selectedCategory === 'all') return true;
    return n.category === selectedCategory;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1f293d] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-sky-400" />
            Market News Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Inteligência de sentimento financeiro, categorização macroeconômica e impacto setorial direto.
          </p>
        </div>

        <span className="font-mono text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded border border-slate-800">
          Notícias ativas: <strong className="text-white">{news.length}</strong>
        </span>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors border ${
              selectedCategory === cat
                ? 'bg-sky-600 text-white border-sky-500 font-semibold'
                : 'bg-[#0c111c] text-slate-400 border-[#1f293d] hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            {cat === 'all' ? 'Todas as Categorias' : cat}
          </button>
        ))}
      </div>

      {/* News Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const isPos = item.sentiment === 'POSITIVA';
          const isNeg = item.sentiment === 'NEGATIVA';

          return (
            <div
              key={item.id}
              className="rounded-lg border border-[#1f293d] bg-[#0c111c] p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {item.category}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 font-mono font-bold text-xs ${
                      isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {isPos ? <TrendingUp className="h-3.5 w-3.5" /> : isNeg ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    {item.sentiment} ({item.score > 0 ? '+' : ''}{item.score})
                  </span>
                </div>

                <h3 className="font-semibold text-slate-100 text-sm mb-2 leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {item.summary}
                </p>
              </div>

              <div>
                {/* Impacted Assets List */}
                <div className="border-t border-[#1a2334] pt-3 mb-2">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-1.5">
                    Impacto nos Ativos:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.impactedAssets.map((asset) => (
                      <button
                        key={asset.symbol}
                        onClick={() => onSelectSymbol(asset.symbol)}
                        className={`inline-flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded border transition-colors ${
                          asset.impactScore >= 50
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:border-emerald-500'
                            : asset.impactScore <= -30
                            ? 'bg-rose-950/40 text-rose-400 border-rose-800/40 hover:border-rose-500'
                            : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <span>{asset.symbol}</span>
                        <span>({asset.impactScore > 0 ? '+' : ''}{asset.impactScore})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-[#172033]">
                  <span>Fonte: {item.source}</span>
                  <span>{item.publishedAt}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
