using System.Net;
using System.Net.Http.Json;
using Aspire.Hosting.Testing;
using Xunit;

public class TodosAppHostTests
{
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(60);

    [Fact]
    public async Task TodoLifecycleWorksThroughAppHostAsync()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var appHost = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.app_AppHost>(cancellationToken);

        await using var app = await appHost.BuildAsync(cancellationToken)
            .WaitAsync(DefaultTimeout, cancellationToken);
        await app.StartAsync(cancellationToken)
            .WaitAsync(DefaultTimeout, cancellationToken);

        await app.ResourceNotifications.WaitForResourceHealthyAsync("server", cancellationToken)
            .WaitAsync(DefaultTimeout, cancellationToken);

        using var httpClient = app.CreateHttpClient("server");

        var createResponse = await httpClient.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest("AppHost item", null, null, null),
            cancellationToken);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content.ReadFromJsonAsync<TodoItemDto>(
            cancellationToken: cancellationToken);

        Assert.NotNull(created);

        var listResponse = await httpClient.GetAsync(
            "/api/todos?page=1&pageSize=10",
            cancellationToken);

        listResponse.EnsureSuccessStatusCode();

        Assert.True(listResponse.Headers.TryGetValues("X-Total-Count", out var values));
        Assert.Contains("1", values);

        var updateResponse = await httpClient.PatchAsJsonAsync(
            $"/api/todos/{created!.Id}",
            new UpdateTodoRequest(null, null, null, null, true, false),
            cancellationToken);

        updateResponse.EnsureSuccessStatusCode();

        var updated = await updateResponse.Content.ReadFromJsonAsync<TodoItemDto>(
            cancellationToken: cancellationToken);

        Assert.NotNull(updated);
        Assert.True(updated!.IsCompleted);

        var deleteResponse = await httpClient.DeleteAsync(
            $"/api/todos/{created.Id}",
            cancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task CreatingEmptyTodoReturnsBadRequestAsync()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var appHost = await DistributedApplicationTestingBuilder
            .CreateAsync<Projects.app_AppHost>(cancellationToken);

        await using var app = await appHost.BuildAsync(cancellationToken)
            .WaitAsync(DefaultTimeout, cancellationToken);
        await app.StartAsync(cancellationToken)
            .WaitAsync(DefaultTimeout, cancellationToken);

        await app.ResourceNotifications.WaitForResourceHealthyAsync("server", cancellationToken)
            .WaitAsync(DefaultTimeout, cancellationToken);

        using var httpClient = app.CreateHttpClient("server");

        var response = await httpClient.PostAsJsonAsync(
            "/api/todos",
            new CreateTodoRequest(" ", null, null, null),
            cancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private sealed record CreateTodoRequest(string? Title, string? Notes, DateTimeOffset? DueDate, int? SortOrder);

    private sealed record UpdateTodoRequest(
        string? Title,
        string? Notes,
        DateTimeOffset? DueDate,
        int? SortOrder,
        bool? IsCompleted,
        bool ClearDueDate = false);

    private sealed record TodoItemDto(
        int Id,
        string Title,
        string? Notes,
        bool IsCompleted,
        int SortOrder,
        DateTimeOffset? DueDate,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt);
}
