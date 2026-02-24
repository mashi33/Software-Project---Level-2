using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartJourneyPlanner.API.Models
{
    [BsonIgnoreExtraElements] // ✅ 1. Ignore unknown fields instead of crashing
    public class TripBudget
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string? TripId { get; set; } // ✅ Made nullable
        public double TotalSpent { get; set; }
        public List<Expense> Expenses { get; set; } = new();
    }

    [BsonIgnoreExtraElements]
    public class Expense
    {
        public string? Name { get; set; }      // ✅ Made nullable
        public double Amount { get; set; }
        public string? Category { get; set; }  // ✅ Made nullable
        public DateTime Date { get; set; }
    }
}
