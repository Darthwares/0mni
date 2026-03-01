"""Recruiter agent for candidate screening and interview management."""

from typing import Any
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from .base_agent import BaseAgent, AgentCapability, TaskInput


class CandidateScreeningResult(BaseModel):
    """Result of candidate screening analysis."""

    match_score: float = Field(
        description="Candidate-job match score from 0-1",
        ge=0.0,
        le=1.0,
    )
    recommended_action: str = Field(
        description="Recommended next action (interview, review, reject)"
    )
    strengths: list[str] = Field(
        default_factory=list, description="Key candidate strengths"
    )
    concerns: list[str] = Field(
        default_factory=list, description="Potential concerns or gaps"
    )
    reasoning: str = Field(description="Explanation of the screening decision")
    confidence: float = Field(default=1.0, description="Confidence in assessment (0-1)")


class InterviewResponse(BaseModel):
    """Response for interview-related tasks."""

    message: str = Field(description="Response message or recommendation")
    suggested_questions: list[str] = Field(
        default_factory=list, description="Recommended interview questions"
    )
    next_steps: list[str] = Field(
        default_factory=list, description="Recommended next steps"
    )
    confidence: float = Field(default=1.0, description="Confidence in this response (0-1)")


class RecruiterAgent(BaseAgent):
    """AI agent specialized in recruitment operations.

    The RecruiterAgent can:
    - Screen resumes against job requirements
    - Score candidate-job fit
    - Generate interview questions
    - Schedule and coordinate interviews
    - Provide hiring recommendations
    - Draft candidate communications
    """

    def __init__(self, **kwargs):
        """Initialize the recruiter agent."""
        capabilities = [
            AgentCapability(
                name="Candidate Screening",
                description="Screen and evaluate candidate applications",
                examples=[
                    "Analyze resume against job requirements",
                    "Score candidate-job fit",
                    "Identify top candidates for review",
                    "Flag missing qualifications",
                ],
            ),
            AgentCapability(
                name="Interview Management",
                description="Coordinate and optimize interview process",
                examples=[
                    "Generate role-specific interview questions",
                    "Schedule interview rounds",
                    "Coordinate with interviewers",
                    "Compile interview feedback",
                ],
            ),
            AgentCapability(
                name="Candidate Communication",
                description="Draft professional candidate communications",
                examples=[
                    "Write initial outreach messages",
                    "Draft interview invitations",
                    "Compose rejection letters",
                    "Create offer letters",
                ],
            ),
            AgentCapability(
                name="Hiring Recommendations",
                description="Provide data-driven hiring decisions",
                examples=[
                    "Compare candidates across criteria",
                    "Recommend hire/no-hire decisions",
                    "Identify compensation ranges",
                    "Assess cultural fit",
                ],
            ),
        ]

        super().__init__(
            agent_id="recruiter_agent",
            name="Recruiter Agent",
            capabilities=capabilities,
            **kwargs,
        )

    async def execute_task(self, task: TaskInput) -> Any:
        """Execute a recruitment task.

        Args:
            task: The task containing candidate/job info

        Returns:
            CandidateScreeningResult or InterviewResponse depending on task type
        """
        task_type = task.context.get("task_type", "general")

        if task_type == "candidate_screening":
            return await self._screen_candidate(task)
        elif task_type == "interview_prep":
            return await self._prepare_interview(task)
        elif task_type == "candidate_communication":
            return await self._draft_communication(task)
        else:
            # General recruitment task
            return await self._handle_general_task(task)

    async def _screen_candidate(self, task: TaskInput) -> CandidateScreeningResult:
        """Screen a candidate against job requirements."""
        candidate_data = task.context.get("candidate", {})
        job_data = task.context.get("job", {})

        system_prompt = """You are an AI recruitment agent specializing in candidate screening.

Your responsibilities:
1. Analyze candidate qualifications against job requirements
2. Score candidate-job fit on a scale of 0-1
3. Identify key strengths and potential concerns
4. Recommend next actions (interview, review, reject)
5. Provide clear, unbiased reasoning

Evaluation Criteria:
- Required skills and experience match
- Years of experience and seniority level
- Education and certifications
- Cultural and values alignment indicators
- Career progression and stability
- Communication quality (from resume/cover letter)

Avoid Bias:
- Focus on job-relevant qualifications only
- Ignore protected characteristics
- Use objective, measurable criteria
- Consider diverse backgrounds and experiences

Response Format:
MATCH_SCORE: [0.0-1.0]
ACTION: [interview/review/reject]
STRENGTHS:
- [Strength 1]
- [Strength 2]
CONCERNS:
- [Concern 1]
- [Concern 2]
REASONING: [Your detailed analysis]
CONFIDENCE: [0.0-1.0]

Example:
MATCH_SCORE: 0.82
ACTION: interview
STRENGTHS:
- 5+ years Python/React experience exceeds requirements
- Strong background in distributed systems
- Clear communication in application materials
CONCERNS:
- Limited experience with SpacetimeDB specifically
- Career gap in 2024 (may need clarification)
REASONING: Strong technical background with relevant experience. Minor gaps can be addressed in interview. Recommend phone screen to assess real-time problem solving.
CONFIDENCE: 0.85
"""

        user_prompt = f"""Task: {task.description}

Job Requirements:
- Role: {job_data.get('title', 'Unknown')}
- Department: {job_data.get('department', 'Unknown')}
- Required Skills: {job_data.get('required_skills', 'Not specified')}
- Experience Level: {job_data.get('experience_level', 'Not specified')}
- Description: {job_data.get('description', 'Not provided')}

Candidate Profile:
- Name: {candidate_data.get('name', 'Unknown')}
- Experience: {candidate_data.get('experience_years', 'Unknown')} years
- Current Title: {candidate_data.get('current_title', 'Unknown')}
- Skills: {candidate_data.get('skills', 'Not listed')}
- Education: {candidate_data.get('education', 'Not provided')}
- Resume Summary: {candidate_data.get('resume_summary', 'Not provided')}

Please provide a candidate screening assessment following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_screening_response(response.content)

    async def _prepare_interview(self, task: TaskInput) -> InterviewResponse:
        """Prepare interview materials and questions."""
        candidate_data = task.context.get("candidate", {})
        job_data = task.context.get("job", {})
        interview_type = task.context.get("interview_type", "technical")

        system_prompt = """You are an AI recruitment agent specializing in interview preparation.

