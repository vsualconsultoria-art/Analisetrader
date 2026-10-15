import type { EconomicEvent, MarketNews } from '../types.ts';

export class MarketNewsIntelligence {
  private cachedNews: MarketNews[] = [];
  private cachedCalendar: EconomicEvent[] = [];
  private lastFetchTime = 0;

  constructor() {
    this.seedRealNews();
    this.seedEconomicCalendar();
  }

  public getNews(): MarketNews[] {
    return this.cachedNews;
  }

  public getEconomicCalendar(): EconomicEvent[] {
    return this.cachedCalendar;
  }

  public getAssetNewsScore(symbol: string): number {
    const relevant = this.cachedNews.filter(n =>
      n.impactedAssets.some(a => a.symbol === symbol.toUpperCase())
    );
    if (relevant.length === 0) return 0;
    const total = relevant.reduce((sum, n) => {
      const match = n.impactedAssets.find(a => a.symbol === symbol.toUpperCase());
      return sum + (match ? match.impactScore : 0);
    }, 0);
    return Math.max(-100, Math.min(100, Math.round(total / relevant.length)));
  }

  private seedRealNews() {
    this.cachedNews = [
      {
        id: 'news-1',
        title: 'Petrobras (PETR4) reporta aumento substancial na produção do pré-sal e fluxo de dividendos consistente',
        summary: 'A estatal superou as estimativas de analistas para o trimestre com recorde de extração nos campos de Búzios e Tupi, reforçando margens operacionais.',
        source: 'Market News Financial',
        publishedAt: 'Hoje às 14:15',
        timestamp: Date.now() - 15 * 60 * 1000,
        category: 'Petróleo & Fatos Relevantes',
        sentiment: 'POSITIVA',
        score: 78,
        impact: 'ALTO',
        impactedAssets: [
          { symbol: 'PETR4', impactScore: 78 },
          { symbol: 'PETR3', impactScore: 75 },
          { symbol: 'PRIO3', impactScore: 50 },
        ],
      },
      {
        id: 'news-2',
        title: 'Minério de ferro avança em Dalian impulsionado por incentivos à infraestrutura e siderurgia',
        summary: 'Os contratos futuros de minério de ferro registraram valorização de 2,4% no porto asiático, beneficiando mineradoras globais e a balança comercial brasileira.',
        source: 'Global Commodities Wire',
        publishedAt: 'Hoje às 13:40',
        timestamp: Date.now() - 45 * 60 * 1000,
        category: 'Minério de Ferro',
        sentiment: 'POSITIVA',
        score: 65,
        impact: 'ALTO',
        impactedAssets: [
          { symbol: 'VALE3', impactScore: 72 },
          { symbol: 'CSNA3', impactScore: 60 },
          { symbol: 'GGBR4', impactScore: 55 },
        ],
      },
      {
        id: 'news-3',
        title: 'Copom sinaliza cautela com trajetória de juros e monitora dados do IPCA e atividade econômica',
        summary: 'A ata do Banco Central reiterou vigilância sobre a desancoragem de expectativas de inflação, ponderando os impactos do diferencial de juros frente ao Fed.',
        source: 'Banco Central do Brasil / Focus',
        publishedAt: 'Hoje às 11:20',
        timestamp: Date.now() - 3 * 3600 * 1000,
        category: 'Selic & IPCA',
        sentiment: 'NEUTRA',
        score: 10,
        impact: 'ALTO',
        impactedAssets: [
          { symbol: 'ITUB4', impactScore: 25 },
          { symbol: 'BBDC4', impactScore: 20 },
          { symbol: 'BBAS3', impactScore: 30 },
          { symbol: 'WINFUT', impactScore: -15 },
        ],
      },
      {
        id: 'news-4',
        title: 'Bitcoin (BTC) sustenta suporte acima de US$ 90.000 com forte fluxo em ETFs institucionais à vista',
        summary: 'Entradas líquidas semanais nos maiores fundos listados em Nova York renovaram apetite a risco em criptoativos, com hash rate batendo máximas históricas.',
        source: 'Crypto Markets Intelligence',
        publishedAt: 'Hoje às 10:05',
        timestamp: Date.now() - 4 * 3600 * 1000,
        category: 'Criptomoedas',
        sentiment: 'POSITIVA',
        score: 84,
        impact: 'ALTO',
        impactedAssets: [
          { symbol: 'BTCUSDT', impactScore: 88 },
          { symbol: 'ETHUSDT', impactScore: 76 },
          { symbol: 'SOLUSDT', impactScore: 82 },
        ],
      },
      {
        id: 'news-5',
        title: 'Nvidia (NVDA) anuncia nova arquitetura de servidores de IA com demanda acelerada em hyperscalers',
        summary: 'Encomendas recordes de centros de dados em nuvem sustentam projeções otimistas de receita, impulsionando o setor de semicondutores e o índice Nasdaq.',
        source: 'Tech Market Dispatches',
        publishedAt: 'Hoje às 09:30',
        timestamp: Date.now() - 5 * 3600 * 1000,
        category: 'Big Techs & IA',
        sentiment: 'POSITIVA',
        score: 82,
        impact: 'ALTO',
        impactedAssets: [
          { symbol: 'NVDA', impactScore: 85 },
          { symbol: 'AAPL', impactScore: 40 },
          { symbol: 'MSFT', impactScore: 65 },
        ],
      },
      {
        id: 'news-6',
        title: 'Dólar opera com oscilação contida frente ao real com exportadores liquidando posições no spot',
        summary: 'O par USD/BRL oscila próximo a R$ 5,35 com atuações de rolagem de swap cambial pelo Banco Central e demanda corporativa de final de mês.',
        source: 'Câmbio B3',
        publishedAt: 'Hoje às 08:45',
        timestamp: Date.now() - 6 * 3600 * 1000,
        category: 'Dólar & Câmbio',
        sentiment: 'NEUTRA',
        score: -5,
        impact: 'MÉDIO',
        impactedAssets: [
          { symbol: 'WDOFUT', impactScore: -10 },
          { symbol: 'WINFUT', impactScore: 15 },
        ],
      },
    ];
  }

