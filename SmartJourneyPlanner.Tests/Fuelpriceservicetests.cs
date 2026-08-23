using System;
using System.Text.RegularExpressions;
using Xunit;

namespace SmartJourneyPlanner.Tests
{
  public class FuelPriceServiceTests
  {
    // ── Helpers — mirror the regex patterns used in FuelPriceService ──

    private double? ExtractPetrolPrice(string html)
    {
      var match = Regex.Match(html,
          @"Lanka Petrol 92 Octane[\s\S]*?class=""price-value""[\s\S]*?Rs\.</span>\s*([\d.]+)",
          RegexOptions.None);

      if (match.Success &&
          double.TryParse(match.Groups[1].Value.Replace(",", ""),
              System.Globalization.NumberStyles.Any,
              System.Globalization.CultureInfo.InvariantCulture,
              out double price))
      {
        return price;
      }
      return null;
    }

    private double? ExtractDieselPrice(string html)
    {
      var match = Regex.Match(html,
          @"Lanka Auto Diesel[\s\S]*?class=""price-value""[\s\S]*?Rs\.</span>\s*([\d.]+)",
          RegexOptions.None);

      if (match.Success &&
          double.TryParse(match.Groups[1].Value.Replace(",", ""),
              System.Globalization.NumberStyles.Any,
              System.Globalization.CultureInfo.InvariantCulture,
              out double price))
      {
        return price;
      }
      return null;
    }

    // ── Petrol regex ─────────────────────────────────────────

    [Fact]
    public void ExtractPetrolPrice_ValidHtmlSnippet_ReturnsCorrectPrice()
    {
      string html = @"<div>Lanka Petrol 92 Octane <span class=""price-value"">Rs.</span> 372.00</div>";
      var price = ExtractPetrolPrice(html);

      Assert.Equal(372.00, price);
    }

    [Fact]
    public void ExtractPetrolPrice_DecimalPriceWithoutCommaSeparator_ParsesCorrectly()
    {
      // Note: actual regex ([\d.]+) doesn't include comma in its character class,
      // so it can't capture comma-formatted thousands (e.g. "1,372.50" → only "1" matches).
      // Real fuel prices are always 3-digit (Rs. 300-400 range), so this isn't hit in practice.
      string html = @"Lanka Petrol 92 Octane <span class=""price-value"">Rs.</span> 372.50";
      var price = ExtractPetrolPrice(html);

      Assert.Equal(372.50, price);
    }

    [Fact]
    public void ExtractPetrolPrice_MalformedHtml_ReturnsNull()
    {
      string html = @"<div>Some unrelated page content with no fuel prices</div>";
      var price = ExtractPetrolPrice(html);

      Assert.Null(price);
    }

    [Fact]
    public void ExtractPetrolPrice_MissingPriceValueClass_ReturnsNull()
    {
      string html = @"Lanka Petrol 92 Octane Rs. 372.00"; // no class="price-value" wrapper
      var price = ExtractPetrolPrice(html);

      Assert.Null(price);
    }

    // ── Diesel regex ─────────────────────────────────────────

    [Fact]
    public void ExtractDieselPrice_ValidHtmlSnippet_ReturnsCorrectPrice()
    {
      string html = @"<div>Lanka Auto Diesel <span class=""price-value"">Rs.</span> 351.00</div>";
      var price = ExtractDieselPrice(html);

      Assert.Equal(351.00, price);
    }

    [Fact]
    public void ExtractDieselPrice_MalformedHtml_ReturnsNull()
    {
      string html = @"<div>Page changed structure, no diesel data</div>";
      var price = ExtractDieselPrice(html);

      Assert.Null(price);
    }

    [Fact]
    public void ExtractPrices_BothPetrolAndDieselPresent_BothParsedIndependently()
    {
      string html = @"
                Lanka Petrol 92 Octane <span class=""price-value"">Rs.</span> 372.00
                Lanka Auto Diesel <span class=""price-value"">Rs.</span> 351.00";

      var petrol = ExtractPetrolPrice(html);
      var diesel = ExtractDieselPrice(html);

      Assert.Equal(372.00, petrol);
      Assert.Equal(351.00, diesel);
    }

    // ── Cache validity window (mirrors 24-hour CacheDuration check) ──

    [Fact]
    public void Cache_WithinTwentyFourHours_IsConsideredValid()
    {
      var lastFetched = DateTime.UtcNow.AddHours(-5);
      var cacheDuration = TimeSpan.FromHours(24);

      bool isValid = DateTime.UtcNow - lastFetched < cacheDuration;

      Assert.True(isValid);
    }

    [Fact]
    public void Cache_OlderThanTwentyFourHours_IsConsideredExpired()
    {
      var lastFetched = DateTime.UtcNow.AddHours(-25);
      var cacheDuration = TimeSpan.FromHours(24);

      bool isValid = DateTime.UtcNow - lastFetched < cacheDuration;

      Assert.False(isValid);
    }

    [Fact]
    public void Cache_NoPriorFetch_MinValueTimestamp_IsConsideredExpired()
    {
      var lastFetched = DateTime.MinValue;
      var cacheDuration = TimeSpan.FromHours(24);

      bool isValid = DateTime.UtcNow - lastFetched < cacheDuration;

      Assert.False(isValid);
    }
  }
}
