defmodule BackendWeb.ApiSpec do
  @moduledoc false

  alias OpenApiSpex.{Info, OpenApi, Paths, Server}

  @behaviour OpenApiSpex.OpenApi

  @impl OpenApiSpex.OpenApi
  def spec do
    %OpenApi{
      servers: [
        # Populate the Server info from a config variable
        Server.from_endpoint(BackendWeb.Endpoint)
      ],
      info: %Info{
        title: "Gemini Backend",
        version: "1.0"
      },
      # Populate the paths from a router
      paths: Paths.from_router(BackendWeb.Router)
    }
    |> OpenApiSpex.resolve_schema_modules()
  end
end
