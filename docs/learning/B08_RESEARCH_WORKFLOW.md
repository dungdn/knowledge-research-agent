# B08 — Research Workflow: Architectural & Learning Reflections

## 1. Key Concepts Mastered
- **Claim-to-Source Traceability (Anti-Hallucination):**
  - Unsubstantiated claims undermine trust in AI research agents.
  - In our architecture, every finding in `keyFindings` is structured as `{ claim, evidence, sourceUrls, confidence }`.
  - The `ResearchSynthesizerService` enforces a strict post-synthesis verification pass: if the model cites a hallucinated URL that was never retrieved during execution, it is caught and corrected against the verified collected sources pool.
- **Transparent Handling of Uncertainty & Contradictions:**
  - A real-world research agent must not fabricate artificial consensus when sources disagree.
  - The report explicitly discloses:
    1. `conflictingInformation`: Delineates divergent perspectives (e.g. Viewpoint A vs Viewpoint B with their respective supporting sources).
    2. `evidenceGaps`: Discloses critical areas where evidence could not be found or verified.
    3. `limitations`: Methodological boundaries (e.g., restricted to public web articles, single process run).
    4. `unresolvedQuestions`: Follow-up avenues for further investigation.
- **End-to-End Pipeline Orchestration:**
  $$\text{Query} \xrightarrow{\text{Planner}} \text{Plan (DAG)} \xrightarrow{\text{Executor}} \text{Steps Execution + Retries/Replan} \xrightarrow{\text{Aggregator}} \text{Evidence Pool} \xrightarrow{\text{Synthesizer}} \text{Verified Report + Markdown}$$
- **Quality Evaluation Rubric (Beyond Subjective Impressions):**
  - Rather than relying on gut feel, `ResearchBenchmark` scores reports out of 100 points across 4 objective criteria:
    1. Structural Completeness (25 pts): Title, summary, findings, sources present.
    2. Evidence Traceability (30 pts): 100% of claims backed by valid, accessible URLs.
    3. Uncertainty & Transparency (25 pts): Explicit disclosure of gaps and limitations.
    4. Source Metadata Richness (20 pts): Domain clarity and retrieval timestamps.
  - Reports scoring $\ge 80$ pass the quality benchmark.

## 2. Answers to B08 Guiding Questions
- **Can each key claim be traced to evidence?**
  - Yes. Each claim explicitly stores the `sourceUrls` and extracted evidence snippet, validated by the synthesizer.
- **Are gaps disclosed?**
  - Yes. Both `evidenceGaps` and `conflictingInformation` are required fields in the report schema, ensuring transparent uncertainty.
- **How do we evaluate report quality beyond subjective impressions?**
  - Via the programmatic `ResearchBenchmark` scoring rubric verifying structure, citation validity, and disclosure criteria automatically.