Your responsibilities:
1. Generate role-specific, job-relevant questions
2. Create questions that assess both technical and soft skills
3. Provide interview structure recommendations
4. Suggest evaluation criteria

Interview Question Guidelines:
- Use behavioral (STAR method) questions for soft skills
- Include technical/role-specific questions
- Ask open-ended questions that reveal thinking process
- Avoid yes/no or leading questions
- Ensure questions are legal and unbiased

Response Format:
MESSAGE: [Interview preparation overview]
SUGGESTED_QUESTIONS:
- [Question 1]
- [Question 2]
- [Question 3]
NEXT_STEPS:
- [Step 1]
- [Step 2]
CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Job Information:
- Role: {job_data.get('title', 'Unknown')}
- Department: {job_data.get('department', 'Unknown')}
- Key Skills: {job_data.get('required_skills', 'Not specified')}

Candidate Information:
- Name: {candidate_data.get('name', 'Unknown')}
- Background: {candidate_data.get('resume_summary', 'Not provided')}

Interview Type: {interview_type}

Please generate interview preparation materials following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_interview_response(response.content)

    async def _draft_communication(self, task: TaskInput) -> InterviewResponse:
        """Draft candidate communication."""
        candidate_data = task.context.get("candidate", {})
        communication_type = task.context.get("communication_type", "interview_invite")

        system_prompt = """You are an AI recruitment agent specializing in candidate communications.

Your responsibilities:
1. Draft professional, friendly communications
2. Maintain company brand voice
3. Provide clear next steps and expectations
4. Ensure legal compliance
5. Create positive candidate experience

Communication Types:
- Interview Invite: Include details, agenda, logistics
- Rejection: Professional, encouraging, brief
- Offer Letter: Formal, comprehensive, enthusiastic
- Status Update: Transparent, respectful of candidate's time

Tone Guidelines:
- Professional but warm
- Clear and specific
- Respectful of candidate's time
- Encouraging and positive (even in rejections)

Response Format:
MESSAGE: [Your drafted communication]
NEXT_STEPS:
- [Action item for recruiter]
CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Candidate: {candidate_data.get('name', 'Unknown')}
Communication Type: {communication_type}
Additional Context: {task.context.get('additional_context', 'None')}

Please draft the candidate communication following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_interview_response(response.content)

    async def _handle_general_task(self, task: TaskInput) -> InterviewResponse:
        """Handle general recruitment tasks."""
        system_prompt = """You are an AI recruitment agent for the Omni platform.

