defmodule BackendWeb.Router do
  use BackendWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug OpenApiSpex.Plug.PutApiSpec, module: BackendWeb.ApiSpec
  end

  scope "/api", BackendWeb do
    pipe_through :api
    get "/health", HealthController, :index
    post "/generate", GenerateController, :index
    post "/generate-image", GenerateController, :generate_image
  end

  scope "/" do
    pipe_through :api
    get "/swagger", OpenApiSpex.Plug.SwaggerUI, path: "/api/openapi"
    get "/api/openapi", OpenApiSpex.Plug.RenderSpec, spec: BackendWeb.ApiSpec
  end
end
