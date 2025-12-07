# Gemini Story Generator

A TypeScript application that uses Google's Gemini AI to generate chaotic, humorous, and nonsensical stories about evil flowers (and other oddities).

## Prerequisites

- **Node.js**: v18 or higher recommended.
- **pnpm**: This project uses pnpm for package management.
- **Gemini API Key**: You need an API key from [Google AI Studio](https://aistudio.google.com/).

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd gemini-key
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

## Configuration

1.  **Environment Variables:**
    Create a `.env` file in the root directory. You can copy the structure from the example below.

    **File:** `.env`
    ```properties
    GEMINI_API_KEY=your_actual_api_key_here
    # Optional: Set to true to always show token usage
    # VERBOSE_TOKEN=true
    ```

## Usage

### Run the Story Generator
To generate a story using the default prompt:

```bash
pnpm start
# OR
npx tsx index.ts
```

### Check Token Usage/Billing
To see the number of tokens used (prompt, response, and total) for a request, use the `--verbose-token` flag:

```bash
npx tsx index.ts --verbose-token
```

### Development
To run in watch mode:
```bash
pnpm dev
```

### Formatting
This project uses Prettier. To format code:
```bash
npx prettier --write .
```
