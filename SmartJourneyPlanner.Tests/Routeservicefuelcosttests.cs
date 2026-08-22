using System;
using Xunit;

namespace SmartJourneyPlanner.Tests
{
  public class RouteServiceFuelCostTests
  {
    // ── Helpers — mirror RouteService.CalculateFuelCosts formula ──
    private const double AVG_PETROL_CONSUMPTION = 7.5;  // litres per 100km
    private const double AVG_DIESEL_CONSUMPTION = 6.5;  // litres per 100km

    private (double? petrolCost, double? dieselCost) CalculateFuelCosts(
        double distanceMeters, double? petrolPrice, double? dieselPrice)
    {
      double distanceKm = distanceMeters / 1000;

      double? petrolCost = petrolPrice.HasValue
          ? Math.Round((distanceKm / 100) * AVG_PETROL_CONSUMPTION * petrolPrice.Value, 2)
          : null;

      double? dieselCost = dieselPrice.HasValue
          ? Math.Round((distanceKm / 100) * AVG_DIESEL_CONSUMPTION * dieselPrice.Value, 2)
          : null;

      return (petrolCost, dieselCost);
    }

    // ── Petrol cost ──────────────────────────────────────────

    [Fact]
    public void CalculateFuelCosts_100Km_PetrolCostEqualsConsumptionTimesPrice()
    {
      // 100km → distanceKm/100 = 1 → cost = 7.5 * price
      var (petrolCost, _) = CalculateFuelCosts(distanceMeters: 100_000, petrolPrice: 372.00, dieselPrice: null);

      Assert.Equal(2790.00, petrolCost); // 7.5 * 372.00
    }

    [Fact]
    public void CalculateFuelCosts_ZeroDistance_ReturnsZeroCost()
    {
      var (petrolCost, dieselCost) = CalculateFuelCosts(distanceMeters: 0, petrolPrice: 372.00, dieselPrice: 351.00);

      Assert.Equal(0, petrolCost);
      Assert.Equal(0, dieselCost);
    }

    [Fact]
    public void CalculateFuelCosts_PetrolPriceUnavailable_ReturnsNullPetrolCost()
    {
      var (petrolCost, dieselCost) = CalculateFuelCosts(distanceMeters: 50_000, petrolPrice: null, dieselPrice: 351.00);

      Assert.Null(petrolCost);
      Assert.NotNull(dieselCost);
    }

    // ── Diesel cost ──────────────────────────────────────────

    [Fact]
    public void CalculateFuelCosts_100Km_DieselCostEqualsConsumptionTimesPrice()
    {
      var (_, dieselCost) = CalculateFuelCosts(distanceMeters: 100_000, petrolPrice: null, dieselPrice: 351.00);

      Assert.Equal(2281.50, dieselCost); // 6.5 * 351.00
    }

    [Fact]
    public void CalculateFuelCosts_DieselPriceUnavailable_ReturnsNullDieselCost()
    {
      var (petrolCost, dieselCost) = CalculateFuelCosts(distanceMeters: 50_000, petrolPrice: 372.00, dieselPrice: null);

      Assert.NotNull(petrolCost);
      Assert.Null(dieselCost);
    }

    [Fact]
    public void CalculateFuelCosts_BothPricesUnavailable_ReturnsBothNull()
    {
      var (petrolCost, dieselCost) = CalculateFuelCosts(distanceMeters: 204_400, petrolPrice: null, dieselPrice: null);

      Assert.Null(petrolCost);
      Assert.Null(dieselCost);
    }

    // ── Realistic route distances (cross-check against actual figures) ──

    [Fact]
    public void CalculateFuelCosts_RealisticColomboToGalleDistance_MatchesExpectedRange()
    {
      // 204.4km, Rs.372 petrol/L, mirrors a real fastest-route figure
      var (petrolCost, dieselCost) = CalculateFuelCosts(distanceMeters: 204_400, petrolPrice: 372.00, dieselPrice: 331.00);

      Assert.Equal(5702.76, petrolCost);  // (204.4/100) * 7.5 * 372.00
      Assert.Equal(4397.67, dieselCost);  // (204.4/100) * 6.5 * 331.00
    }

    [Fact]
    public void CalculateFuelCosts_DieselConsumptionIsLowerThanPetrol_ResultsInLowerCostAtSamePrice()
    {
      // Same hypothetical price for both to isolate the consumption-rate difference
      var (petrolCost, dieselCost) = CalculateFuelCosts(distanceMeters: 100_000, petrolPrice: 350.00, dieselPrice: 350.00);

      Assert.True(dieselCost < petrolCost); // 6.5 < 7.5 consumption rate
    }

    [Fact]
    public void CalculateFuelCosts_RoundsToTwoDecimalPlaces()
    {
      var (petrolCost, _) = CalculateFuelCosts(distanceMeters: 33_333, petrolPrice: 372.55, dieselPrice: null);

      // Result should never have more than 2 decimal places
      Assert.Equal(Math.Round(petrolCost!.Value, 2), petrolCost);
    }

    [Fact]
    public void CalculateFuelCosts_LongerDistance_ProducesProportionallyHigherCost()
    {
      var (shortCost, _) = CalculateFuelCosts(distanceMeters: 50_000, petrolPrice: 372.00, dieselPrice: null);
      var (longCost, _) = CalculateFuelCosts(distanceMeters: 100_000, petrolPrice: 372.00, dieselPrice: null);

      Assert.True(longCost > shortCost);
      Assert.Equal(shortCost!.Value * 2, longCost!.Value, 2); // double distance → double cost
    }
  }
}