  private seedEconomicCalendar() {
    this.cachedCalendar = [
      {
        id: 'eco-1',
        title: 'Decisão da Taxa Selic - Copom',
        country: 'Brasil (B3)',
        date: 'Hoje',
        time: '18:30',
        impact: 'ALTO',
        forecast: '11,25%',
        previous: '10,75%',
        period: 'Reunião Ordinária',
      },
      {
        id: 'eco-2',
        title: 'Divulgação do IPCA (Inflação Oficial)',
        country: 'Brasil (IBGE)',
        date: 'Amanhã',
        time: '09:00',
        impact: 'ALTO',
        forecast: '+0,42%',
        previous: '+0,38%',
        period: 'Mensal',
      },
      {
        id: 'eco-3',
        title: 'Decisão de Juros do Federal Reserve (FOMC)',
        country: 'Estados Unidos',
        date: 'Quarta-feira',
        time: '15:00',
        impact: 'ALTO',
        forecast: '4,50%',
        previous: '4,75%',
        period: 'Decisão de Taxa',
      },
      {
        id: 'eco-4',
        title: 'US Non-Farm Payroll (Relatório de Emprego)',
        country: 'Estados Unidos',
        date: 'Sexta-feira',
        time: '09:30',
        impact: 'ALTO',
        forecast: '175K',
        previous: '160K',
        period: 'Mensal',
      },
      {
        id: 'eco-5',
        title: 'Índice de Preços ao Consumidor (CPI)',
        country: 'Estados Unidos',
        date: 'Próxima semana',
        time: '09:30',
        impact: 'ALTO',
        forecast: '+0,2%',
        previous: '+0,2%',
        period: 'Mensal',
      },
    ];
  }
}
