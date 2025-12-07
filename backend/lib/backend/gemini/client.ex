defmodule Backend.Gemini.Client do
  @moduledoc """
  Client for interacting with the local TypeScript Sidecar service.
  """
  require Logger

  @sidecar_url "http://localhost:4001/api/generate"
  @sidecar_image_url "http://localhost:4001/api/generate-image"

  @doc """
  Generates an image by delegating to the Sidecar service.

  ## Parameters
  - prompt: The user's input prompt for image generation.
  """
  def generate_image(prompt) do
    payload = %{prompt: prompt}

    case Req.post(@sidecar_image_url, json: payload) do
      {:ok, %Req.Response{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Req.Response{status: status, body: body}} ->
        Logger.error("Sidecar image generation error #{status}: #{inspect(body)}")
        {:error, "Sidecar image generation failed with status #{status}"}

      {:error, exception} ->
        Logger.error("Sidecar image generation connection failed: #{inspect(exception)}")
        {:error, "Failed to connect to Sidecar for image generation"}
    end
  end

  @doc """
  Generates a story by delegating to the Sidecar service.

  ## Parameters
  - prompt: The user's input prompt.
  - history: (Optional) List of previous messages `[%{role: "model", message: "..."}, ...]`.
  """
  def generate_story(prompt, history \\ [], system_prompt \\ nil) do
    payload = %{
      prompt: prompt,
      history: history,
      systemPrompt: system_prompt
    }

    # Filter out nil values
    payload =
      payload
      |> Map.filter(fn {_, v} -> not is_nil(v) end)

    case Req.post(@sidecar_url, json: payload) do
      {:ok, %Req.Response{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %Req.Response{status: status, body: body}} ->
        Logger.error("Sidecar error #{status}: #{inspect(body)}")
        {:error, "Sidecar failed with status #{status}"}

      {:error, exception} ->
        Logger.error("Sidecar connection failed: #{inspect(exception)}")
        {:error, "Failed to connect to Sidecar"}
    end
  end
end
