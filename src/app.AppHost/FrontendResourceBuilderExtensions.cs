using System.Diagnostics;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.JavaScript;

namespace Aspire.Hosting;

internal static class FrontendResourceBuilderExtensions
{
    public static IResourceBuilder<ViteAppResource> WithOpenApiClientCommand(
        this IResourceBuilder<ViteAppResource> builder,
        EndpointReference apiEndpoint)
    {
        var commandOptions = new CommandOptions
        {
            UpdateState = _ => apiEndpoint.IsAllocated
                ? ResourceCommandState.Enabled
                : ResourceCommandState.Disabled
        };

        builder.WithCommand(
            name: "openapi-ts",
            displayName: "Generate API client",
            executeCommand: context => RunOpenApiTsAsync(apiEndpoint, context),
            commandOptions: commandOptions);

        return builder;
    }

    private static async Task<ExecuteCommandResult> RunOpenApiTsAsync(
        EndpointReference apiEndpoint,
        ExecuteCommandContext context)
    {
        var workingDirectory = Path.GetFullPath("../frontend", Directory.GetCurrentDirectory());

        if (!Directory.Exists(workingDirectory))
        {
            return CommandResults.Failure($"Frontend directory not found at '{workingDirectory}'.");
        }

        var apiUrl = await apiEndpoint.GetValueAsync(context.CancellationToken);
        if (string.IsNullOrWhiteSpace(apiUrl))
        {
            return CommandResults.Failure("API endpoint URL not available.");
        }

        var openApiUrl = $"{apiUrl.TrimEnd('/')}/openapi/v1.json";

        var startInfo = new ProcessStartInfo("pnpm", "openapi-ts")
        {
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        startInfo.Environment["OPENAPI_URL"] = openApiUrl;

        using var process = Process.Start(startInfo);
        if (process is null)
        {
            return CommandResults.Failure("Failed to start pnpm.");
        }

        var outputTask = process.StandardOutput.ReadToEndAsync(context.CancellationToken);
        var errorTask = process.StandardError.ReadToEndAsync(context.CancellationToken);

        await process.WaitForExitAsync(context.CancellationToken);

        var errorOutput = await errorTask;

        if (process.ExitCode != 0)
        {
            var message = string.IsNullOrWhiteSpace(errorOutput)
                ? $"openapi-ts failed with exit code {process.ExitCode}."
                : errorOutput.Trim();

            return CommandResults.Failure(message);
        }

        await outputTask;

        return CommandResults.Success();
    }
}
