using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.AddSqlServerDbContext<TodoDbContext>("database");

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.MapGet("/scalar", () => Results.Redirect("/scalar/v1"));
}

app.MapDefaultEndpoints();

await EnsureDatabaseCreatedAsync(app.Services);

app.MapTodosApi();

app.UseFileServer();

await app.RunAsync();

static async Task EnsureDatabaseCreatedAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<TodoDbContext>();
    await dbContext.Database.EnsureCreatedAsync();

    await dbContext.Database.ExecuteSqlRawAsync(
        """
        IF COL_LENGTH('Todos', 'DeletedAt') IS NULL
        BEGIN
            ALTER TABLE [Todos] ADD [DeletedAt] datetimeoffset NULL;
        END
        """);
}

public partial class Program;
