# Getting started with Aspire and Dev Containers

This is a repository template to streamline the process of getting started with Aspire using Dev Containers in both Visual Studio Code and GitHub Codespaces. Please refer to our product documentation on how to use these repository templates to get started.

- [Aspire and GitHub Codespaces](https://learn.microsoft.com/dotnet/aspire/get-started/github-codespaces)
- [Aspire and Visual Studio Code Dev Containers](https://learn.microsoft.com/dotnet/aspire/get-started/dev-containers)

> [!NOTE]
> Once you have created your repository from this template please remember to review the included files such as `LICENSE`, `CODE_OF_CONDUCT.md`, `SECURITY.md` and this `README.md` file to ensure they are appropriate for your circumstances.

# OpenAPI client

Generate the TypeScript client (requires `aspire run` so the OpenAPI endpoint is available):

```
cd src/frontend
OPENAPI_URL="https://<server-endpoint>/openapi/v1.json" pnpm openapi-ts
```

Use the HTTPS endpoint shown for the `server` resource in the Aspire dashboard. Aspire also runs a `clientgen` resource at startup to generate the client once the API is reachable, and you can rerun generation from the "Generate API client" command on the `webfrontend` resource. Generated files land in `src/frontend/src/client`.

# Tests

Run AppHost integration tests:

```
dotnet test "src/app.AppHost.Tests/app.AppHost.Tests.csproj"
```

Run API-only tests with Testcontainers MSSQL:

```
dotnet test "src/app.Server.Tests/app.Server.Tests.csproj"
```

# Code of Conduct

This project has adopted the code of conduct defined by the Contributor Covenant
to clarify expected behavior in our community.

For more information, see the [.NET Foundation Code of Conduct](https://dotnetfoundation.org/code-of-conduct).
