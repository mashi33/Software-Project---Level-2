using System.Text.RegularExpressions;

namespace SmartJourneyPlanner.Services
{
    public class FuelPriceService
    {
        private readonly IHttpClientFactory _httpClientFactory;

        // Cache — null means no successful scrape yet
        private static double? _cachedPetrolPrice = null;
        private static double? _cachedDieselPrice = null;
        private static DateTime _lastFetched = DateTime.MinValue;
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

        public FuelPriceService(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        /// <summary>
        /// Returns (petrolPrice, dieselPrice) scraped from ceypetco.gov.lk.
        /// Either value can be null if scraping failed and no valid cache exists.
        /// Results are cached for 24 hours to avoid hitting the site on every request.
        /// </summary>
        public async Task<(double? petrol, double? diesel)> GetFuelPricesAsync()
        {
            // Valid cache exists for both — return immediately without scraping
            if (_cachedPetrolPrice.HasValue && _cachedDieselPrice.HasValue
                && DateTime.UtcNow - _lastFetched < CacheDuration)
            {
                Console.WriteLine($"✅ Returning cached fuel prices — Petrol: Rs.{_cachedPetrolPrice}, Diesel: Rs.{_cachedDieselPrice}");
                return (_cachedPetrolPrice, _cachedDieselPrice);
            }

            try
            {
                Console.WriteLine("🔍 Fetching fuel prices from ceypetco.gov.lk...");

                var client = _httpClientFactory.CreateClient();
                var html = await client.GetStringAsync("https://ceypetco.gov.lk/marketing-sales/");

                // TEMP DEBUG
                Console.WriteLine("=== HTML START ===");
                Console.WriteLine(html.Substring(0, Math.Min(3000, html.Length)));
                Console.WriteLine("=== HTML END ===");

                Console.WriteLine($"✅ Page fetched successfully — HTML length: {html.Length} chars");

                // ✅ Fixed regex — [\s\S]*? matches across newlines
                // CPC page structure:
                //   ### Lanka Petrol 92 Octane
                //   White Oil
                //   Rs. 434.00 per Ltr
                // .*? with Singleline misses \r\n combinations — [\s\S]*? is reliable

                // Petrol 92 Octane
                var petrolMatch = Regex.Match(html,
                    @"Lanka Petrol 92 Octane[\s\S]*?class=""price-value""[\s\S]*?Rs\.</span>\s*([\d.]+)",
                    RegexOptions.None);

                if (petrolMatch.Success
                    && double.TryParse(petrolMatch.Groups[1].Value.Replace(",", ""),
                       System.Globalization.NumberStyles.Any,
                       System.Globalization.CultureInfo.InvariantCulture,
                       out double petrolPrice))
                {
                    _cachedPetrolPrice = petrolPrice;
                    Console.WriteLine($"✅ Petrol price scraped: Rs. {petrolPrice}");
                }
                else
                {
                    Console.WriteLine("⚠️ Petrol regex no match — page structure may have changed.");
                    Console.WriteLine($"   Raw snippet: {html.Substring(html.IndexOf("Lanka Petrol", StringComparison.OrdinalIgnoreCase) >= 0 ? html.IndexOf("Lanka Petrol", StringComparison.OrdinalIgnoreCase) : 0, Math.Min(200, html.Length))}");
                }

                // Lanka Auto Diesel
                var dieselMatch = Regex.Match(html,
                    @"Lanka Auto Diesel[\s\S]*?class=""price-value""[\s\S]*?Rs\.</span>\s*([\d.]+)",
                    RegexOptions.None);

                if (dieselMatch.Success
                    && double.TryParse(dieselMatch.Groups[1].Value.Replace(",", ""),
                       System.Globalization.NumberStyles.Any,
                       System.Globalization.CultureInfo.InvariantCulture,
                       out double dieselPrice))
                {
                    _cachedDieselPrice = dieselPrice;
                    Console.WriteLine($"✅ Diesel price scraped: Rs. {dieselPrice}");
                }
                else
                {
                    Console.WriteLine("⚠️ Diesel regex no match — page structure may have changed.");
                }

                // At least one price scraped successfully — update timestamp
                if (petrolMatch.Success || dieselMatch.Success)
                {
                    _lastFetched = DateTime.UtcNow;
                    Console.WriteLine($"✅ Cache updated at {_lastFetched:yyyy-MM-dd HH:mm:ss} UTC");
                }
                else
                {
                    Console.WriteLine("❌ Both regex patterns failed — returning null prices.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Fuel price scrape failed: {ex.Message}");
            }

            // Return whatever is in cache — could be null if both scraping failed
            // and no prior successful scrape exists
            return (_cachedPetrolPrice, _cachedDieselPrice);
        }
    }
}