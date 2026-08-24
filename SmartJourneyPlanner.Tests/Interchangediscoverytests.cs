using System;
using System.Collections.Generic;
using System.Linq;
using SmartJourneyPlanner.Models;
using Xunit;

namespace SmartJourneyPlanner.Tests
{
  public class InterchangeDiscoveryTests
  {
    // ── Helpers ─────────────────────────────────────────────
    private BusRoute CreateRoute(string routeNo, params (string city, int section)[] stops)
    {
      return new BusRoute
      {
        RouteNo = routeNo,
        Stops = stops.Select(s => new BusStop { City = s.city, Section = s.section }).ToList()
      };
    }

    private double? GetFare(BusRoute route, string fromCity, string toCity, Dictionary<int, double> fareLookup)
    {
      int fromIdx = route.Stops.FindIndex(s => s.City.Equals(fromCity, StringComparison.OrdinalIgnoreCase));
      int toIdx = route.Stops.FindIndex(s => s.City.Equals(toCity, StringComparison.OrdinalIgnoreCase));
      if (fromIdx == -1 || toIdx == -1) return null;
      int diff = Math.Abs(route.Stops[toIdx].Section - route.Stops[fromIdx].Section);
      return fareLookup.TryGetValue(diff, out double fare) ? fare : null;
    }

    // Mirrors PROCESS 2 in GetBusFareAsync: find leg1 routes containing `from`,
    // then for each intermediate stop as a candidate interchange, find leg2 routes
    // that connect that interchange to `to`. Returns all valid (leg1, leg2, interchange) combos.
    private List<(BusRoute Leg1, BusRoute Leg2, string Interchange, double Total)> FindInterchanges(
        List<BusRoute> allRoutes, string from, string to, Dictionary<int, double> fareLookup)
    {
      var leg1Candidates = allRoutes
          .Where(r => r.Stops.Any(s => s.City.Equals(from, StringComparison.OrdinalIgnoreCase)))
          .ToList();

      var results = new List<(BusRoute, BusRoute, string, double)>();

      foreach (var leg1 in leg1Candidates)
      {
        var possibleInterchanges = leg1.Stops
            .Where(s => !s.City.Equals(from, StringComparison.OrdinalIgnoreCase))
            .Select(s => s.City);

        foreach (var interchange in possibleInterchanges)
        {
          var leg2Candidates = allRoutes
              .Where(r => r.RouteNo != leg1.RouteNo &&
                          r.Stops.Any(s => s.City.Equals(interchange, StringComparison.OrdinalIgnoreCase)) &&
                          r.Stops.Any(s => s.City.Equals(to, StringComparison.OrdinalIgnoreCase)))
              .ToList();

          if (!leg2Candidates.Any()) continue;

          var fare1 = GetFare(leg1, from, interchange, fareLookup);
          if (!fare1.HasValue) continue;

          foreach (var leg2 in leg2Candidates)
          {
            var fare2 = GetFare(leg2, interchange, to, fareLookup);
            if (!fare2.HasValue) continue;

            results.Add((leg1, leg2, interchange, fare1.Value + fare2.Value));
          }
        }
      }

      return results;
    }

    private Dictionary<int, double> DefaultFareTable() => new Dictionary<int, double>
        {
            { 0, 0 }, { 6, 95 }, { 8, 115 }, { 13, 155 }, { 19, 200 },
            { 28, 268 }, { 40, 361 }, { 52, 453 }
        };

    // ── Tests ────────────────────────────────────────────────

    [Fact]
    public void FindInterchanges_ValidTwoLegPath_ReturnsOneCombo()
    {
      var leg1 = CreateRoute("001", ("Colombo", 0), ("Kadawatha", 8));
      var leg2 = CreateRoute("002", ("Kadawatha", 0), ("Kandy", 52));

      var routes = new List<BusRoute> { leg1, leg2 };
      var results = FindInterchanges(routes, "Colombo", "Kandy", DefaultFareTable());

      Assert.Single(results);
      Assert.Equal("Kadawatha", results[0].Item3);
    }

