# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app
COPY Directory.Build.props Directory.Packages.props ./
COPY Sources/ Sources/
RUN dotnet restore Sources/Notable.Host/Notable.Host.csproj
RUN dotnet publish Sources/Notable.Host/Notable.Host.csproj -c Release -o out --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/out .
ENV ASPNETCORE_HTTP_PORTS=80
EXPOSE 80
ENTRYPOINT ["dotnet", "Notable.Host.dll"]
