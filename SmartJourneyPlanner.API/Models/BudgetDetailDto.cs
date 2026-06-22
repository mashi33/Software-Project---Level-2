namespace SmartJourneyPlanner.API.Models
{
    public class AdminExpenseLineDto
    {
        public string? Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = "General";
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string AddedBy { get; set; } = string.Empty;
    }

    public class AdminBudgetTripDto
    {
        public string TripName { get; set; } = string.Empty;
        public string TripId { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public string DepartFrom { get; set; } = string.Empty;
        public string Destination { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal BudgetLimit { get; set; }
        public decimal TotalSpent { get; set; }
        public decimal RemainingBudget { get; set; }
        public double UsagePercent { get; set; }
        public int ExpenseCount { get; set; }
        public string Status { get; set; } = "On Track";
        public List<AdminExpenseLineDto> Expenses { get; set; } = new();
    }

    public class AdminBudgetSummaryDto
    {
        public int TotalTrips { get; set; }
        public int OverBudgetTrips { get; set; }
        public int OnTrackTrips { get; set; }
        public int NearLimitTrips { get; set; }
    }

    public class AdminBudgetOverviewDto
    {
        public AdminBudgetSummaryDto Summary { get; set; } = new();
        public List<AdminBudgetTripDto> Trips { get; set; } = new();
    }
}
