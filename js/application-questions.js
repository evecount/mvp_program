/**
 * Mamba MVP — the founder application.
 *
 * Edit questions here. The form (js/apply.js) renders straight from this file.
 * If you add, remove or rename a field id, update the allowlist in
 * firestore.rules to match — the database rejects any field it does not know.
 *
 * q01–q18 are Venture Partner James Sun's partner-interview questions; `hint`
 * is what the panel is looking for, shown under each question.
 */
window.MVP_APPLICATION = {
  cohort: { label: "2026 Intake", program: "Mamba Venture Program", location: "Singapore" },

  steps: [
    {
      id: "about",
      title: "About you",
      intro: "Who you are and what you are building. We only use these details to review your application and reply.",
      fields: [
        { id: "fullName", label: "Full name", kind: "text", required: true, max: 200, autocomplete: "name" },
        { id: "email", label: "Email", kind: "email", required: true, max: 320, autocomplete: "email", placeholder: "you@company.com" },
        { id: "phone", label: "Mobile", kind: "tel", required: true, max: 32, autocomplete: "tel", placeholder: "+65 …" },
        { id: "linkedin", label: "LinkedIn", kind: "url", max: 500, placeholder: "https://linkedin.com/in/…" },
        { id: "startupName", label: "Company or working name", kind: "text", required: true, max: 120 },
        { id: "website", label: "Website or demo link", kind: "url", max: 500, placeholder: "https://…" },
      ],
    },
    {
      id: "stage",
      title: "Your stage and track",
      intro: "MVP is built for people starting from industry insight, an idea or an early prototype. There is no wrong answer here.",
      fields: [
        {
          id: "applicantType",
          label: "Which best describes you?",
          kind: "select",
          required: true,
          options: ["Working professional", "SME owner", "Aspiring founder", "Startup founder"],
        },
        {
          id: "stage",
          label: "Where is the venture today?",
          kind: "select",
          required: true,
          options: [
            "Industry insight, no product yet",
            "An idea I have started validating",
            "An early prototype",
            "Launched, with users or revenue",
          ],
        },
        {
          id: "intake",
          label: "Which intake are you applying for?",
          kind: "select",
          required: true,
          options: ["1-month accelerated sprint", "3-month full venture build", "Not sure yet"],
        },
      ],
    },
    {
      id: "founder",
      title: "You and the problem",
      fields: [
        { id: "q01", label: "Tell us about yourself and why you want to build this company.", hint: "Motivation, founder-market fit, credibility." },
        { id: "q02", label: "What problem are you trying to solve, and who specifically has this problem?", hint: "Clarity of thinking and customer understanding." },
        { id: "q03", label: "Why do you believe this is a real problem worth solving? What have you personally observed?", hint: "Genuine insight vs. an idea generated in isolation." },
      ],
    },
    {
      id: "customers",
      title: "Validation and customers",
      fields: [
        { id: "q04", label: "What have you done so far to validate the problem with potential customers?", hint: "Evidence, customer conversations, initiative." },
        { id: "q06", label: "What are customers doing today instead of using your solution?", hint: "Understanding of alternatives and competition." },
        { id: "q07", label: "Who would be your first 10 customers, and how would you reach them?", hint: "Go-to-market thinking and specificity." },
      ],
    },
    {
      id: "product",
      title: "Product and business model",
      fields: [
        { id: "q05", label: "Explain your solution to us in 60 seconds without using technical jargon.", hint: "Ability to communicate the value proposition.", max: 800 },
        { id: "q08", label: "Who pays you, what would they pay for, and how do you eventually make money?", hint: "Commercial awareness." },
        { id: "q12", label: "Where could technology or AI create a meaningful advantage in your business rather than simply being an add-on?", hint: "Technology thinking without forcing “AI”." },
      ],
    },
    {
      id: "execution",
      title: "Execution and team",
      fields: [
        { id: "q09", label: "If we gave you no additional funding for the next 90 days, what could you realistically build and test?", hint: "Resourcefulness and MVP mentality." },
        {
          id: "q10",
          label: "How much time can you realistically commit to the venture during the program?",
          hint: "Actual availability and seriousness.",
          kind: "select",
          options: [
            "Full-time: 40+ hours a week",
            "25–40 hours a week",
            "10–25 hours a week",
            "Under 10 hours a week",
          ],
        },
        { id: "q11", label: "What can you personally execute today, and what capabilities are missing from your team?", hint: "Self-awareness and team gaps." },
      ],
    },
    {
      id: "mindset",
      title: "Mindset",
      fields: [
        { id: "q13", label: "Tell us about an assumption you had about this business that you've already discovered might be wrong.", hint: "Intellectual honesty and adaptability." },
        { id: "q14", label: "What would make you abandon or significantly change this idea?", hint: "Evidence-based decision making rather than attachment." },
        { id: "q15", label: "If this works, what does this company look like three years from now?", hint: "Scale of ambition and vision." },
      ],
    },
    {
      id: "fit",
      title: "Fit with Mamba MVP",
      fields: [
        { id: "q16", label: "What is the single biggest thing stopping you from moving this business forward today?", hint: "Whether Mamba can genuinely help." },
        { id: "q17", label: "What would success look like for you at the end of the Mamba MVP program?", hint: "Clear outcomes and realistic expectations." },
        { id: "q18", label: "Why Mamba MVP, and what do you expect from us that you cannot easily do yourself?", hint: "Program fit and expectations." },
        {
          id: "howHeard",
          label: "How did you hear about Mamba MVP?",
          kind: "select",
          required: false,
          options: ["LinkedIn or X", "Referred by someone", "Event or meetup", "School or university", "Search", "Other"],
        },
        {
          id: "consent",
          label: "I confirm these answers are my own and accurate, and I agree to the Mamba Venture Program team reviewing them for the 2026 intake.",
          kind: "checkbox",
          required: true,
        },
      ],
    },
  ],

  /* Defaults applied to the interview questions (q01–q18) unless a field overrides them. */
  questionDefaults: { kind: "textarea", required: true, min: 40, max: 1500 },
};
