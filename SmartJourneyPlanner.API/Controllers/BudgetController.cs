using Microsoft.AspNetCore.Mvc;
using SmartJourneyPlanner.API.Models;
using SmartJourneyPlanner.API.Services;

namespace SmartJourneyPlanner.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BudgetController : ControllerBase
    {
        private readonly BudgetService _budgetService;

        public BudgetController(BudgetService budgetService)
        {
            _budgetService = budgetService;
        }

        // 1. Create a Budget (POST api/budget)
        [HttpPost]
        public async Task<IActionResult> CreateBudget(TripBudget newBudget)
        {
            await _budgetService.CreateBudgetAsync(newBudget);
            return Ok(newBudget);
        }

        // 2. Get Budget by Trip ID (GET api/budget/{tripId})
        [HttpGet("{tripId}")]
        public async Task<IActionResult> GetBudget(string tripId)
        {
            var budget = await _budgetService.GetBudgetByTripIdAsync(tripId);
            if (budget == null) return NotFound("No budget found for this trip.");
            return Ok(budget);
        }

        // 3. Add Expense (POST api/budget/add-expense/{tripId})
        [HttpPost("add-expense/{tripId}")]
        public async Task<IActionResult> AddExpense(string tripId, [FromBody] Expense expense)
        {
            await _budgetService.AddExpenseAsync(tripId, expense);
            return Ok("Expense added successfully!");
        }

        // 4. DELETE EXPENSE
        [HttpDelete("delete-expense/{tripId}/{expenseName}")]
        public async Task<IActionResult> DeleteExpense(string tripId, string expenseName)
        {
            await _budgetService.DeleteExpenseAsync(tripId, expenseName);
            return Ok("Expense deleted and total updated.");
        }

        // ✅ 5. UPDATE EXPENSE (New Feature!)
        [HttpPut("update-expense/{tripId}/{oldName}")]
        public async Task<IActionResult> UpdateExpense(string tripId, string oldName, [FromBody] Expense updatedExpense)
        {
            var budget = await _budgetService.GetBudgetByTripIdAsync(tripId);
            if (budget == null) return NotFound("Trip not found");

            var existingExpense = budget.Expenses.FirstOrDefault(e => e.Name == oldName);
            if (existingExpense == null) return NotFound("Expense not found");

            // Update fields
            existingExpense.Name = updatedExpense.Name;
            existingExpense.Amount = updatedExpense.Amount;
            existingExpense.Category = updatedExpense.Category;

            await _budgetService.UpdateBudgetAsync(budget);
            return Ok("Expense updated successfully");
        }

    } // End of Class
}