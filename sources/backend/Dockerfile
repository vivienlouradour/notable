# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /app
#COPY <other-proj-dir>/*.csproj <other-proj-dir>/
COPY Notable.Host/*.csproj Notable.Host/
RUN dotnet restore Notable.Host
COPY . .
RUN dotnet publish Notable.Host -c Release -o out --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine
WORKDIR /app
COPY --from=build /app/out .
EXPOSE 80
ENTRYPOINT ["dotnet", "Notable.Host.dll"]