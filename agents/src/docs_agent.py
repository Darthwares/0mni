"""Documentation agent for generating and maintaining technical documentation."""

from typing import Any
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from .base_agent import BaseAgent, AgentCapability, TaskInput


class DocumentationResult(BaseModel):
    """Result of documentation generation."""

    content: str = Field(description="Generated documentation content")
    format_type: str = Field(
        default="markdown", description="Format of the documentation (markdown/rst/html)"
    )
    sections: list[str] = Field(
        default_factory=list, description="Section headings included"
    )
    completeness_score: float = Field(
        default=1.0,
        description="Documentation completeness score from 0-1",
        ge=0.0,
        le=1.0,
    )
    suggestions: list[str] = Field(
        default_factory=list, description="Suggestions for improvement"
    )
    confidence: float = Field(default=1.0, description="Confidence in output (0-1)")


class DocsAgent(BaseAgent):
    """AI agent specialized in technical documentation.

    The DocsAgent can:
    - Generate API documentation from code
    - Write user guides and tutorials
    - Create README files
    - Maintain changelog entries
    - Document system architecture
    - Generate code comments and docstrings
    """

    def __init__(self, **kwargs):
        """Initialize the documentation agent."""
        capabilities = [
            AgentCapability(
                name="API Documentation",
                description="Generate comprehensive API documentation",
                examples=[
                    "Document REST API endpoints",
                    "Create SDK reference documentation",
                    "Generate OpenAPI/Swagger specs",
                    "Document GraphQL schemas",
                ],
            ),
            AgentCapability(
                name="User Guides",
                description="Create user-friendly guides and tutorials",
                examples=[
                    "Write getting started guides",
                    "Create step-by-step tutorials",
                    "Document common workflows",
                    "Generate troubleshooting guides",
                ],
            ),
            AgentCapability(
                name="Code Documentation",
                description="Generate code comments and docstrings",
                examples=[
                    "Write function/method documentation",
                    "Create module-level documentation",
                    "Generate inline code comments",
                    "Document complex algorithms",
                ],
            ),
            AgentCapability(
                name="Architecture Documentation",
                description="Document system design and architecture",
                examples=[
                    "Create architecture diagrams (Mermaid)",
                    "Document system components",
                    "Explain design decisions",
                    "Map data flows and dependencies",
                ],
            ),
            AgentCapability(
                name="Changelog Management",
                description="Maintain version history and release notes",
                examples=[
                    "Generate changelog entries",
                    "Write release notes",
                    "Document breaking changes",
                    "Track feature additions",
                ],
            ),
        ]

        super().__init__(
            agent_id="docs_agent",
            name="Documentation Agent",
            capabilities=capabilities,
            **kwargs,
        )

    async def execute_task(self, task: TaskInput) -> Any:
        """Execute a documentation task.

        Args:
            task: The task containing documentation requirements

        Returns:
            DocumentationResult with generated content
        """
        task_type = task.context.get("task_type", "general")

        if task_type == "api_docs":
            return await self._generate_api_docs(task)
        elif task_type == "user_guide":
            return await self._generate_user_guide(task)
        elif task_type == "code_comments":
            return await self._generate_code_comments(task)
        elif task_type == "architecture":
            return await self._document_architecture(task)
        elif task_type == "changelog":
            return await self._generate_changelog(task)
        elif task_type == "readme":
            return await self._generate_readme(task)
        else:
            # General documentation task
            return await self._handle_general_task(task)

    async def _generate_api_docs(self, task: TaskInput) -> DocumentationResult:
        """Generate API documentation."""
        api_data = task.context.get("api", {})
        code_snippet = task.context.get("code", "")

        system_prompt = """You are an AI documentation agent specializing in API documentation.

Your responsibilities:
1. Document API endpoints comprehensively
2. Include request/response examples
3. Document all parameters and return types
4. Note error conditions and status codes
5. Provide usage examples in multiple languages when relevant

Documentation Structure:
- Endpoint name and description
- HTTP method and path
- Authentication requirements
- Request parameters (path, query, body)
- Response format and status codes
- Error handling
- Code examples
- Rate limits or usage notes

Response Format:
CONTENT:
[Your generated documentation in Markdown]

SECTIONS:
- [Section 1]
- [Section 2]

COMPLETENESS_SCORE: [0.0-1.0]

SUGGESTIONS:
- [Suggestion 1]

CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

API Information:
- Endpoint: {api_data.get('endpoint', 'Unknown')}
- Method: {api_data.get('method', 'Unknown')}
- Description: {api_data.get('description', 'Not provided')}
- Parameters: {api_data.get('parameters', 'Not specified')}

Code/Schema:
{code_snippet[:3000] if code_snippet else 'Not provided'}

Please generate comprehensive API documentation following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_documentation_response(response.content)

    async def _generate_user_guide(self, task: TaskInput) -> DocumentationResult:
        """Generate user guide or tutorial."""
        feature_data = task.context.get("feature", {})
        target_audience = task.context.get("audience", "general users")

        system_prompt = """You are an AI documentation agent specializing in user-facing documentation.