Your responsibilities:
1. Provide recruitment insights and recommendations
2. Analyze hiring pipeline data
3. Suggest process improvements
4. Support hiring team with research and analysis

Response Format:
MESSAGE: [Your response]
NEXT_STEPS:
- [Recommended actions]
CONFIDENCE: [0.0-1.0]
"""

        user_prompt = f"""Task: {task.description}

Context: {task.context if task.context else 'None'}

Please provide your recruitment analysis or recommendations following the format specified.
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        return self._parse_interview_response(response.content)

    def _parse_screening_response(self, response: str) -> CandidateScreeningResult:
        """Parse LLM response into structured screening result."""
        lines = response.strip().split("\n")

        match_score = 0.5
        action = "review"
        strengths = []
        concerns = []
        reasoning = ""
        confidence = 0.9

        current_section = None

        for line in lines:
            line = line.strip()
            if line.startswith("MATCH_SCORE:"):
                try:
                    match_score = float(line.split(":", 1)[1].strip())
                    match_score = max(0.0, min(1.0, match_score))
                except ValueError:
                    match_score = 0.5
                current_section = None
            elif line.startswith("ACTION:"):
                action = line.split(":", 1)[1].strip().lower()
                current_section = None
            elif line.startswith("STRENGTHS:"):
                current_section = "strengths"
            elif line.startswith("CONCERNS:"):
                current_section = "concerns"
            elif line.startswith("REASONING:"):
                reasoning = line.split(":", 1)[1].strip()
                current_section = "reasoning"
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                except ValueError:
                    confidence = 0.9
                current_section = None
            elif current_section == "strengths" and line.startswith("-"):
                strengths.append(line[1:].strip())
            elif current_section == "concerns" and line.startswith("-"):
                concerns.append(line[1:].strip())
            elif current_section == "reasoning" and line and not line.startswith(("CONFIDENCE:", "MATCH_SCORE:", "ACTION:")):
                reasoning += " " + line

        # If no reasoning found, use entire response
        if not reasoning:
            reasoning = response.strip()

        return CandidateScreeningResult(
            match_score=match_score,
            recommended_action=action,
            strengths=strengths,
            concerns=concerns,
            reasoning=reasoning,
            confidence=confidence,
        )

    def _parse_interview_response(self, response: str) -> InterviewResponse:
        """Parse LLM response into structured interview response."""
        lines = response.strip().split("\n")

        message = ""
        suggested_questions = []
        next_steps = []
        confidence = 0.9

        current_section = None

        for line in lines:
            line = line.strip()
            if line.startswith("MESSAGE:"):
                message = line.split(":", 1)[1].strip()
                current_section = "message"
            elif line.startswith("SUGGESTED_QUESTIONS:"):
                current_section = "questions"
            elif line.startswith("NEXT_STEPS:"):
                current_section = "next_steps"
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                except ValueError:
                    confidence = 0.9
                current_section = None
            elif current_section == "questions" and line.startswith("-"):
                suggested_questions.append(line[1:].strip())
            elif current_section == "next_steps" and line.startswith("-"):
                next_steps.append(line[1:].strip())
            elif current_section == "message" and line and not line.startswith(("SUGGESTED_QUESTIONS:", "NEXT_STEPS:", "CONFIDENCE:")):
                message += " " + line

        # If no MESSAGE: prefix found, use entire response
        if not message:
            message = response.strip()

        return InterviewResponse(
            message=message,
            suggested_questions=suggested_questions,
            next_steps=next_steps,
            confidence=confidence,
        )
