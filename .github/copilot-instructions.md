# Coding Guidelines

You are a senior software engineer working on the MMSP project.

## Project Overview

MMSP, the Model Message Stream Protocol: one message format and one streaming grammar for every model provider, in Python and TypeScript.

### Repository Structure

- `src_py/` - Python implementation
  - `mmsp/` - Main Python package
  - `pyproject.toml` - Python project configuration
  - `Makefile` - Python build and test commands
  - `tests/` - Python test files

- `src_ts/` - TypeScript implementation
  - `src/` - TypeScript source files
  - `package.json` - Node.js package configuration
  - `tsconfig.json` - TypeScript compiler configuration
  - `Makefile` - TypeScript build and test commands
  - `tests/` - TypeScript test files

- `site/` - The site at mmsp.penguin.ooo (Astro): the overview page, the documentation, and the sources of the artwork in `.github/images/`

- `llmsdk_docs/` - **Reference documentation for AI model SDKs**
  - See this directory for detailed development guidelines and code conventions

## Coding Standards

### General Code Quality

- **Avoid trivial comments**: Do not add comments that simply restate what the code obviously does. Comments should explain *why* something is done, not *what* is being done when it's already clear from the code itself.
  - ❌ Bad: `# Add temperature` before `config['temperature'] = 0.7`
  - ❌ Bad: `# Loop through items` before `for item in items:`
  - ✅ Good: `# Workaround: Claude requires max_tokens to be specified` before `config['max_tokens'] = 1000`
  - ✅ Good: Comments explaining complex algorithms, non-obvious business logic, or workarounds for known issues

### Python

- Follow the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- Maintain Python 3.11+ compatibility
- Run `make lint` and `make test` from `src_py/` before committing

### TypeScript

- Use ESLint for code quality
- Follow TypeScript strict mode conventions
- Run `make lint` and `make test` from `src_ts/` before committing

## Implementation Rules

When adding support for new AI models, follow these rules:

1. A client is named by its `client_type`, and `auto_client.py` / `autoClient.ts` create the client that type names from one table. An **official client** per vendor (`openai-official`, `anthropic-official`, `gemini-official`, `zai-official`, `moonshot-official`, `deepseek-official`, `minimax-official`) lives in a folder named after it (`openai_official/`) and serves every generation of that vendor's models; a **compatible client** per wire protocol (`openai-chat`, `openai-responses`, `ant-messages`, ...) serves any endpoint that speaks it.
2. A new generation of a vendor's models goes into the vendor's official client. Inside it, tell generations apart by explicit version (e.g. `"4-6" in self._model`), never by a bare substring like `if "claude" in model.lower()`, and keep the older generations working.
3. Without a `client_type`, the family a model id begins with (`gpt-`, `claude-`, `gemini-`, `glm-`, `kimi-`, `deepseek-`, `minimax-`) names its official client; an id of no known family raises and asks for a `client_type`. A new vendor adds its family to that table. **DO NOT** add any other routing rule on model ids.
4. **DO NOT** create new files or directories in examples and tests when adding a new model, use test function parameters or environment variables instead.
5. **Always** consult the [llmsdk_docs/README.md](../llmsdk_docs/README.md) for AI model SDK usage details.

When adding new functionality, follow these rules:

1. **DO NOT** create new example files unless the user explicitly requests them.
2. When making changes, by default synchronize updates to both Python and TypeScript implementations unless the user explicitly specifies otherwise.
3. When using JSON serialization, ensure that CJK strings are serialized correctly by using `ensure_ascii=False`.
4. **DO NOT** use the `requests` library in code. Always use `httpx` with async methods (`httpx.AsyncClient()`) to avoid blocking the global event loop.
5. **DO NOT** modify files under `llmsdk_docs/` unless the user explicitly requests changes to reference SDK documentation.
6. **DO NOT** add unit test functions or dedicated test suites for a single specific model; use existing parameterized tests, model capability flags, or environment-driven coverage instead.

When writing documentation, follow these rules:

1. Always provide clear and concise documentation.
2. **DO NOT** include unnecessary details in the documentation.
3. Ensure that the documentation is accurate and up-to-date.
4. Remember to update the documentation whenever changes are made to the code.

## GitHub Workflow Secrets for Testing

When writing tests that require calling AI models, the following secrets are available in GitHub workflows:

- `ANTHROPIC_API_KEY` - API key for Anthropic Claude Models
- `GEMINI_API_KEY` - API key for Google Gemini Models
- `OPENAI_API_KEY` - API key for OpenAI GPT Models
- `ZAI_API_KEY` - API key for Z.AI GLM Models
- `MOONSHOT_API_KEY` - API key for MoonShot Kimi Models
- `MINIMAX_API_KEY` - API key or Token Plan Subscription Key for MiniMax Models
- `DEEPSEEK_API_KEY` - API key for DeepSeek Models
- `MODELVERSE_API_KEY` - API key for ModelVerse Models
- `OPENROUTER_API_KEY` - API key for OpenRouter Models
- `SILICONFLOW_API_KEY` - API key for SiliconFlow Models
- `BEDROCK_API_KEY` - API key for Amazon Bedrock Models
- `VERTEX_API_KEY` - API key for Google Vertex AI Models

To use these secrets in your workflow files, reference them in the `env:` section:

```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  ZAI_API_KEY: ${{ secrets.ZAI_API_KEY }}
  MOONSHOT_API_KEY: ${{ secrets.MOONSHOT_API_KEY }}
  MINIMAX_API_KEY: ${{ secrets.MINIMAX_API_KEY }}
  DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
  MODELVERSE_API_KEY: ${{ secrets.MODELVERSE_API_KEY }}
  OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  SILICONFLOW_API_KEY: ${{ secrets.SILICONFLOW_API_KEY }}
  BEDROCK_API_KEY: ${{ secrets.BEDROCK_API_KEY }}
  VERTEX_API_KEY: ${{ secrets.VERTEX_API_KEY }}
```

These secrets can be used in your test code to authenticate with the respective AI model providers. Make sure to handle these credentials securely and never log or expose them in test output.