    [Fact]
    public void FindInterchanges_NoLeg2ConnectingToDestination_ReturnsEmpty()
    {
      var leg1 = CreateRoute("001", ("Colombo", 0), ("Kadawatha", 8));
      var unrelated = CreateRoute("099", ("Kadawatha", 0), ("Galle", 40)); // doesn't reach "Kandy"

      var routes = new List<BusRoute> { leg1, unrelated };
      var results = FindInterchanges(routes, "Colombo", "Kandy", DefaultFareTable());

      Assert.Empty(results);
    }

    [Fact]
    public void FindInterchanges_OnlyOneRouteExists_ReturnsEmpty()
    {
      // Only leg1 exists, no second route to complete the journey
      var leg1 = CreateRoute("001", ("Colombo", 0), ("Kadawatha", 8));
      var routes = new List<BusRoute> { leg1 };

      var results = FindInterchanges(routes, "Colombo", "Kandy", DefaultFareTable());

      Assert.Empty(results);
    }

    [Fact]
    public void FindInterchanges_MultipleValidInterchangePoints_ReturnsMultipleCombos()
    {
      var leg1 = CreateRoute("001", ("Colombo", 0), ("Kadawatha", 8), ("Nittambuwa", 19));
      var leg2ViaKadawatha = CreateRoute("002", ("Kadawatha", 0), ("Kandy", 52));
      var leg2ViaNittambuwa = CreateRoute("003", ("Nittambuwa", 0), ("Kandy", 40));

      var routes = new List<BusRoute> { leg1, leg2ViaKadawatha, leg2ViaNittambuwa };
      var results = FindInterchanges(routes, "Colombo", "Kandy", DefaultFareTable());

      Assert.Equal(2, results.Count);
      Assert.Contains(results, r => r.Item3 == "Kadawatha");
      Assert.Contains(results, r => r.Item3 == "Nittambuwa");
    }

    [Fact]
    public void FindInterchanges_Leg2SameRouteNoAsLeg1_ExcludedFromResults()
    {
      // A route can't be its own connecting leg — RouteNo must differ
      var loopRoute = CreateRoute("001", ("Colombo", 0), ("Kadawatha", 8), ("Kandy", 52));
      var routes = new List<BusRoute> { loopRoute };

      var results = FindInterchanges(routes, "Colombo", "Kandy", DefaultFareTable());

      // No results because leg2 candidates exclude leg1's own RouteNo
      Assert.Empty(results);
    }

    [Fact]
    public void FindInterchanges_CheapestComboSelectedByOrderBy_PicksLowestTotal()
    {
      var leg1 = CreateRoute("001", ("Colombo", 0), ("Kadawatha", 8));
      var leg2Expensive = CreateRoute("002", ("Kadawatha", 0), ("Kandy", 52));  // fare1(115) + fare2(453) = 568
      var leg2Cheap = CreateRoute("003", ("Kadawatha", 0), ("Kandy", 6));       // fare1(115) + fare2(95) = 210

      var routes = new List<BusRoute> { leg1, leg2Expensive, leg2Cheap };
      var results = FindInterchanges(routes, "Colombo", "Kandy", DefaultFareTable());

      var best = results.OrderBy(r => r.Item4).First();

      Assert.Equal(210, best.Item4);
      Assert.Equal("003", best.Leg2.RouteNo);
    }

    [Fact]
    public void FindInterchanges_Leg1FareNotInTable_SkipsThatInterchange()
    {
      var leg1 = CreateRoute("001", ("Colombo", 0), ("OddStop", 999)); // section diff not in fare table
      var leg2 = CreateRoute("002", ("OddStop", 0), ("Kandy", 52));

      var routes = new List<BusRoute> { leg1, leg2 };
      var results = FindInterchanges(routes, "Colombo", "Kandy", DefaultFareTable());

      Assert.Empty(results);
    }

    [Fact]
    public void FindInterchanges_FromCityNotInAnyRoute_ReturnsEmpty()
    {
      var leg1 = CreateRoute("001", ("Kadawatha", 8), ("Kandy", 52));
      var routes = new List<BusRoute> { leg1 };

      var results = FindInterchanges(routes, "Matara", "Kandy", DefaultFareTable());

      Assert.Empty(results);
    }
  }
}
