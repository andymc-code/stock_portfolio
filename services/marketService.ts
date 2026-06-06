export interface MarketMover {
  ticker: string;
  price: number;
  changeUSD: number;
  changePercent: number;
  volume: number;
}

export interface MarketMoversData {
  topGainers: MarketMover[];
  topLosers: MarketMover[];
  mostActive: MarketMover[];
}

const apiKey = import.meta.env.VITE_ALPHAVANTAGE_API_KEY || 'demo';

export const fetchMarketMovers = async (): Promise<MarketMoversData> => {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${apiKey}`
    );
    if (!response.ok) {
      throw new Error(`Alpha Vantage returned status ${response.status}`);
    }
    const data = await response.json();
    
    // Check if we hit the API limit or got an info message
    if (data.Information || data.Note || !data.top_gainers) {
      console.warn("Alpha Vantage note/limit, falling back to simulated movers data:", data.Information || data.Note || "No data");
      return fetchMarketMoversFallback();
    }

    const parseMoversList = (list: any[]): MarketMover[] => {
      if (!list) return [];
      return list.map(item => ({
        ticker: item.ticker.toUpperCase(),
        price: parseFloat(item.price) || 0,
        changeUSD: parseFloat(item.change_amount) || 0,
        changePercent: parseFloat(item.change_percentage.replace('%', '')) || 0,
        volume: parseInt(item.volume) || 0,
      }));
    };

    return {
      topGainers: parseMoversList(data.top_gainers),
      topLosers: parseMoversList(data.top_losers),
      mostActive: parseMoversList(data.most_actively_traded),
    };
  } catch (error) {
    console.warn("Error fetching Alpha Vantage data, using fallback:", error);
    return fetchMarketMoversFallback();
  }
};

const fetchMarketMoversFallback = (): MarketMoversData => {
  const generateList = (type: 'gainer' | 'loser' | 'active'): MarketMover[] => {
    const tickers = {
      gainer: ['RMSG', 'BGMS', 'STI', 'BESS', 'BBCP', 'MASK', 'MRLN', 'MCRB', 'ETHD', 'TTAN'],
      loser: ['ZCMD', 'LHSW', 'KOLD', 'UVXY', 'SQQQ', 'SARK', 'SOXS', 'YINN', 'BOIL', 'FAZ'],
      active: ['SMTK', 'RMSG', 'SOXS', 'TSLA', 'AAPL', 'NVDA', 'AMD', 'PLTR', 'F', 'NIO']
    }[type];

    return tickers.map((ticker) => {
      const price = parseFloat((Math.random() * 90 + 5).toFixed(2));
      let changePercent = Math.random() * 25 + 5;
      if (type === 'loser') changePercent = -changePercent;
      const changeUSD = parseFloat((price * (changePercent / 100)).toFixed(2));
      const volume = Math.floor(Math.random() * 80000000) + 10000000;

      return {
        ticker,
        price,
        changeUSD,
        changePercent,
        volume,
      };
    });
  };

  return {
    topGainers: generateList('gainer'),
    topLosers: generateList('loser'),
    mostActive: generateList('active'),
  };
};