Your responsibilities:
1. Write clear, accessible guides for end users
2. Use simple language and explain technical concepts
3. Include step-by-step instructions
4. Provide screenshots or diagrams descriptions
5. Anticipate common questions and issues

Documentation Guidelines:
- Start with prerequisites and setup
- Use numbered steps for procedures
- Include examples and use cases
- Provide troubleshooting tips
- End with next steps or related topics

Tone:
- Clear and concise
- Friendly and approachable
- Avoid jargon unless necessary
- Use active voice

Response Format:
CONTENT:
[Your generated user guide in Markdown]

SECTIONS:
- [Section 1]
- [Section 2]

COMPLETENESS_SCORE: [0.0-1.0]

SUGGESTIONS:
- [Suggestion 1]

CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Feature/Topic: {feature_data.get('name', 'Unknown')}
Description: {feature_data.get('description', 'Not provided')}
Target Audience: {target_audience}
Key Points to Cover: {feature_data.get('key_points', 'Not specified')}

Please generate a user guide following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_documentation_response(response.content)

    async def _generate_code_comments(self, task: TaskInput) -> DocumentationResult:
        """Generate code comments and docstrings."""
        code = task.context.get("code", "")
        language = task.context.get("language", "python")

        system_prompt = """You are an AI documentation agent specializing in code documentation.

Your responsibilities:
1. Write clear, concise docstrings/comments
2. Document function parameters and return values
3. Explain complex logic and algorithms
4. Note important edge cases or limitations
5. Follow language-specific conventions

Documentation Standards:
- Python: Use Google/NumPy style docstrings
- JavaScript/TypeScript: Use JSDoc format
- Rust: Use /// doc comments
- Be descriptive but concise
- Document the "why" not just the "what"

Response Format:
CONTENT:
[Your generated documentation/comments]

COMPLETENESS_SCORE: [0.0-1.0]

SUGGESTIONS:
- [Suggestion 1]

CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Language: {language}

Code to Document:
{code[:4000]}

Please generate appropriate code documentation following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_documentation_response(response.content)

    async def _document_architecture(self, task: TaskInput) -> DocumentationResult:
        """Document system architecture."""
        system_data = task.context.get("system", {})

        system_prompt = """You are an AI documentation agent specializing in architecture documentation.

Your responsibilities:
1. Document system components and their relationships
2. Create architecture diagrams using Mermaid syntax
3. Explain design decisions and trade-offs
4. Document data flows and dependencies
5. Provide deployment and scaling considerations

Documentation Structure:
- Overview and purpose
- Component diagram (Mermaid)
- Component descriptions
- Data flow diagrams
- Technology stack
- Design decisions and rationale
- Deployment architecture
- Security considerations

Response Format:
CONTENT:
[Your architecture documentation with Mermaid diagrams]

SECTIONS:
- [Section 1]

COMPLETENESS_SCORE: [0.0-1.0]

SUGGESTIONS:
- [Suggestion 1]

CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

System Information:
- Name: {system_data.get('name', 'Unknown')}
- Purpose: {system_data.get('purpose', 'Not provided')}
- Components: {system_data.get('components', 'Not specified')}
- Tech Stack: {system_data.get('tech_stack', 'Not specified')}

Please generate architecture documentation following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_documentation_response(response.content)

    async def _generate_changelog(self, task: TaskInput) -> DocumentationResult:
        """Generate changelog entry."""
        changes = task.context.get("changes", [])
        version = task.context.get("version", "")

        system_prompt = """You are an AI documentation agent specializing in changelog management.

Your responsibilities:
1. Create clear, scannable changelog entries
2. Categorize changes appropriately
3. Highlight breaking changes
4. Follow Keep a Changelog format
5. Use imperative mood for entries

Changelog Categories:
- Added: New features
- Changed: Changes in existing functionality
- Deprecated: Soon-to-be removed features
- Removed: Removed features
- Fixed: Bug fixes
- Security: Security-related changes

Response Format:
CONTENT:
[Your changelog entry in Markdown]

COMPLETENESS_SCORE: [0.0-1.0]

CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Version: {version}
Changes:
{changes}

Please generate a changelog entry following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_documentation_response(response.content)

    async def _generate_readme(self, task: TaskInput) -> DocumentationResult:
        """Generate README file."""
        project_data = task.context.get("project", {})

        system_prompt = """You are an AI documentation agent specializing in README files.

