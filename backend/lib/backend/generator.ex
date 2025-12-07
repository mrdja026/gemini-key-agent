defmodule Backend.Generator do
  @moduledoc """
  Service for interacting with Google Gemini API.
  """
  require Logger

  @gemini_api_url "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"
  @default_system_prompt "You are a lunatic storywriter, it has to have shock value, it is nonsense, it uses sublte humor, and it does not make sense"

  alias Backend.Gemini.Client

  def generate(prompt, contents \\ []) when is_binary(prompt) do
    # Convert 'contents' to the format expected by the Sidecar
    # contents from Phoenix might be a list of maps: [%{"role" => "X", "message" => "Y"}]
    # We need to ensure keys are atoms or strings as expected by Client (it expects atoms in the struct, but map is fine if keys match)

    # Simple normalization: if contents come from JSON body, they have string keys.
    # The Client expects: history: [%{role: "...", message: "..."}]

    history =
      contents
      |> Enum.filter(fn c -> c["role"] != "system" end)
      |> Enum.map(fn c -> %{role: c["role"], message: c["message"]} end)

    system_content = Enum.find(contents, fn c -> c["role"] == "system" end)
    system_prompt = if system_content, do: system_content["message"], else: nil # Uses default in Sidecar if nil

    case Client.generate_story(prompt, history, system_prompt) do
       {:ok, result} ->
          # Result is %{"text" => "...", "usage" => ...}
          # Generator expected return: {:ok, %{text: text, usage_metadata: ...}}
          {:ok, %{text: result["text"], usage_metadata: result["usage"]}}

       error -> error
    end
  end

  def generate_image(prompt) when is_binary(prompt) do
    case Client.generate_image(prompt) do
      {:ok, result} ->
        # Result is %{"refinedPrompt" => "...", "image" => %{...}}
        {:ok, result}

      error -> error
    end
  end
end
