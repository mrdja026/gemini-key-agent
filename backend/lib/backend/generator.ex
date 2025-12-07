defmodule Backend.Generator do
  @moduledoc """
  Service for interacting with Google Gemini API.
  """
  require Logger

  @gemini_api_url "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"
  @default_system_prompt "You are a lunatic storywriter, it has to have shock value, it is nonsense, it uses sublte humor, and it does not make sense"

  def generate(prompt, contents \\ []) when is_binary(prompt) do
    api_key = System.get_env("GEMINI_API_KEY")

    if is_nil(api_key) do
      {:error, "GEMINI_API_KEY not found in environment"}
    else
      payload = build_payload(prompt, contents)

      Req.post(@gemini_api_url,
        params: [key: api_key],
        json: payload
      )
      |> handle_response()
    end
  end

  defp build_payload(prompt, contents) do
    # Extract system prompt if present in contents with role="system"
    # Otherwise use default
    {system_instruction_parts, history_parts} =
      Enum.split_with(contents, fn content -> content["role"] == "system" end)

    system_text =
      case system_instruction_parts do
        [] -> @default_system_prompt
        parts ->
          # Combine default prompt with any additional system prompts
          @default_system_prompt <> "\n" <>
          (parts |> Enum.map(& &1["message"]) |> Enum.join("\n"))
      end

    # Format history parts for API
    formatted_history =
      history_parts
      |> Enum.map(fn content ->
        %{
          role: content["role"],
          parts: [%{text: content["message"]}]
        }
      end)

    # Add the current user prompt
    current_prompt = %{
      role: "user",
      parts: [%{text: prompt}]
    }

    %{
      contents: formatted_history ++ [current_prompt],
      systemInstruction: %{
        parts: [%{text: system_text}]
      }
    }
  end

  defp handle_response({:ok, %Req.Response{status: 200, body: body}}) do
    try do
      candidates = body["candidates"]
      first_candidate = List.first(candidates)
      content = first_candidate["content"]
      parts = content["parts"]
      text = List.first(parts)["text"]

      usage_metadata = body["usageMetadata"]

      {:ok, %{text: text, usage_metadata: usage_metadata}}
    rescue
      e ->
        Logger.error("Failed to parse Gemini response: #{inspect(e)}")
        {:error, "Failed to parse API response"}
    end
  end

  defp handle_response({:ok, %Req.Response{status: status, body: body}}) do
    Logger.error("Gemini API error (Status #{status}): #{inspect(body)}")
    {:error, "Gemini API returned status #{status}"}
  end

  defp handle_response({:error, exception}) do
    Logger.error("Gemini API request failed: #{inspect(exception)}")
    {:error, "Request failed"}
  end
end
