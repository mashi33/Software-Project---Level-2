namespace SmartJourneyPlanner.API.Models
{
    public class MongoDBSettings
    {
        // These names MUST match the json file exactly
        public string ConnectionString { get; set; } = null!;
        public string DatabaseName { get; set; } = null!;
        public string CollectionName { get; set; } = null!;
    }
}