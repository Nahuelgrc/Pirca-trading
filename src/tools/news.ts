export const getLatestCryptoNews = async (): Promise<string[]> => {
  try {
    // Bypass standard APIs with strict keys. We use CoinTelegraph's public RSS tree. 100% free.
    const url = "https://cointelegraph.com/rss";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" // Avoid RSS anti-bot blocks
      }
    });

    if (!response.ok) return [];
    const xml = await response.text();
    
    // Simple manual extraction of titles from the XML using Native Node Regex
    const titles: string[] = [];
    const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gi;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null && titles.length < 5) {
      // Clean up basic HTML entities if they exist
      const cleanTitle = match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      titles.push(`${cleanTitle} (Source: CoinTelegraph)`);
    }

    return titles;
  } catch (error) {
    console.error("❌ Error fetching crypto news:", error);
    return [];
  }
}