Your responsibilities:
1. Create comprehensive, professional READMEs
2. Include all essential sections
3. Use clear, engaging language
4. Provide quick start instructions
5. Add badges and visual elements where appropriate

README Structure:
- Project title and description
- Badges (build, coverage, version, etc.)
- Features/Key highlights
- Installation/Quick start
- Usage examples
- Configuration
- API reference or documentation links
- Contributing guidelines
- License
- Acknowledgments

Response Format:
CONTENT:
[Your README in Markdown]

SECTIONS:
- [Section 1]

COMPLETENESS_SCORE: [0.0-1.0]

SUGGESTIONS:
- [Suggestion 1]

CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Project Information:
- Name: {project_data.get('name', 'Unknown')}
- Description: {project_data.get('description', 'Not provided')}
- Tech Stack: {project_data.get('tech_stack', 'Not specified')}
- Features: {project_data.get('features', 'Not specified')}
- License: {project_data.get('license', 'Not specified')}

Please generate a comprehensive README following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_documentation_response(response.content)

    async def _handle_general_task(self, task: TaskInput) -> DocumentationResult:
        """Handle general documentation tasks."""
        system_prompt = """You are an AI documentation agent for the Omni platform.

Your responsibilities:
1. Generate clear, comprehensive documentation
2. Follow best practices for technical writing
3. Ensure accuracy and completeness
4. Make documentation accessible to the target audience

Response Format:
CONTENT:
[Your documentation]

COMPLETENESS_SCORE: [0.0-1.0]

CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Context: {task.context if task.context else 'None'}

Please provide documentation following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_documentation_response(response.content)

    def _parse_documentation_response(self, response: str) -> DocumentationResult:
        """Parse LLM response into structured documentation result."""
        lines = response.strip().split("\n")

        content = ""
        sections = []
        completeness_score = 0.9
        suggestions = []
        confidence = 0.9

        current_section = None

        for line in lines:
            line_stripped = line.strip()

            if line_stripped.startswith("CONTENT:"):
                current_section = "content"
                # Get content after CONTENT: if on same line
                content_start = line_stripped.split(":", 1)[1].strip()
                if content_start:
                    content = content_start
            elif line_stripped.startswith("SECTIONS:"):
                current_section = "sections"
            elif line_stripped.startswith("COMPLETENESS_SCORE:"):
                try:
                    completeness_score = float(line_stripped.split(":", 1)[1].strip())
                    completeness_score = max(0.0, min(1.0, completeness_score))
                except ValueError:
                    completeness_score = 0.9
                current_section = None
            elif line_stripped.startswith("SUGGESTIONS:"):
                current_section = "suggestions"
            elif line_stripped.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line_stripped.split(":", 1)[1].strip())
                except ValueError:
                    confidence = 0.9
                current_section = None
            elif current_section == "content":
                # Check if we've hit another section marker
                if not line_stripped.startswith(("SECTIONS:", "COMPLETENESS_SCORE:", "SUGGESTIONS:", "CONFIDENCE:")):
                    if content:
                        content += "\n" + line
                    else:
                        content = line
                else:
                    # We've hit a new section, handle it
                    if line_stripped.startswith("SECTIONS:"):
                        current_section = "sections"
                    elif line_stripped.startswith("COMPLETENESS_SCORE:"):
                        try:
                            completeness_score = float(line_stripped.split(":", 1)[1].strip())
                            completeness_score = max(0.0, min(1.0, completeness_score))
                        except ValueError:
                            completeness_score = 0.9
                        current_section = None
                    elif line_stripped.startswith("SUGGESTIONS:"):
                        current_section = "suggestions"
                    elif line_stripped.startswith("CONFIDENCE:"):
                        try:
                            confidence = float(line_stripped.split(":", 1)[1].strip())
                        except ValueError:
                            confidence = 0.9
                        current_section = None
            elif current_section == "sections" and line_stripped.startswith("-"):
                sections.append(line_stripped[1:].strip())
            elif current_section == "suggestions" and line_stripped.startswith("-"):
                suggestions.append(line_stripped[1:].strip())

        # If no content found via structured format, use entire response
        if not content:
            content = response.strip()

        return DocumentationResult(
            content=content.strip(),
            format_type="markdown",
            sections=sections,
            completeness_score=completeness_score,
            suggestions=suggestions,
            confidence=confidence,
        )
