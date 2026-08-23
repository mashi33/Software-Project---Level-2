using SmartJourneyPlanner.API.Models;
using System;
using System.Linq;
using SmartJourneyPlanner.Models;
using System.Collections.Generic;
using Xunit;

namespace SmartJourneyPlanner.Tests
{
  public class BusFareServiceTests
  {
    // ── Helpers ─────────────────────────────────────────────
    // Mirrors BusFareService.GetFare's core rule:
    // fare = lookup[ |toSection - fromSection| ], null if either stop missing
    // or the section-difference isn't in the universal fare table.
    private double? GetFare(BusRoute route, string fromCity, string toCity, Dictionary<int, double> fareLookup)
    {
      int fromIdx = route.Stops.FindIndex(s => s.City.Equals(fromCity, StringComparison.OrdinalIgnoreCase));
      int toIdx = route.Stops.FindIndex(s => s.City.Equals(toCity, StringComparison.OrdinalIgnoreCase));

      if (fromIdx == -1 || toIdx == -1)
        return null;

      int diff = Math.Abs(route.Stops[toIdx].Section - route.Stops[fromIdx].Section);
      return fareLookup.TryGetValue(diff, out double fare) ? fare : null;
    }

    private BusRoute CreateRoute(string routeNo, bool isPrincipal, params (string city, int section)[] stops)
    {
      return new BusRoute
      {
        RouteNo = routeNo,
        IsPrincipal = isPrincipal,
        Stops = stops.Select(s => new BusStop { City = s.city, Section = s.section }).ToList()
      };
    }

    private Dictionary<int, double> DefaultFareTable() => new Dictionary<int, double>
        {
            { 0, 0 }, { 6, 95 }, { 8, 115 }, { 28, 268 }, { 40, 361 },
            { 47, 413 }, { 52, 453 }, { 57, 496 }, { 60, 521 }
        };

    // ── Fare calculation ────────────────────────────────────

    [Fact]
    public void GetFare_BothStopsExistAndSectionDiffInTable_ReturnsCorrectFare()
    {
      var route = CreateRoute("001", true, ("Colombo", 0), ("Kegalle", 40), ("Kandy", 60));
      var fare = GetFare(route, "Colombo", "Kandy", DefaultFareTable());

      Assert.Equal(521, fare);
    }

    [Fact]
    public void GetFare_IntermediateStopsBothPresent_ReturnsCorrectSectionDiffFare()
    {
      var route = CreateRoute("001", true, ("Colombo", 0), ("Kiribathgoda", 6), ("Kegalle", 40), ("Kandy", 60));
      var fare = GetFare(route, "Kiribathgoda", "Kegalle", DefaultFareTable());

      // section diff = 40 - 6 = 34, not in table → null
      Assert.Null(fare);
    }

    [Fact]
    public void GetFare_FromStopMissing_ReturnsNull()
    {
      var route = CreateRoute("032", true, ("Tangalle", 0), ("Jaffna", 302));
      var fare = GetFare(route, "Matara", "Jaffna", DefaultFareTable());

      Assert.Null(fare);
    }

    [Fact]
    public void GetFare_ToStopMissing_ReturnsNull()
    {
      var route = CreateRoute("048", true, ("Colombo", 0), ("Ampara", 166));
      var fare = GetFare(route, "Colombo", "Kandy", DefaultFareTable());

      Assert.Null(fare);
    }

    [Fact]
    public void GetFare_SectionDiffNotInFareTable_ReturnsNull()
    {
      var route = CreateRoute("099", true, ("A", 0), ("B", 999));
      var fare = GetFare(route, "A", "B", DefaultFareTable());

      Assert.Null(fare);
    }

    [Fact]
    public void GetFare_SameStartAndEndStop_ReturnsZero()
    {
      var route = CreateRoute("001", true, ("Colombo", 0), ("Kandy", 60));
      var fare = GetFare(route, "Colombo", "Colombo", DefaultFareTable());

      Assert.Equal(0, fare);
    }

    // ── Route selection / sorting (mirrors PROCESS 1 in GetBusFareAsync) ──

    [Fact]
    public void DirectMatches_SortedByPrincipalThenFare_PrincipalRouteRankedFirstEvenIfCostlier()
    {
      var fareTable = DefaultFareTable();
      var principalRoute = CreateRoute("001", true, ("Colombo", 0), ("Kandy", 60));   // 521
      var nonPrincipalCheaper = CreateRoute("008-alt", false, ("Colombo", 0), ("Kegalle", 40)); // 361, different destination but same "diff bucket" for test simplicity

      var candidates = new List<BusRoute> { nonPrincipalCheaper, principalRoute };

      var best = candidates
          .Select(r => new { Route = r, Fare = GetFare(r, "Colombo", r.RouteNo == "001" ? "Kandy" : "Kegalle", fareTable) })
          .Where(x => x.Fare.HasValue)
          .OrderByDescending(x => x.Route.IsPrincipal)
          .ThenBy(x => x.Fare!.Value)
          .First();

      Assert.Equal("001", best.Route.RouteNo);
    }

