using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;

namespace SmartJourneyPlanner.API.Models
{
    public class WeatherRule
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = "";

        [BsonElement("condition")]
        public string Condition { get; set; } = "";

        [BsonElement("minTemp")]
        public double MinTemp { get; set; }

        [BsonElement("maxTemp")]
        public double MaxTemp { get; set; }

        [BsonElement("minHumidity")]
        public double MinHumidity { get; set; }

        [BsonElement("message")]
        public string Message { get; set; } = "";

        [BsonElement("packing")]
        public List<string> Packing { get; set; } = new();

        [BsonElement("outfit")]
        public List<string> Outfit { get; set; } = new();

        [BsonElement("activity")]
        public List<string> Activity { get; set; } = new();
    }
}