using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Collections.Generic;
using System;

namespace SmartJourneyPlanner.Models
{
    public class RouteRequest
    {
        public string Start { get; set; } = string.Empty;
        public string End { get; set; } = string.Empty;
    }

    public class SavedRoute
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string StartLocation { get; set; } = string.Empty;
        public string EndLocation { get; set; } = string.Empty;

        public RouteDetail Fastest { get; set; } = default!;
        public RouteDetail Cheapest { get; set; } = default!;
        public RouteDetail Scenic { get; set; } = default!;

        // Save places located in near the the scenic route
        public List<ViewpointDetail> ScenicViewpoints { get; set; } = new List<ViewpointDetail>();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class RouteDetail
    {
        public string Distance { get; set; } = string.Empty;
        public string Duration { get; set; } = string.Empty;
        public string Polyline { get; set; } = string.Empty;
    }

    // අලුතින් එක් කළ Viewpoint Class එක
    public class ViewpointDetail
    {
        public string Name { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }

        // අමතර සටහන: ස්ථාන වර්ගීකරණය පසුව අවශ්‍ය වුවහොත් මෙහි String එකක් ලෙස Category එකතු කළ හැක.
        // දැනට පවතින Controller logic එකට අනුව Name, Lat, Lng පමණක් ප්‍රමාණවත් වේ.
    }
}