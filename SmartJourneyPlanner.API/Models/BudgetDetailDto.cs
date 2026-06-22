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
        public decimal ExpectedBudget { get; set; }
        public decimal TotalSpent { get; set; }
        public decimal RemainingBudget { get; set; }
        public double UsagePercent { get; set; }
        public int ExpenseCount { get; set; }
        public string Status { get; set; } = "On Track";
        public List<AdminExpenseLineDto> Expenses { get; set; } = new();
    }

    public class AdminBudgetSummaryDto
    {
        public decimal TotalTrackedSpend { get; set; }
        public int TotalBudgetsTracked { get; set; }
        public decimal TotalBudgetLimit { get; set; }
        public int OverBudgetTrips { get; set; }
        public decimal AverageSpendPerTrip { get; set; }
    }

    public class AdminCategorySpendDto
    {
        public string Category { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }

    public class AdminBudgetOverviewDto
    {
        public AdminBudgetSummaryDto Summary { get; set; } = new();
        public List<AdminBudgetTripDto> Trips { get; set; } = new();
        public List<AdminCategorySpendDto> CategoryBreakdown { get; set; } = new();
    }
}
