using System.Globalization;
using Microsoft.EntityFrameworkCore;

public static class TodosApi
{
    public static IEndpointRouteBuilder MapTodosApi(this IEndpointRouteBuilder endpoints)
    {
        var api = endpoints.MapGroup("/api");
        var todos = api.MapGroup("/todos");

        todos.MapGet("", async (
            TodoDbContext dbContext,
            HttpContext httpContext,
            bool? completed,
            int page = 1,
            int pageSize = 20,
            string? sort = null) =>
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 100);

            IQueryable<TodoItem> query = dbContext.Todos.AsNoTracking();

            if (completed.HasValue)
            {
                query = query.Where(item => item.IsCompleted == completed.Value);
            }

            var totalCount = await query.CountAsync();

            query = ApplySort(query, sort);

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = items.Select(TodoItemDto.FromEntity).ToList();

            httpContext.Response.Headers["X-Total-Count"] = totalCount.ToString(CultureInfo.InvariantCulture);

            return Results.Ok(result);
        });

        todos.MapGet("{id:int}", async (TodoDbContext dbContext, int id) =>
        {
            var item = await dbContext.Todos.AsNoTracking()
                .FirstOrDefaultAsync(todo => todo.Id == id);

            return item is null ? Results.NotFound() : Results.Ok(TodoItemDto.FromEntity(item));
        });

        todos.MapPost("", async (TodoDbContext dbContext, CreateTodoRequest request) =>
        {
            var title = request.Title?.Trim();

            if (string.IsNullOrWhiteSpace(title))
            {
                return Results.BadRequest(new { error = "Title is required." });
            }

            var now = DateTimeOffset.UtcNow;

            var item = new TodoItem
            {
                Title = title,
                Notes = request.Notes?.Trim(),
                DueDate = request.DueDate,
                SortOrder = request.SortOrder ?? 0,
                IsCompleted = false,
                CreatedAt = now,
                UpdatedAt = now
            };

            dbContext.Todos.Add(item);
            await dbContext.SaveChangesAsync();

            return Results.Created($"/api/todos/{item.Id}", TodoItemDto.FromEntity(item));
        });

        todos.MapPatch("{id:int}", async (TodoDbContext dbContext, int id, UpdateTodoRequest request) =>
        {
            var item = await dbContext.Todos.FindAsync(id);

            if (item is null)
            {
                return Results.NotFound();
            }

            if (request.Title is not null)
            {
                var title = request.Title.Trim();
                if (string.IsNullOrWhiteSpace(title))
                {
                    return Results.BadRequest(new { error = "Title is required." });
                }

                item.Title = title;
            }

            if (request.Notes is not null)
            {
                item.Notes = request.Notes.Trim();
            }

            if (request.DueDate.HasValue || request.ClearDueDate)
            {
                item.DueDate = request.ClearDueDate ? null : request.DueDate;
            }

            if (request.SortOrder.HasValue)
            {
                item.SortOrder = request.SortOrder.Value;
            }

            if (request.IsCompleted.HasValue)
            {
                item.IsCompleted = request.IsCompleted.Value;
            }

            item.UpdatedAt = DateTimeOffset.UtcNow;

            await dbContext.SaveChangesAsync();

            return Results.Ok(TodoItemDto.FromEntity(item));
        });

        todos.MapDelete("{id:int}", async (TodoDbContext dbContext, int id) =>
        {
            var item = await dbContext.Todos.FindAsync(id);
            if (item is null)
            {
                return Results.NotFound();
            }

            dbContext.Todos.Remove(item);
            await dbContext.SaveChangesAsync();

            return Results.NoContent();
        });

        return endpoints;
    }

    private static IQueryable<TodoItem> ApplySort(IQueryable<TodoItem> query, string? sort)
    {
        return sort switch
        {
            "createdAt" => query.OrderBy(item => item.CreatedAt),
            "-createdAt" => query.OrderByDescending(item => item.CreatedAt),
            "title" => query.OrderBy(item => item.Title),
            "-title" => query.OrderByDescending(item => item.Title),
            "order" => query.OrderBy(item => item.SortOrder),
            "-order" => query.OrderByDescending(item => item.SortOrder),
            _ => query.OrderByDescending(item => item.CreatedAt)
        };
    }
}

record CreateTodoRequest(string? Title, string? Notes, DateTimeOffset? DueDate, int? SortOrder);

record UpdateTodoRequest(
    string? Title,
    string? Notes,
    DateTimeOffset? DueDate,
    int? SortOrder,
    bool? IsCompleted,
    bool ClearDueDate = false);

record TodoItemDto(
    int Id,
    string Title,
    string? Notes,
    bool IsCompleted,
    int SortOrder,
    DateTimeOffset? DueDate,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public static TodoItemDto FromEntity(TodoItem item) =>
        new(
            item.Id,
            item.Title,
            item.Notes,
            item.IsCompleted,
            item.SortOrder,
            item.DueDate,
            item.CreatedAt,
            item.UpdatedAt);
}

class TodoItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public bool IsCompleted { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset? DueDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

class TodoDbContext : DbContext
{
    public TodoDbContext(DbContextOptions<TodoDbContext> options)
        : base(options)
    {
    }

    public DbSet<TodoItem> Todos => Set<TodoItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var todo = modelBuilder.Entity<TodoItem>();
        todo.ToTable("Todos");
        todo.HasKey(item => item.Id);
        todo.Property(item => item.Title).HasMaxLength(200).IsRequired();
        todo.Property(item => item.Notes).HasMaxLength(2000);
        todo.Property(item => item.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        todo.Property(item => item.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        todo.Property(item => item.IsCompleted).HasDefaultValue(false);
    }
}
