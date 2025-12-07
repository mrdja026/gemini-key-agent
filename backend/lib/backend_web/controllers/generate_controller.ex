defmodule BackendWeb.GenerateController do
  use BackendWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Backend.Generator

  tags ["Generation"]

  defmodule GenerateRequest do
    require OpenApiSpex
    alias OpenApiSpex.Schema

    OpenApiSpex.schema(%{
      title: "GenerateRequest",
      description: "Request to generate text from Gemini",
      type: :object,
      properties: %{
        prompt: %Schema{type: :string, description: "The prompt to send to Gemini", example: "Tell me a joke"},
        contents: %Schema{
          type: :array,
          description: "Optional history of conversation",
          items: %Schema{
            type: :object,
            properties: %{
              role: %Schema{type: :string, enum: ["user", "model", "system"]},
              message: %Schema{type: :string}
            }
          }
        }
      },
      required: [:prompt]
    })
  end

  defmodule GenerateImageRequest do
    require OpenApiSpex
    alias OpenApiSpex.Schema

    OpenApiSpex.schema(%{
      title: "GenerateImageRequest",
      description: "Request to generate an image",
      type: :object,
      properties: %{
        prompt: %Schema{type: :string, description: "The prompt to send to Stability AI", example: "A futuristic city"}
      },
      required: [:prompt]
    })
  end

  defmodule GenerateImageResponse do
    require OpenApiSpex
    alias OpenApiSpex.Schema

    OpenApiSpex.schema(%{
      title: "GenerateImageResponse",
      description: "Response from Image Generation",
      type: :object,
      properties: %{
        refinedPrompt: %Schema{type: :string, description: "The refined prompt used for generation"},
        image: %Schema{
          type: :object,
          description: "Image data",
          properties: %{
            mimeType: %Schema{type: :string},
            data: %Schema{type: :string, description: "Base64 encoded image data"},
            url: %Schema{type: :string, description: "URL to the image"}
          }
        }
      }
    })
  end

  defmodule GenerateResponse do
    require OpenApiSpex
    alias OpenApiSpex.Schema

    OpenApiSpex.schema(%{
      title: "GenerateResponse",
      description: "Response from Gemini",
      type: :object,
      properties: %{
        text: %Schema{type: :string, description: "Generated text"},
        usage_metadata: %Schema{
          type: :object,
          description: "Token usage stats",
          properties: %{
            promptTokenCount: %Schema{type: :integer},
            candidatesTokenCount: %Schema{type: :integer},
            totalTokenCount: %Schema{type: :integer}
          }
        }
      }
    })
  end

  operation :index,
    summary: "Generate Content",
    description: "Generates content using Gemini API based on prompt and optional context.",
    request_body: {"Generate Request", "application/json", GenerateRequest},
    responses: [
      ok: {"Successful generation", "application/json", GenerateResponse},
      unprocessable_entity: {"Bad Request", "application/json", OpenApiSpex.Schema}
    ]

  operation :generate_image,
    summary: "Generate Image",
    description: "Generates an image using Stability AI based on prompt.",
    request_body: {"Generate Image Request", "application/json", GenerateImageRequest},
    responses: [
      ok: {"Successful generation", "application/json", GenerateImageResponse},
      unprocessable_entity: {"Bad Request", "application/json", OpenApiSpex.Schema}
    ]

  def generate_image(conn, params) do
    prompt = params["prompt"]

    if is_nil(prompt) or prompt == "" do
      conn
      |> put_status(:bad_request)
      |> json(%{error: "Missing required field: 'prompt'"})
    else
      case Generator.generate_image(prompt) do
        {:ok, result} ->
          json(conn, result)
        {:error, reason} ->
          conn
          |> put_status(:bad_request)
          |> json(%{error: reason})
      end
    end
  end

  def index(conn, params) do
    # OpenApiSpex automatically casts/validates params before this if cleaner is used,
    # but for simple controller we can access params directly or use a plug.
    # For now, we trust the params derived from body_params by Phoenix + our manual validation or casting.

    # Actually, standard OpenApiSpex usage often involves `OpenApiSpex.Plug.CastAndValidate`
    # Let's assume we extract from keys directly for simplicity in this step,
    # or we can use the strict struct if we added the plug.

    # We will just pass the raw map to the service for now.
    prompt = params["prompt"]
    contents = params["contents"] || []

    if is_nil(prompt) or prompt == "" do
      conn
      |> put_status(:bad_request)
      |> json(%{error: "Missing required field: 'prompt'"})
    else
      case Generator.generate(prompt, contents) do
        {:ok, result} ->
          json(conn, result)
        {:error, reason} ->
          conn
          |> put_status(:bad_request)
          |> json(%{error: reason})
      end
    end
  end
end