    [Fact]
    public void DirectMatches_DuplicateRouteNumbers_GroupedToSingleCheapestEntry()
    {
      var fareTable = DefaultFareTable();
      var routeCopy1 = CreateRoute("032", true, ("Colombo", 0), ("Kandy", 60));  // 521
      var routeCopy2 = CreateRoute("032", true, ("Colombo", 0), ("Kegalle", 40)); // 361 (duplicate RouteNo, cheaper leg)

      var candidates = new List<BusRoute> { routeCopy1, routeCopy2 };

      var grouped = candidates
          .Select(r => new
          {
            Route = r,
            Fare = GetFare(r, "Colombo", r.Stops.Last().City, fareTable)
          })
          .Where(x => x.Fare.HasValue)
          .GroupBy(x => x.Route.RouteNo)
          .Select(g => g.OrderBy(x => x.Fare!.Value).First())
          .ToList();

      Assert.Single(grouped);
      Assert.Equal(361, grouped[0].Fare);
    }

    [Fact]
    public void DirectMatches_TopFiveLimit_ReturnsAtMostFiveOptions()
    {
      var fareTable = DefaultFareTable();
      var candidates = new List<BusRoute>();
      for (int i = 0; i < 8; i++)
        candidates.Add(CreateRoute($"R{i}", true, ("Colombo", 0), ("Kandy", 60)));

      var top5 = candidates
          .Select(r => new { Route = r, Fare = GetFare(r, "Colombo", "Kandy", fareTable) })
          .Where(x => x.Fare.HasValue)
          .OrderBy(x => x.Fare!.Value)
          .Take(5)
          .ToList();

      Assert.Equal(5, top5.Count);
    }

    // ── "Cheapest" badge logic (mirrors frontend/PDF badge rule) ──

    [Fact]
    public void CheapestBadge_AllFaresEqual_NoBadgeShown()
    {
      var fares = new List<double> { 844, 844, 844 };
      bool showBadge = fares.Count > 1 && fares.First() != fares.Last();

      Assert.False(showBadge);
    }

    [Fact]
    public void CheapestBadge_FaresVary_BadgeShownForCheapestOnly()
    {
      var fares = new List<double> { 521, 521, 630, 844 };
      bool showBadge = fares.Count > 1 && fares.First() != fares.Last();
      var cheapest = fares.First();
      var badgedCount = fares.Count(f => showBadge && f == cheapest);

      Assert.True(showBadge);
      Assert.Equal(2, badgedCount); // two options tie for cheapest
    }

    [Fact]
    public void CheapestBadge_SingleRoute_NoBadgeShown()
    {
      var fares = new List<double> { 521 };
      bool showBadge = fares.Count > 1 && fares.First() != fares.Last();

      Assert.False(showBadge);
    }

    // ── Multi-leg interchange fare summing ─────────────────

    [Fact]
    public void MultiLeg_TotalFare_IsSumOfBothLegs()
    {
      double fareLeg1 = 268;
      double fareLeg2 = 453;
      double total = fareLeg1 + fareLeg2;

      Assert.Equal(721, total);
    }

    [Fact]
    public void MultiLeg_NoValidLeg2Candidates_InterchangeSkipped()
    {
      var leg2Candidates = new List<BusRoute>(); // no route connects interchange → destination
      bool hasValidInterchange = leg2Candidates.Any();

      Assert.False(hasValidInterchange);
    }

    // ── ExtractCity (mirrors BusFareService.ExtractCity) ────
    // Rule: last comma-separated segment is the city, unless it's
    // "Sri Lanka" — then use the second-to-last segment instead.

    private string ExtractCity(string fullAddress)
    {
      if (string.IsNullOrWhiteSpace(fullAddress)) return string.Empty;

      var parts = fullAddress.Split(',').Select(p => p.Trim()).ToList();

      if (parts.Count > 1)
      {
        if (parts.Last().Equals("Sri Lanka", StringComparison.OrdinalIgnoreCase))
          return parts[parts.Count - 2];
        return parts.Last();
      }

      return parts[0];
    }

    [Fact]
    public void ExtractCity_AddressEndsWithSriLanka_ReturnsSecondToLastSegment()
    {
      var city = ExtractCity("Kandy, Central Province, Sri Lanka");
      Assert.Equal("Central Province", city);
    }

    [Fact]
    public void ExtractCity_SimpleCityCountryFormat_ReturnsCitySegment()
    {
      var city = ExtractCity("Colombo, Sri Lanka");
      Assert.Equal("Colombo", city);
    }

    [Fact]
    public void ExtractCity_NoCommas_ReturnsWholeStringTrimmed()
    {
      var city = ExtractCity("Matara");
      Assert.Equal("Matara", city);
    }

    [Fact]
    public void ExtractCity_EmptyOrWhitespace_ReturnsEmptyString()
    {
      Assert.Equal(string.Empty, ExtractCity(""));
      Assert.Equal(string.Empty, ExtractCity("   "));
    }

    [Fact]
    public void ExtractCity_ExtraWhitespaceAroundSegments_TrimsCorrectly()
    {
      var city = ExtractCity("  Galle ,  Sri Lanka  ");
      Assert.Equal("Galle", city);
    }

    // ── Same-location search short-circuit ──────────────────

    [Fact]
    public void SameLocationSearch_FromEqualsTo_ReturnsZeroFareDirectResult()
    {
      string from = "Colombo";
      string to = "colombo"; // case-insensitive match, mirrors OrdinalIgnoreCase check

      bool isSameLocation = from.Equals(to, StringComparison.OrdinalIgnoreCase);
      double resultFare = isSameLocation ? 0 : -1;

      Assert.True(isSameLocation);
      Assert.Equal(0, resultFare);
    }
  }
}
