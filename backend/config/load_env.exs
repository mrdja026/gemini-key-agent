import Config

# Load .env file from parent directory if it exists
env_path = Path.join([File.cwd!(), "..", ".env"])
if File.exists?(env_path) do
  File.stream!(env_path)
  |> Stream.map(&String.trim/1)
  |> Stream.reject(&(&1 == "" or String.starts_with?(&1, "#")))
  |> Enum.each(fn line ->
    case String.split(line, "=", parts: 2) do
      [key, value] -> System.put_env(key, String.trim(value))
      _ -> :ok
    end
  end)
end

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# %% End of auto-generated comment, continuing with existing file content...
