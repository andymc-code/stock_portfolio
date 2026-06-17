import React, { useState, useEffect } from 'react';
import { LoadingIcon } from './icons';

interface NewsArticle {
  id: string;
  title: string;
  author: string;
  published_utc: string;
  article_url: string;
  image_url?: string;
  description?: string;
  publisher: {
    name: string;
    logo_url?: string;
  };
  tickers?: string[];
}

const NewsFeed: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_POLYGON_API_KEY || '';

  useEffect(() => {
    if (!apiKey) {
      setError('VITE_POLYGON_API_KEY is not configured.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `https://api.polygon.io/v2/reference/news?limit=6&apiKey=${apiKey}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load news: Status ${response.status}`);
        }

        const data = await response.json();
        if (!cancelled) {
          setArticles(data.results || []);
        }
      } catch (err: any) {
        console.error('Error fetching market news:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to load news articles.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNews();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const formatTimeAgo = (utcStr: string): string => {
    try {
      const pubDate = new Date(utcStr);
      const diffMs = Date.now() - pubDate.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHrs < 1) {
        const mins = Math.floor(diffMs / (1000 * 60));
        return `${mins}m ago`;
      }
      if (diffHrs < 24) {
        return `${diffHrs}h ago`;
      }
      const days = Math.floor(diffHrs / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="card w-full flex flex-col p-4">
      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
        Market News & Sentiment
      </h3>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingIcon />
          <span className="ml-2.5 text-xs text-text-muted">Fetching latest news…</span>
        </div>
      ) : error ? (
        <div className="text-[0.68rem] text-loss text-center py-6">{error}</div>
      ) : articles.length === 0 ? (
        <div className="text-[0.68rem] text-text-muted text-center py-6">No news articles available.</div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <div key={article.id} className="flex gap-3 group pb-3.5 border-b border-pulse-border/20 last:border-0 last:pb-0">
              {/* Optional article thumbnail */}
              {article.image_url && (
                <div className="w-14 h-14 shrink-0 rounded overflow-hidden bg-pulse-bg border border-pulse-border/20">
                  <img
                    src={article.image_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[0.62rem] text-text-muted mb-1 font-mono">
                  <span className="font-semibold text-accent-primary">{article.publisher.name}</span>
                  <span>·</span>
                  <span>{formatTimeAgo(article.published_utc)}</span>
                </div>
                
                <a
                  href={article.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[0.72rem] font-bold text-text-primary leading-snug group-hover:text-accent-primary transition-colors hover:underline line-clamp-2"
                >
                  {article.title}
                </a>

                {/* Referenced tickers tags */}
                {article.tickers && article.tickers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {article.tickers.slice(0, 3).map((t) => (
                      <span key={t} className="text-[0.55rem] font-mono px-1.5 py-0.5 rounded bg-pulse-bg border border-pulse-border/30 text-text-secondary">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
