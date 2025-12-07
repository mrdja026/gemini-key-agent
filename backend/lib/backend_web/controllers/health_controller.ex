defmodule BackendWeb.HealthController do
  use BackendWeb, :controller
  use OpenApiSpex.ControllerSpecs

  tags ["Health"]

  operation :index,
    summary: "Health Check",
    description: "Returns 200 OK if the service is up.",
    responses: [
      ok: {"Health check response", "application/json", OpenApiSpex.Schema}
    ]

  def index(conn, _params) do
    json(conn, %{status: "ok"})
  end
end
