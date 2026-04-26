using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace SmartJourneyPlanner.API.Models
{
    [BsonIgnoreExtraElements]
    public class TripBudget
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        // THE CONNECTOR-This links this budget to a specific Trip
        //the foreign key that makes the Budget Dashboard work
        [BsonRequired]
        [BsonRepresentation(BsonType.ObjectId)]
        public string TripId { get; set; } = null!; 

        public double TotalSpent { get; set; }

        public List<Expense> Expenses { get; set; } = new();
    }

    [BsonIgnoreExtraElements]
    public class Expense
    {
        // use BsonId here for able to delete specific expenses easily
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; } = ObjectId.GenerateNewId().ToString();

        public string Description { get; set; } = null!; // Same as your "Name"

        // practice for financial data to avoid floating-point rounding errors.
        public decimal Amount { get; set; }
        public string Category { get; set; } = "General";
        public DateTime Date { get; set; } = DateTime.UtcNow;
    }
}
