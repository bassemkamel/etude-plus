import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma.service";
import type { AuthedUser } from "../common/guards";
import { apiError } from "../common/errors";

type AiSourceFile = {
    name: string;
    mimeType: string;
    data: string;
};

type AiQuestionType = "Exercice" | "QCM" | "Probleme" | "Redaction";
type AiQuestionStatus = "draft" | "published" | "archived";

const AI_QUESTION_TYPES: readonly AiQuestionType[] = ["Exercice", "QCM", "Probleme", "Redaction"];
const AI_QUESTION_STATUSES: readonly AiQuestionStatus[] = ["draft", "published", "archived"];

type AiGeneratedQuestion = {
    question?: string;
    question_text?: string;
    options?: string[];
    answer?: string;
    marks_breakdown?: string;
    topic?: string;
    difficulty?: string;
    type?: string;
    parts?: Array<{ label?: string; text?: string; marks?: number }>;
    mark_schemes?: Array<{ part_label?: string; partLabel?: string; answer?: string; marks_breakdown?: string; marksBreakdown?: string }>;
};

type AiSourceChunk = {
    file: AiSourceFile;
    pageRange: string;
    text: string;
};

type AiPdfPage = {
    pageNumber: number;
    text: string;
};

type AiGenerationJob = {
    userId: string;
    status: "preparing" | "reading" | "generating" | "saving" | "completed" | "failed";
    progress: number;
    message: string;
    currentChunk: number;
    totalChunks: number;
    updatedAt: number;
    result?: unknown;
    error?: string;
};

const aiGenerationJobs = new Map<string, AiGenerationJob>();
let pdfJsPromise: Promise<any> | undefined;

function loadPdfJs() {
    pdfJsPromise ??= new Function("specifier", "return import(specifier)")("pdfjs-dist/legacy/build/pdf.mjs");
    return pdfJsPromise;
}

function cleanExpiredAiJobs() {
    const expiry = Date.now() - 60 * 60 * 1000;
    for (const [id, job] of aiGenerationJobs) {
        if (job.updatedAt < expiry) aiGenerationJobs.delete(id);
    }
}

// Legacy fixed-pages-per-chunk implementation kept as a reference.
// async function splitPdfTextIntoChunks(file: AiSourceFile, pagesPerChunk: number): Promise<AiSourceChunk[]> {
//     const pages: string[] = [];
//     let pageCount: number;
//     try {
//         const pdfjs = await loadPdfJs();
//         const document = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(file.data, "base64")) }).promise;
//         pageCount = document.numPages;
//         for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
//             const page = await document.getPage(pageNumber);
//             const content = await page.getTextContent();
//             let lastY: number | undefined;
//             const text = content.items.map((item: any) => {
//                 const separator = lastY !== undefined && lastY !== item.transform[5] ? "\n" : "";
//                 lastY = item.transform[5];
//                 return `${separator}${item.str}`;
//             }).join("").trim();
//             pages.push(text);
//             page.cleanup();
//         }
//         await document.destroy();
//     } catch {
//         apiError(HttpStatus.BAD_REQUEST, "PDF_INVALID", `Impossible d'extraire le texte du PDF ${file.name}.`);
//     }
//
//     if (!pageCount!) apiError(HttpStatus.BAD_REQUEST, "PDF_EMPTY", `Le PDF ${file.name} ne contient aucune page.`);
//     if (!pages.some((page) => page.length > 0)) {
//         apiError(HttpStatus.UNPROCESSABLE_ENTITY, "PDF_TEXT_UNAVAILABLE", `Aucun texte extractible dans ${file.name}. Ce PDF semble être un scan; une étape OCR est nécessaire pour Ollama.`);
//     }
//
//     const chunks: AiSourceChunk[] = [];
//     for (let start = 0; start < pages.length; start += pagesPerChunk) {
//         const end = Math.min(start + pagesPerChunk, pages.length);
//         const text = pages
//             .slice(start, end)
//             .map((page, index) => `Page ${start + index + 1}:\n${page}`)
//             .join("\n\n");
//         chunks.push({ file, pageRange: `${start + 1}-${end}`, text });
//     }
//     return chunks;
// }

async function extractPdfPages(file: AiSourceFile): Promise<AiPdfPage[]> {
    const pages: AiPdfPage[] = [];
    let document: any;

    try {
        const pdfjs = await loadPdfJs();
        document = await pdfjs.getDocument({ data: new Uint8Array(Buffer.from(file.data, "base64")) }).promise;
    } catch {
        apiError(HttpStatus.BAD_REQUEST, "PDF_INVALID", `Impossible d'extraire le texte du PDF ${file.name}.`);
    }

    if (!document) apiError(HttpStatus.BAD_REQUEST, "PDF_EMPTY", `Le PDF ${file.name} ne contient aucune page.`);

    const pageCount = Number(document.numPages ?? 0);
    if (pageCount === 0) apiError(HttpStatus.BAD_REQUEST, "PDF_EMPTY", `Le PDF ${file.name} ne contient aucune page.`);

    try {
        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
            const page = await document.getPage(pageNumber);
            const content = await page.getTextContent();
            let lastY: number | undefined;
            const text = content.items
                .map((item: any) => {
                    const separator = lastY !== undefined && lastY !== item.transform[5] ? "\n" : "";
                    lastY = item.transform[5];
                    return `${separator}${item.str}`;
                })
                .join("")
                .trim();
            pages.push({ pageNumber, text });
            page.cleanup();
        }
    } finally {
        await document.destroy();
    }

    if (!pages.some((page) => page.text.length > 0)) {
        apiError(HttpStatus.UNPROCESSABLE_ENTITY, "PDF_TEXT_UNAVAILABLE", `Aucun texte extractible dans ${file.name}. Ce PDF semble être un scan; une étape OCR est nécessaire pour Ollama.`);
    }

    return pages;
}

function stripJsonFences(text: string) {
    return text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

function extractJsonPayload(text: string) {
    const cleaned = stripJsonFences(text);
    const start = cleaned.search(/[\[{]/);
    if (start < 0) throw new SyntaxError("No JSON object or array found in Ollama response.");

    const closing: string[] = [];
    let inString = false;
    let escaped = false;
    for (let index = start; index < cleaned.length; index++) {
        const character = cleaned[index];
        if (inString) {
            if (escaped) escaped = false;
            else if (character === "\\") escaped = true;
            else if (character === '"') inString = false;
            continue;
        }
        if (character === '"') inString = true;
        else if (character === "{") closing.push("}");
        else if (character === "[") closing.push("]");
        else if (character === "}" || character === "]") {
            if (closing.pop() !== character) throw new SyntaxError("Mismatched JSON brackets in Ollama response.");
            if (!closing.length) return cleaned.slice(start, index + 1);
        }
    }
    throw new SyntaxError("Incomplete JSON in Ollama response.");
}

function isDbSafeText(value: unknown): value is string {
    return typeof value === "string" && !value.includes("\0");
}

function isAiGeneratedQuestion(value: unknown): value is AiGeneratedQuestion {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const candidate = value as Record<string, unknown>;
    const optionalStringFields = ["question", "question_text", "answer", "marks_breakdown", "topic", "difficulty", "type"];
    if (optionalStringFields.some((field) => candidate[field] !== undefined && !isDbSafeText(candidate[field]))) return false;
    if (!isDbSafeText(candidate.question) && !isDbSafeText(candidate.question_text)) return false;
    if (candidate.options !== undefined && (!Array.isArray(candidate.options) || !candidate.options.every(isDbSafeText))) return false;
    if (candidate.parts !== undefined && (!Array.isArray(candidate.parts) || !candidate.parts.every((part) => {
        if (!part || typeof part !== "object" || Array.isArray(part)) return false;
        const fields = part as Record<string, unknown>;
        return isDbSafeText(fields.text)
            && (fields.label === undefined || isDbSafeText(fields.label))
            && (fields.marks === undefined || typeof fields.marks === "number");
    }))) return false;
    if (candidate.mark_schemes !== undefined && (!Array.isArray(candidate.mark_schemes) || !candidate.mark_schemes.every((scheme) => {
        if (!scheme || typeof scheme !== "object" || Array.isArray(scheme)) return false;
        const fields = scheme as Record<string, unknown>;
        return (fields.part_label === undefined || isDbSafeText(fields.part_label))
            && (fields.partLabel === undefined || isDbSafeText(fields.partLabel))
            && (fields.answer === undefined || isDbSafeText(fields.answer))
            && (fields.marks_breakdown === undefined || isDbSafeText(fields.marks_breakdown))
            && (fields.marksBreakdown === undefined || isDbSafeText(fields.marksBreakdown));
    }))) return false;
    return true;
}

function parseAiQuestions(text: string): AiGeneratedQuestion[] {
    const parsed: unknown = JSON.parse(extractJsonPayload(text));
    if (Array.isArray(parsed)) return parsed.filter(isAiGeneratedQuestion);
    if (!parsed || typeof parsed !== "object") return [];

    const items = (parsed as Record<string, unknown>).questions;
    if (Array.isArray(items)) return items.filter(isAiGeneratedQuestion);
    return isAiGeneratedQuestion(parsed) ? [parsed] : [];
}

function normalizeQuestionText(text: string) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isPdfNavigationQuestion(item: AiGeneratedQuestion) {
    const text = normalizeQuestionText([
        item.question ?? item.question_text ?? "",
        ...(item.parts ?? []).map((part) => part.text ?? ""),
    ].join(" "));
    return /\b(sommaire|table des matieres|table of contents|index du document|quelle page|a quelle page|numero de page|page de debut|what page|which page|page number)\b/.test(text)
        || /\b(chapitre|chapter)\b.{0,50}\b(commence|commencer|debute|begin|starts?)\b.{0,30}\b(page|sommaire|table des matieres)\b/.test(text);
}

function getExerciseRejectionReason(item: AiGeneratedQuestion): string | undefined {
    const parts = (item.parts ?? []).filter((part) => String(part.text ?? "").trim());
    const statement = String(item.question ?? item.question_text ?? "").trim();
    if (!parts.length) return "no exercise parts";
    if (statement.length < 40) return "statement is too short";
    const labels = parts.map((part, index) => String(part.label ?? String.fromCharCode(97 + index)).trim().toLowerCase());
    if (labels.some((label) => !label) || new Set(labels).size !== labels.length) return "part labels are empty or duplicated";
    const invalidMarks = parts
        .map((part, index) => ({ label: labels[index], marks: part.marks }))
        .filter(({ marks }) => !Number.isSafeInteger(marks) || Number(marks) < 1);
    if (invalidMarks.length) {
        return `part marks must be positive integers (${invalidMarks.map(({ label, marks }) => `${label}=${String(marks)}`).join(", ")})`;
    }
    const totalMarks = parts.reduce((total, part) => total + Number(part.marks), 0);
    if (!Number.isSafeInteger(totalMarks) || totalMarks > 2_147_483_647) return "total part marks exceed the database limit";
    const actionPattern = /\b(calcul\w*|determin\w*|resolv\w*|simplifi\w*|developp\w*|factoris\w*|montr\w*|demontr\w*|dedui\w*|verifi\w*|justifi\w*|constru\w*|trac\w*|complet\w*|appliqu\w*|effectu\w*|decri\w*|expliqu\w*|compar\w*|identifi\w*|class\w*|represent\w*|etud\w*|prouv\w*|find|calculate|solve|simplify|expand|factor|prove|justify|construct|draw|complete|apply|describe|explain|compare|identify|classify|show)\b|(?:احسب|اوجد|حل|برهن|علل|انشئ|ارسم|اكمل|طبق|اشرح|قارن)/;
    const allPartsAreActionable = parts.every((part) => {
        const text = normalizeQuestionText(part.text ?? "").trim();
        return actionPattern.test(text)
            || /\b(dis|donne|indiquer|precise|reponds?|quelle?s?|quel?s?|what|which|state|give|answer)\b/.test(text)
            || (text.length >= 20 && /[?؟]/.test(text));
    });
    if (!allPartsAreActionable) return "at least one part does not state a concrete student task";

    const schemes = (item.mark_schemes ?? []).filter((scheme) => String(scheme.answer ?? "").trim());
    const hasMatchingSchemes = schemes.length === parts.length && parts.every((part, index) => {
        const label = String(part.label ?? String.fromCharCode(97 + index)).trim().toLowerCase();
        return schemes.some((scheme) => {
            const schemeLabel = String(scheme.part_label ?? scheme.partLabel ?? "").trim().toLowerCase();
            const breakdown = String(scheme.marks_breakdown ?? scheme.marksBreakdown ?? "").trim();
            return schemeLabel === label && breakdown.length > 0;
        });
    });
    return hasMatchingSchemes ? undefined : "worked solutions or marking breakdowns do not match every part";
}

function splitPageText(text: string, maxChars: number) {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + maxChars, text.length);
        if (end < text.length) {
            const boundary = Math.max(
                text.lastIndexOf("\n\n", end),
                text.lastIndexOf("\n", end),
                text.lastIndexOf(". ", end),
                text.lastIndexOf("? ", end),
                text.lastIndexOf(" ", end),
            );
            if (boundary > start + maxChars * 0.7) end = boundary;
        }
        const chunkText = text.slice(start, end).trim();
        if (chunkText) chunks.push(chunkText);
        start = end;
        while (start < text.length && /\s/.test(text[start])) start++;
    }
    return chunks;
}

function splitTextIntoSourceChunks(file: AiSourceFile, pages: AiPdfPage[], maxChars: number): AiSourceChunk[] {
    const chunks: AiSourceChunk[] = [];
    let pendingPages: AiPdfPage[] = [];
    let pendingLength = 0;
    const flushPages = () => {
        if (!pendingPages.length) return;
        const firstPage = pendingPages[0].pageNumber;
        const lastPage = pendingPages[pendingPages.length - 1].pageNumber;
        chunks.push({
            file,
            pageRange: firstPage === lastPage ? `page ${firstPage}` : `pages ${firstPage}-${lastPage}`,
            text: pendingPages.map((page) => `Page ${page.pageNumber}:\n${page.text.trim()}`).join("\n\n"),
        });
        pendingPages = [];
        pendingLength = 0;
    };

    for (const page of pages) {
        const pageText = page.text.trim();
        if (!pageText) continue;

        const prefix = `Page ${page.pageNumber}:\n`;
        if (prefix.length + pageText.length > maxChars) {
            flushPages();
            const pageParts = splitPageText(pageText, Math.max(1, maxChars - prefix.length));
            pageParts.forEach((part, index) => {
                chunks.push({
                    file,
                    pageRange: `page ${page.pageNumber}${pageParts.length > 1 ? ` (part ${index + 1}/${pageParts.length})` : ""}`,
                    text: `${prefix}${part}`,
                });
            });
            continue;
        }

        if (pendingPages.length && pendingLength + 2 + prefix.length + pageText.length > maxChars) {
            flushPages();
        }
        pendingLength += (pendingPages.length ? 2 : 0) + prefix.length + pageText.length;
        pendingPages.push({ pageNumber: page.pageNumber, text: pageText });
    }

    flushPages();
    return chunks;
}

function scoreTopicRelevance(text: string, topic: string) {
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedText = normalize(text);
    const stopWords = new Set(["aux", "avec", "dans", "des", "du", "elle", "les", "par", "pour", "que", "qui", "sur", "une", "the", "and"]);
    const stem = (term: string) => term.length > 4 && term.endsWith("s") ? term.slice(0, -1) : term;
    const terms = [...new Set(
        normalize(topic)
            .split(/[^a-z0-9]+/)
            .filter((term) => term.length > 2 && !stopWords.has(term))
            .map(stem),
    )];
    if (!terms.length) return 0;

    const textTerms = (normalizedText.match(/[a-z0-9]+/g) ?? []).map(stem);
    const termCounts = new Map<string, number>();
    for (const term of textTerms) termCounts.set(term, (termCounts.get(term) ?? 0) + 1);

    let score = normalizedText.includes(normalize(topic).trim()) ? 8 : 0;
    let matchedTerms = 0;
    for (const term of terms) {
        const count = termCounts.get(term) ?? 0;
        if (!count) continue;
        matchedTerms++;
        score += 2 + Math.min(count, 3);
    }
    if (terms.length > 1 && matchedTerms === terms.length) score += 4;
    return score;
}

function isActionableQcm(item: AiGeneratedQuestion) {
    const question = String(item.question ?? item.question_text ?? "").trim();
    const options = (item.options ?? [])
        .map((option) => normalizeQuestionText(String(option)).trim().replace(/^[a-z]\s*[.)\-:]\s*/, ""))
        .filter(Boolean);
    const answer = String(item.answer ?? "").trim();
    const breakdown = String(item.marks_breakdown ?? "").trim();
    const normalizedAnswer = normalizeQuestionText(answer);
    const answerLetter = normalizedAnswer.match(/^(?:option\s*)?([a-z])(?:[.)\s:\-]|$)/)?.[1];
    const answerMatchesOption = options.some((option) => normalizedAnswer.includes(option))
        || Boolean(answerLetter && options[answerLetter.charCodeAt(0) - 97]);
    return question.length >= 20
        && new Set(options).size >= 3
        && answerMatchesOption
        && Boolean(breakdown);
}

function hasExpectedQuestionShape(item: AiGeneratedQuestion, type: AiQuestionType) {
    const hasOptions = (item.options ?? []).some((option) => String(option).trim());
    const hasParts = (item.parts ?? []).some((part) => String(part.text ?? "").trim());
    const hasMarkSchemes = (item.mark_schemes ?? []).some((scheme) => String(scheme.answer ?? "").trim());
    const hasStandaloneAnswer = Boolean(String(item.answer ?? item.marks_breakdown ?? "").trim());
    return type === "QCM"
        ? !hasParts && !hasMarkSchemes
        : !hasOptions && !hasStandaloneAnswer;
}

function isActionableRedaction(item: AiGeneratedQuestion) {
    const statement = String(item.question ?? item.question_text ?? "").trim();
    const parts = (item.parts ?? []).filter((part) => String(part.text ?? "").trim());
    if (statement.length < 40 || !parts.length) return false;
    const labels = parts.map((part, index) => String(part.label ?? String.fromCharCode(97 + index)).trim().toLowerCase());
    if (labels.some((label) => !label) || new Set(labels).size !== labels.length) return false;
    const totalMarks = parts.reduce((total, part) => total + Number(part.marks), 0);
    if (parts.some((part) => !Number.isSafeInteger(part.marks) || Number(part.marks) < 1)
        || !Number.isSafeInteger(totalMarks)
        || totalMarks > 2_147_483_647) return false;

    const writingTaskPattern = /\b(redig\w*|ecri\w*|formul\w*|argument\w*|discut\w*|expliqu\w*|present\w*|analy\w*|compar\w*|decri\w*|justifi\w*|prouv\w*|demonstr\w*|write|compose|argue|discuss|explain|present|analyze|analyse|compare|describe|justify)\b|(?:اكتب|حرر|ناقش|اشرح|حلل|قارن)/;
    const schemes = (item.mark_schemes ?? []).filter((scheme) => String(scheme.answer ?? "").trim());
    return schemes.length === parts.length
        && parts.every((part) => writingTaskPattern.test(normalizeQuestionText(part.text ?? "")))
        && parts.every((part, index) => {
            const label = String(part.label ?? String.fromCharCode(97 + index)).trim().toLowerCase();
            return schemes.some((scheme) => {
                const schemeLabel = String(scheme.part_label ?? scheme.partLabel ?? "").trim().toLowerCase();
                const breakdown = String(scheme.marks_breakdown ?? scheme.marksBreakdown ?? "").trim();
                return schemeLabel === label && breakdown.length > 0;
            });
        });
}

function formatAiQuestionText(item: AiGeneratedQuestion, type: AiQuestionType) {
    const question = String(item.question ?? item.question_text ?? "").trim();
    const parts = type !== "QCM" && Array.isArray(item.parts)
        ? item.parts
            .map((part, index) => ({
                label: String(part.label ?? String.fromCharCode(97 + index)),
                text: String(part.text ?? "").trim(),
            }))
            .filter((part) => part.text)
        : [];
    const statement = parts.length
        ? `${question}\n\n${parts.map((part) => `${part.label}. ${part.text}`).join("\n")}`
        : question;
    const options = type === "QCM" && Array.isArray(item.options)
        ? item.options
            .map((option) => String(option).trim().replace(/^[A-Z]\s*[.)\-:]\s*/i, ""))
            .filter(Boolean)
        : [];
    if (!options.length) return statement;
    return `${statement}\n\n${options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")}`;
}

function normalizeAiQuestionType(type: string | undefined): AiQuestionType | undefined {
    const normalized = (type ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    if (normalized === "qcm" || normalized === "multiple choice") return "QCM";
    if (normalized === "probleme" || normalized === "problem") return "Probleme";
    if (normalized === "redaction" || normalized === "essay") return "Redaction";
    if (normalized === "exercice" || normalized === "exercise") return "Exercice";
    return undefined;
}

function normalizeAiQuestionStatus(status: unknown): AiQuestionStatus | undefined {
    return AI_QUESTION_STATUSES.find((candidate) => candidate === status);
}

function normalizeAiDifficultyStrict(difficulty: string | undefined): "facile" | "moyen" | "difficile" | undefined {
    const normalized = (difficulty ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    if (normalized === "facile" || normalized === "easy") return "facile";
    if (normalized === "moyen" || normalized === "moyenne" || normalized === "medium" || normalized === "normal") return "moyen";
    if (normalized === "difficile" || normalized === "hard") return "difficile";
    return undefined;
}

function normalizeAiDifficulty(difficulty: string | undefined, fallback: string): "facile" | "moyen" | "difficile" {
    return normalizeAiDifficultyStrict(difficulty)
        ?? normalizeAiDifficultyStrict(fallback)
        ?? "moyen";
}

function buildAiQuestionPrompt(
    type: AiQuestionType,
    details: { subject: string; gradeLevel: string; topic: string; difficulty: string; language: string },
) {
    const topic = JSON.stringify(details.topic);
    const difficulty = JSON.stringify(details.difficulty);
    const instructions: Record<AiQuestionType, string> = {
        QCM: "Write one clear, unambiguous multiple-choice question. Include at least three substantive, distinct options with plausible distractors based on common misconceptions. Exactly one option must be correct. Verify the answer from the source before responding. Put the exact correct option, including its letter, in answer, and put a concise source-grounded explanation in marks_breakdown. Do not include parts or mark_schemes.",
        Exercice: "Write a complete student-facing exercise. The question is the introduction and must include all needed context and given data. Put every concrete student task in parts; do not use a vague lead-in such as 'answer the following questions' without writing the tasks. Provide a correct worked solution and marking breakdown for every part, with matching labels in mark_schemes. Verify each solution independently and check that all given facts are mutually consistent before responding. For probability, verify that P(A∩B) is no greater than either event probability and that incompatible events have intersection probability zero. Never describe events with a positive intersection as incompatible. Do not include options.",
        Probleme: "Write a complete, solvable multi-step problem with a coherent context, all necessary data and units, and a clear objective. Put explicit, logically ordered tasks in parts. Check that the supplied data are sufficient and the result is mathematically consistent. Provide a worked solution and marking breakdown for every part, with matching labels in mark_schemes. Verify the final result and units. Do not include options.",
        Redaction: "Write a focused, specific writing assignment that tells the student exactly what to explain, discuss, prove, or argue; avoid a vague generic prompt. Put the writing task and any required criteria in parts. For every part, provide the expected key ideas and a rubric in mark_schemes with matching labels. Do not include options.",
    };
    const schemas: Record<AiQuestionType, string> = {
        QCM: `{"question":"A clear question with all required data","topic":${topic},"type":"QCM","difficulty":${difficulty},"options":["A. First plausible choice","B. Correct choice","C. Another plausible choice"],"answer":"B. Correct choice","marks_breakdown":"Why B is correct, based on the source"}`,
        Exercice: `{"question":"A concise introduction with all necessary data","topic":${topic},"type":"Exercice","difficulty":${difficulty},"parts":[{"label":"a","text":"A concrete task the student must perform","marks":2},{"label":"b","text":"A second concrete task","marks":2}],"mark_schemes":[{"part_label":"a","answer":"Worked solution for a","marks_breakdown":"How marks are awarded for a"},{"part_label":"b","answer":"Worked solution for b","marks_breakdown":"How marks are awarded for b"}]}`,
        Probleme: `{"question":"A complete, realistic context with all given values and units","topic":${topic},"type":"Probleme","difficulty":${difficulty},"parts":[{"label":"a","text":"A precise first task","marks":2},{"label":"b","text":"A precise follow-up task","marks":2}],"mark_schemes":[{"part_label":"a","answer":"Worked solution for a","marks_breakdown":"How marks are awarded for a"},{"part_label":"b","answer":"Worked solution for b","marks_breakdown":"How marks are awarded for b"}]}`,
        Redaction: `{"question":"A specific writing assignment","topic":${topic},"type":"Redaction","difficulty":${difficulty},"parts":[{"label":"a","text":"Write a structured explanation with a clear scope and criteria","marks":4}],"mark_schemes":[{"part_label":"a","answer":"Expected key ideas","marks_breakdown":"Rubric for assessing the response"}]}`,
    };
    const shapeRule = type === "QCM"
        ? "Do not include parts or mark_schemes."
        : "Do not include options. Include parts and matching mark_schemes only.";
    return `Generate exactly one ${type} for ${details.subject}, level ${details.gradeLevel}, chapter ${topic}. Keep it strictly about this chapter and use only facts and methods supported by the source excerpt. ${instructions[type]} Write all student-facing text in ${details.language}.\n\nReturn only one valid JSON object matching this exact type and this shape, with no markdown or surrounding text. The type field must be exactly "${type}". ${shapeRule}\n${schemas[type]}\nIf the excerpt does not contain enough information for a valid question, return an empty JSON array.`;
}

function buildAiResponseSchema(type: AiQuestionType) {
    if (type !== "Exercice" && type !== "Probleme") return undefined;
    const questionSchema = {
        type: "object",
        properties: {
            question: { type: "string" },
            topic: { type: "string" },
            type: { type: "string", enum: [type] },
            difficulty: { type: "string" },
            parts: {
                type: "array",
                minItems: 1,
                items: {
                    type: "object",
                    properties: {
                        label: { type: "string" },
                        text: { type: "string" },
                        marks: { type: "integer", minimum: 1 },
                    },
                    required: ["label", "text", "marks"],
                    additionalProperties: false,
                },
            },
            mark_schemes: {
                type: "array",
                minItems: 1,
                items: {
                    type: "object",
                    properties: {
                        part_label: { type: "string" },
                        answer: { type: "string" },
                        marks_breakdown: { type: "string" },
                    },
                    required: ["part_label", "answer", "marks_breakdown"],
                    additionalProperties: false,
                },
            },
        },
        required: ["question", "topic", "type", "difficulty", "parts", "mark_schemes"],
        additionalProperties: false,
    };
    return {
        anyOf: [
            { type: "array", maxItems: 0 },
            questionSchema,
        ],
    };
}

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    private async audit(actor: AuthedUser, ip: string, action: string, entity: string, entityId?: string, metadata: object = {}) {
        await this.prisma.auditLog.create({
            data: {
                actorId: actor.id,
                action,
                entity,
                entityId: entityId ?? null,
                metadata: metadata as Prisma.InputJsonValue,
                ip,
            },
        });
    }

    async users(q?: string, role?: string, status?: string, page = "1", limit = "20") {
        const take = Math.min(Number(limit) || 20, 100);
        const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
        const where: Prisma.UserWhereInput = {};
        if (q) where.OR = [{ email: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }];
        if (role) where.role = role as any;
        if (status) where.status = status as any;
        else where.deletedAt = null;
        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: "desc" },
                include: { student: true, subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 } },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            items: items.map(({ passwordHash: _, ...user }) => user),
            total,
            page: Number(page) || 1,
            limit: take,
        };
    }

    async createUser(actor: AuthedUser, ip: string, body: any) {
        const email = String(body.email ?? "").toLowerCase().trim();
        if (!email || !body.password || !body.firstName) apiError(HttpStatus.BAD_REQUEST, "INVALID", "Champs requis manquants.");
        const exists = await this.prisma.user.findUnique({ where: { email } });
        if (exists) apiError(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Email déjà utilisé.");
        const role = body.role ?? "student";
        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash(body.password, 12),
                role,
                firstName: body.firstName,
                lastName: body.lastName ?? "",
                fullName: `${body.firstName} ${body.lastName ?? ""}`.trim(),
                emailVerified: true,
                student: role === "student" ? { create: { gradeLevel: body.gradeLevel ?? null, educationSection: body.educationSection ?? "" } } : undefined,
            },
        });
        await this.audit(actor, ip, "create_user", "user", user.id, { email, role });
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    async editUser(actor: AuthedUser, ip: string, id: string, body: any) {
        const target = await this.prisma.user.findUnique({ where: { id } });
        if (!target) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
        const data: Prisma.UserUpdateInput = {};
        if (body.firstName) data.firstName = body.firstName;
        if (body.lastName !== undefined) data.lastName = body.lastName;
        if (body.firstName || body.lastName !== undefined) {
            data.fullName = `${body.firstName ?? target!.firstName} ${body.lastName ?? target!.lastName}`.trim();
        }
        if (body.email) data.email = String(body.email).toLowerCase().trim();
        if (body.role) data.role = body.role;
        const user = await this.prisma.user.update({ where: { id }, data });
        if (body.gradeLevel !== undefined) {
            await this.prisma.studentProfile.upsert({
                where: { userId: id },
                create: { userId: id, gradeLevel: body.gradeLevel, educationSection: body.educationSection ?? "" },
                update: { gradeLevel: body.gradeLevel, educationSection: body.educationSection ?? undefined },
            });
        }
        await this.audit(actor, ip, "edit_user", "user", id, body);
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    async suspend(actor: AuthedUser, ip: string, id: string) {
        const target = await this.prisma.user.findUnique({ where: { id } });
        if (!target) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
        if (target!.role === "super_admin") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Impossible de suspendre un super admin.");
        if (target!.role === "admin" && actor.role !== "super_admin") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Accès insuffisant.");
        const user = await this.prisma.user.update({ where: { id }, data: { status: "suspended" } });
        await this.audit(actor, ip, "suspend_user", "user", id);
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    async activate(actor: AuthedUser, ip: string, id: string) {
        const user = await this.prisma.user.update({ where: { id }, data: { status: "active", archivedAt: null } });
        await this.audit(actor, ip, "activate_user", "user", id);
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    async archive(actor: AuthedUser, ip: string, id: string) {
        const user = await this.prisma.user.update({ where: { id }, data: { status: "archived", archivedAt: new Date() } });
        await this.audit(actor, ip, "archive_user", "user", id);
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    async softDelete(actor: AuthedUser, ip: string, id: string) {
        if (id === actor.id) apiError(HttpStatus.BAD_REQUEST, "INVALID", "Impossible de supprimer votre compte.");
        const target = await this.prisma.user.findUnique({ where: { id } });
        if (!target) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Utilisateur introuvable.");
        if (target!.role === "super_admin") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Impossible de supprimer un super admin.");
        const user = await this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date(), status: "archived", archivedAt: new Date(), email: `deleted+${id}@invalid.local` },
        });
        await this.prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
        await this.audit(actor, ip, "soft_delete_user", "user", id, { email: target!.email });
        return { ok: true, id: user.id };
    }

    async restore(actor: AuthedUser, ip: string, id: string) {
        const user = await this.prisma.user.update({ where: { id }, data: { deletedAt: null, status: "active", archivedAt: null } });
        await this.audit(actor, ip, "restore_user", "user", id);
        const { passwordHash: _, ...safe } = user;
        return safe;
    }

    listPlans() {
        return this.prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
    }

    async createPlan(actor: AuthedUser, ip: string, body: any) {
        const plan = await this.prisma.plan.create({
            data: {
                code: String(body.code).toUpperCase(),
                nameFr: body.nameFr,
                nameEn: body.nameEn ?? body.nameFr,
                nameAr: body.nameAr ?? body.nameFr,
                descriptionJson: body.descriptionJson ?? {},
                priceTnd: body.priceTnd ?? 0,
                interval: body.interval ?? "monthly",
                features: body.features ?? {},
                isActive: body.isActive !== false,
                sortOrder: body.sortOrder ?? 0,
            },
        });
        await this.audit(actor, ip, "create_plan", "plan", plan.id);
        return plan;
    }

    async patchPlan(actor: AuthedUser, ip: string, id: string, body: any) {
        const plan = await this.prisma.plan.update({ where: { id }, data: body });
        await this.audit(actor, ip, "update_plan", "plan", id);
        return plan;
    }

    subscriptions() {
        return this.prisma.subscription.findMany({ include: { plan: true, user: true }, orderBy: { createdAt: "desc" }, take: 100 });
    }

    async grant(actor: AuthedUser, ip: string, body: { userId: string; planId: string; startsAt: string; endsAt: string; reason: string }) {
        if (!body.userId || !body.planId || !body.startsAt || !body.endsAt || !body.reason || body.reason.length < 5) {
            apiError(HttpStatus.BAD_REQUEST, "INVALID", "Champs grant incomplets (motif ≥ 5 caractères).");
        }
        const startsAt = new Date(body.startsAt);
        const endsAt = new Date(body.endsAt);
        if (!(startsAt < endsAt)) apiError(HttpStatus.BAD_REQUEST, "INVALID", "startsAt doit précéder endsAt.");
        await this.prisma.subscription.updateMany({
            where: { userId: body.userId, status: { in: ["trialing", "active", "granted", "past_due"] } },
            data: { status: "canceled", canceledAt: new Date() },
        });
        const sub = await this.prisma.subscription.create({
            data: {
                userId: body.userId,
                planId: body.planId,
                status: "granted",
                source: "admin_grant",
                startsAt,
                endsAt,
                grantedById: actor.id,
                grantReason: body.reason,
            },
            include: { plan: true, user: true },
        });
        await this.audit(actor, ip, "grant_subscription", "subscription", sub.id, body);
        return sub;
    }

    discounts() {
        return this.prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });
    }

    async createDiscount(actor: AuthedUser, ip: string, body: any) {
        const dc = await this.prisma.discountCode.create({
            data: {
                code: String(body.code).trim().toUpperCase(),
                type: body.type ?? "percent",
                percentOff: body.percentOff ?? null,
                amountOffTnd: body.amountOffTnd ?? null,
                maxRedemptions: body.maxRedemptions ?? null,
                perUserLimit: body.perUserLimit ?? null,
                startsAt: body.startsAt ? new Date(body.startsAt) : null,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
                applicablePlanIds: body.applicablePlanIds ?? [],
                isActive: body.isActive !== false,
                createdById: actor.id,
            },
        });
        await this.audit(actor, ip, "create_discount", "discount", dc.id);
        return dc;
    }

    async patchDiscount(actor: AuthedUser, ip: string, id: string, body: any) {
        const data: Prisma.DiscountCodeUpdateInput = {};
        if (typeof body.isActive === "boolean") data.isActive = body.isActive;
        if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
        if (body.maxRedemptions !== undefined) data.maxRedemptions = body.maxRedemptions;
        const dc = await this.prisma.discountCode.update({ where: { id }, data });
        await this.audit(actor, ip, "update_discount", "discount", id);
        return dc;
    }

    questions(status?: string) {
        return this.prisma.question.findMany({
            where: { deletedAt: null, ...(status ? { status: status as any } : {}) },
            include: { parts: true, markSchemes: true },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
    }

    async createQuestion(actor: AuthedUser, ip: string, body: any) {
        const q = await this.prisma.question.create({
            data: {
                origin: body.origin ?? "manual",
                status: body.status ?? "draft",
                createdById: actor.id,
                gradeLevel: body.gradeLevel,
                sectionKey: body.sectionKey ?? "",
                subject: body.subject,
                topic: body.topic,
                type: body.type ?? "Exercice",
                difficulty: body.difficulty ?? "moyen",
                language: body.language ?? "Français",
                questionText: body.questionText,
                context: body.context ?? null,
                requiresCalculator: Boolean(body.requiresCalculator),
                totalMarks: body.totalMarks ?? null,
                estimatedTimeMinutes: body.estimatedTimeMinutes ?? null,
                publishedAt: body.status === "published" ? new Date() : null,
                parts: {
                    create: (body.parts ?? []).map((part: any, index: number) => ({
                        label: part.label ?? String.fromCharCode(97 + index),
                        text: part.text,
                        marks: Number(part.marks ?? 1),
                        orderIndex: index,
                    })),
                },
                markSchemes: {
                    create: (body.markSchemes ?? body.mark_scheme ?? []).map((scheme: any, index: number) => ({
                        partLabel: scheme.partLabel ?? scheme.label ?? "a",
                        answer: scheme.answer,
                        marksBreakdown: scheme.marksBreakdown ?? scheme.marks_breakdown ?? null,
                        orderIndex: index,
                    })),
                },
            },
            include: { parts: true, markSchemes: true },
        });
        await this.audit(actor, ip, "create_question", "question", q.id);
        return q;
    }

    async startQuestionGeneration(actor: AuthedUser, ip: string, body: any) {
        const gradeLevel = String(body.gradeLevel ?? "bac");
        const sectionKey = String(body.sectionKey ?? "");
        const subject = String(body.subject ?? "Mathématiques");
        const topic = String(body.topic ?? "").trim();
        const count = Number(body.count);
        const status = normalizeAiQuestionStatus(body.status ?? "draft");
        const submittedTypes: unknown[] = Array.isArray(body.types) ? body.types : [];
        if (!Number.isInteger(count) || count < 1 || count > 50) {
            apiError(HttpStatus.BAD_REQUEST, "QUESTION_COUNT_INVALID", "Le nombre de questions doit être compris entre 1 et 50.");
        }
        if (!status) {
            apiError(HttpStatus.BAD_REQUEST, "QUESTION_STATUS_INVALID", "Le statut de question demandé n'est pas valide.");
        }
        if (!submittedTypes.length || submittedTypes.some((type) => typeof type !== "string" || !AI_QUESTION_TYPES.includes(type as AiQuestionType))) {
            apiError(HttpStatus.BAD_REQUEST, "QUESTION_TYPES_INVALID", "Sélectionnez au moins un type de question valide.");
        }
        const types = [...new Set(submittedTypes as AiQuestionType[])];
        if (types.length !== submittedTypes.length) {
            apiError(HttpStatus.BAD_REQUEST, "QUESTION_TYPES_INVALID", "Chaque type de question ne peut être sélectionné qu'une seule fois.");
        }
        if (!topic) apiError(HttpStatus.BAD_REQUEST, "CHAPTER_REQUIRED", "Choisissez un chapitre avant de générer les questions.");
        const chapter = await this.prisma.curriculumChapter.findFirst({
            where: {
                isActive: true,
                levelCode: gradeLevel,
                sectionKey: { in: ["", sectionKey] },
                subject,
                name: topic,
            },
            select: { id: true },
        });
        if (!chapter) apiError(HttpStatus.BAD_REQUEST, "CHAPTER_INVALID", "Le chapitre choisi n'existe pas pour ce niveau, cette section et cette matière.");
        const generationRequest = { ...body, gradeLevel, sectionKey, subject, topic, count, types, status };

        if (process.env.ENABLE_AI !== "true") {
            return {
                persisted: false,
                questions: [{
                    question_text: `(Brouillon IA — activez ENABLE_AI) ${body.topic ?? "Sujet"} : énoncé à corriger manuellement.`,
                    parts: [{ label: "a", text: "Question principale", marks: 4 }],
                    mark_scheme: [{ label: "a", answer: "Réponse à compléter", marks_breakdown: "4 pts" }],
                    difficulty: body.difficulty ?? "moyen",
                    type: types[0],
                    estimated_time_minutes: 10,
                }],
            };
        }
        const files = Array.isArray(body.files) ? (body.files as AiSourceFile[]) : [];
        if (!files.length) apiError(HttpStatus.BAD_REQUEST, "FILES_REQUIRED", "Ajoutez au moins un fichier PDF.");

        cleanExpiredAiJobs();
        const jobId = randomUUID();
        aiGenerationJobs.set(jobId, {
            userId: actor.id,
            status: "preparing",
            progress: 2,
            message: "Préparation des documents",
            currentChunk: 0,
            totalChunks: 0,
            updatedAt: Date.now(),
        });
        void this.runQuestionGeneration(actor, ip, generationRequest, jobId).catch((error: unknown) => {
            const job = aiGenerationJobs.get(jobId);
            if (!job) return;
            const response = error instanceof Error && "getResponse" in error ? (error as any).getResponse() : null;
            const responseMessage = response?.message;
            job.status = "failed";
            job.error = Array.isArray(responseMessage)
                ? responseMessage.join("; ")
                : typeof responseMessage === "string"
                    ? responseMessage
                    : error instanceof Error ? error.message : typeof error === "string" ? error : "Erreur pendant la génération Ollama.";
            job.message = "La génération a échoué";
            job.updatedAt = Date.now();
        });
        return { jobId };
    }

    generationStatus(actor: AuthedUser, jobId: string) {
        cleanExpiredAiJobs();
        const job = aiGenerationJobs.get(jobId);
        if (!job || job.userId !== actor.id) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Génération introuvable.");
        return {
            status: job.status,
            progress: job.progress,
            message: job.message,
            currentChunk: job.currentChunk,
            totalChunks: job.totalChunks,
            ...(job.status === "completed" ? { result: job.result } : {}),
            ...(job.status === "failed" ? { error: job.error } : {}),
        };
    }

    private async runQuestionGeneration(actor: AuthedUser, ip: string, body: any, jobId: string) {
        const updateJob = (updates: Partial<AiGenerationJob>) => {
            const job = aiGenerationJobs.get(jobId);
            if (job) Object.assign(job, updates, { updatedAt: Date.now() });
        };
        const files = body.files as AiSourceFile[];
        const status = normalizeAiQuestionStatus(body.status);
        if (!status) apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_STATUS_INVALID", "Le statut de génération est invalide.");
        const meta = {
            gradeLevel: String(body.gradeLevel ?? "bac"),
            sectionKey: String(body.sectionKey ?? ""),
            subject: String(body.subject ?? "Mathématiques"),
            topic: String(body.topic).trim(),
            count: Number(body.count),
            types: body.types as AiQuestionType[],
            difficulty: String(body.difficulty ?? "moyen"),
            status,
            language: String(body.language ?? "Français"),
        };
        const model = String(process.env.OLLAMA_MODEL ?? "qwen3:8b");
        const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11435").replace(/\/$/, "");
        const timeout = Number(process.env.OLLAMA_TIMEOUT_MS ?? 600_000);

        const sourceChunks: AiSourceChunk[] = [];
        for (const file of files) {
            const isPdf = file.mimeType?.toLowerCase() === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
            if (!isPdf) apiError(HttpStatus.BAD_REQUEST, "PDF_REQUIRED", "Ollama nécessite des fichiers PDF pour extraire le texte.");
            const pages = await extractPdfPages(file);
            sourceChunks.push(...splitTextIntoSourceChunks(file, pages, 1800));
        }
        if (!sourceChunks.length) apiError(HttpStatus.UNPROCESSABLE_ENTITY, "PDF_TEXT_UNAVAILABLE", "Aucun texte extractible dans les documents fournis.");
        const rankedSourceIndices = sourceChunks
            .map((chunk, index) => ({ index, score: scoreTopicRelevance(chunk.text, meta.topic) }))
            .sort((left, right) => right.score - left.score || left.index - right.index)
            .map(({ index }) => index);

        updateJob({
            status: "reading",
            progress: 20,
            message: `Documents lus (${sourceChunks.length} extraits)`,
            currentChunk: 0,
            totalChunks: meta.count,
        });

        const generateContent = async (
            instruction: string,
            maxOutputTokens: number,
            operation: string,
            documentText = "",
            jsonMode = false,
            responseFormat: "json" | Record<string, unknown> = "json",
        ) => {
            const content = documentText ? `${instruction}\n\nDocument:\n${documentText}` : instruction;
            let response: Response;
            try {
                response = await fetch(`${baseUrl}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: "user", content }],
                        stream: false,
                        ...(jsonMode ? { format: responseFormat, think: false } : {}),
                        options: { temperature: 0.2, num_predict: maxOutputTokens },
                    }),
                    signal: AbortSignal.timeout(timeout),
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error("[Ollama] Could not connect to Ollama", { baseUrl, model, operation, message });
                throw new Error(`Impossible de joindre Ollama à ${baseUrl}: ${message}`);
            }
            const data = await response.json().catch(() => ({})) as any;
            if (!response.ok) {
                const message = data.error ?? `Ollama returned HTTP ${response.status}`;
                console.error("[Ollama] chat request failed", { model, operation, status: response.status, message });
                throw new Error(`Ollama: ${message}`);
            }
            return { text: String(data.message?.content ?? "") };
        };

        const generated: AiGeneratedQuestion[] = [];
        const rawResponses: string[] = [];
        const maxSourceAttempts = 2;
        for (let questionIndex = 0; questionIndex < meta.count; questionIndex++) {
            const preferredSourceIndex = questionIndex % rankedSourceIndices.length;
            const requestedType = meta.types[questionIndex % meta.types.length];
            let acceptedQuestion: AiGeneratedQuestion | undefined;
            let retryFeedback = "";
            for (let sourceAttempt = 0; sourceAttempt < maxSourceAttempts; sourceAttempt++) {
                const sourceIndex = retryFeedback
                    ? rankedSourceIndices[preferredSourceIndex]
                    : rankedSourceIndices[(preferredSourceIndex + sourceAttempt) % rankedSourceIndices.length];
                const sourceChunk = sourceChunks[sourceIndex];
                const sourceExcerpt = `Document: ${sourceChunk.file.name}\nSource ${sourceChunk.pageRange}:\n${sourceChunk.text}`;
                const prompt = `${buildAiQuestionPrompt(requestedType, meta)}${retryFeedback}`;
                updateJob({
                    status: "generating",
                    progress: 20 + Math.round(((questionIndex + sourceAttempt / maxSourceAttempts) / meta.count) * 65),
                    message: `Génération question ${questionIndex + 1}/${meta.count} (tentative ${sourceAttempt + 1}/${maxSourceAttempts})`,
                    currentChunk: questionIndex + 1,
                    totalChunks: meta.count,
                });
                let raw: string;
                try {
                    const outputTokenLimit = requestedType === "Exercice" || requestedType === "Probleme" ? 1536 : 768;
                    const response = await generateContent(
                        prompt,
                        outputTokenLimit,
                        `question ${questionIndex + 1}/${meta.count}, source ${sourceIndex + 1}/${sourceChunks.length}`,
                        sourceExcerpt,
                        true,
                        buildAiResponseSchema(requestedType) ?? "json",
                    );
                    raw = response.text;
                } catch (error) {
                    if (sourceAttempt + 1 < maxSourceAttempts && error instanceof Error && /repeat limit/i.test(error.message)) {
                        console.warn("[Ollama] Repeating-token failure; retrying with another PDF excerpt", {
                            question: questionIndex + 1,
                            source: sourceChunk.file.name,
                            pageRange: sourceChunk.pageRange,
                        });
                        continue;
                    }
                    throw error;
                }
                rawResponses.push(raw);
                let batchQuestions: AiGeneratedQuestion[];
                try {
                    batchQuestions = parseAiQuestions(raw);
                } catch {
                    console.warn("[Ollama] Invalid question JSON; trying another PDF excerpt", {
                        question: questionIndex + 1,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                        responsePreview: raw.slice(0, 300),
                    });
                    continue;
                }
                if (!batchQuestions.length) {
                    console.warn("[Ollama] No questions returned for PDF excerpt; trying another excerpt", {
                        question: questionIndex + 1,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                        responsePreview: raw.slice(0, 300),
                    });
                    continue;
                }
                if (batchQuestions.length !== 1) {
                    console.warn("[Ollama] Rejected response with an unexpected question count", {
                        question: questionIndex + 1,
                        count: batchQuestions.length,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                    });
                    continue;
                }
                const candidate = batchQuestions[0];
                if (normalizeAiQuestionType(candidate.type) !== requestedType) {
                    console.warn("[Ollama] Rejected question with an unexpected type", {
                        question: questionIndex + 1,
                        expectedType: requestedType,
                        receivedType: candidate.type,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                    });
                    continue;
                }
                const normalizedTopic = (value: string) => normalizeQuestionText(value).trim().replace(/\s+/g, " ");
                if (!candidate.topic || normalizedTopic(candidate.topic) !== normalizedTopic(meta.topic)) {
                    console.warn("[Ollama] Rejected question with an unexpected topic", {
                        question: questionIndex + 1,
                        expectedTopic: meta.topic,
                        receivedTopic: candidate.topic,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                    });
                    continue;
                }
                const requestedDifficulty = normalizeAiDifficultyStrict(meta.difficulty) ?? normalizeAiDifficulty(meta.difficulty, "moyen");
                if (normalizeAiDifficultyStrict(candidate.difficulty) !== requestedDifficulty) {
                    console.warn("[Ollama] Rejected question with an unexpected difficulty", {
                        question: questionIndex + 1,
                        expectedDifficulty: requestedDifficulty,
                        receivedDifficulty: candidate.difficulty,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                    });
                    continue;
                }
                if (!hasExpectedQuestionShape(candidate, requestedType)) {
                    console.warn("[Ollama] Rejected response with mixed question fields", {
                        question: questionIndex + 1,
                        type: requestedType,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                    });
                    continue;
                }
                if (isPdfNavigationQuestion(candidate)) {
                    console.warn("[Ollama] Rejected document-navigation question", {
                        question: questionIndex + 1,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                        responsePreview: raw.slice(0, 300),
                    });
                    continue;
                }
                if (requestedType === "QCM" && !isActionableQcm(candidate)) {
                    console.warn("[Ollama] Rejected incomplete QCM", {
                        question: questionIndex + 1,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                    });
                    continue;
                }
                const exerciseRejectionReason = requestedType === "Exercice" || requestedType === "Probleme"
                    ? getExerciseRejectionReason(candidate)
                    : undefined;
                if (exerciseRejectionReason) {
                    console.warn(`[Ollama] Rejected incomplete ${requestedType.toLowerCase()}`, {
                        question: questionIndex + 1,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                        reason: exerciseRejectionReason,
                        responsePreview: raw.slice(0, 300),
                    });
                    retryFeedback = `\n\nYour previous attempt was rejected because ${exerciseRejectionReason}. Generate a different, fully valid ${requestedType}: every part must include marks as a JSON integer greater than or equal to 1 (never a decimal or string), and each part needs one matching worked solution and marking breakdown. Recheck all mathematical facts for contradictions before returning JSON.`;
                    continue;
                }
                if (requestedType === "Redaction" && !isActionableRedaction(candidate)) {
                    console.warn("[Ollama] Rejected incomplete writing prompt", {
                        question: questionIndex + 1,
                        source: sourceChunk.file.name,
                        pageRange: sourceChunk.pageRange,
                    });
                    continue;
                }
                acceptedQuestion = candidate;
                break;
            }
            if (!acceptedQuestion) {
                apiError(HttpStatus.UNPROCESSABLE_ENTITY, "AI_QUESTION_UNSUITABLE", `Impossible de générer une question ${requestedType} exploitable pour « ${meta.topic} » après ${maxSourceAttempts} tentatives. Vérifiez que le PDF contient assez de matière sur ce chapitre.`);
            }
            generated.push(acceptedQuestion!);
        }
        const raw = rawResponses.join("\n\n");

        updateJob({ status: "saving", progress: 92, message: "Enregistrement des questions" });
        const saved = await this.prisma.$transaction(async (tx) => {
            const questions: Prisma.QuestionGetPayload<{ include: { parts: true; markSchemes: true } }>[] = [];
            for (const item of generated!) {
                const type = normalizeAiQuestionType(item.type);
                if (!type) apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_TYPE_INVALID", "L'IA a renvoyé un type de question invalide.");
                if (!meta.types.includes(type)) {
                    apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_TYPE_NOT_SELECTED", `L'IA a renvoyé le type ${type}, qui n'a pas été sélectionné.`);
                }

                const options = type === "QCM" ? (item.options ?? []).map((option) => option.trim()).filter(Boolean) : [];
                const questionText = formatAiQuestionText(item, type).trim();
                if (!questionText) apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_QUESTION_TEXT_INVALID", "L'IA a renvoyé un énoncé vide.");
                if (type === "QCM" && (options.length < 3 || new Set(options.map(normalizeQuestionText)).size !== options.length)) {
                    apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_QCM_OPTIONS_INVALID", "Les choix du QCM ne sont pas valides.");
                }

                const sourceParts = type === "QCM" ? [] : item.parts ?? [];
                if (type !== "QCM" && !sourceParts.length) {
                    apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_QUESTION_PARTS_INVALID", "La question générée n'a pas de parties valides.");
                }
                const parts = sourceParts.map((part, index) => {
                    const label = String(part.label ?? String.fromCharCode(97 + index)).trim();
                    const text = String(part.text ?? "").trim();
                    const marks = part.marks;
                    if (!label || !text || typeof marks !== "number" || !Number.isSafeInteger(marks) || marks < 1) {
                        apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_QUESTION_PART_INVALID", "Une partie générée contient des valeurs incompatibles avec la base.");
                    }
                    return { label, text, marks, orderIndex: index };
                });
                const savedParts = type === "QCM"
                    ? [{ label: "a", text: "Choisissez la bonne réponse.", marks: 1, orderIndex: 0 }]
                    : parts;
                const totalMarks = savedParts.reduce((total, part) => total + part.marks, 0);
                if (!Number.isSafeInteger(totalMarks) || totalMarks > 2_147_483_647) {
                    apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_TOTAL_MARKS_INVALID", "Le total de points ne peut pas être enregistré.");
                }

                let markSchemes: { partLabel: string; answer: string; marksBreakdown: string | null; orderIndex: number }[];
                if (type === "QCM") {
                    const answer = String(item.answer ?? "").trim();
                    const marksBreakdown = String(item.marks_breakdown ?? "").trim();
                    if (!answer || !marksBreakdown) {
                        apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_QCM_ANSWER_INVALID", "La réponse ou l'explication du QCM est vide.");
                    }
                    markSchemes = [{ partLabel: "a", answer, marksBreakdown, orderIndex: 0 }];
                } else {
                    const suppliedSchemes = item.mark_schemes ?? [];
                    if (suppliedSchemes.length !== parts.length) {
                        apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_MARK_SCHEMES_INVALID", "Les corrections ne correspondent pas aux parties de la question.");
                    }
                    markSchemes = suppliedSchemes.map((scheme, index) => {
                        const requestedLabel = String(scheme.part_label ?? scheme.partLabel ?? "").trim().toLowerCase();
                        const part = parts.find((candidate) => candidate.label.toLowerCase() === requestedLabel);
                        const answer = String(scheme.answer ?? "").trim();
                        const marksBreakdown = String(scheme.marks_breakdown ?? scheme.marksBreakdown ?? "").trim();
                        if (!part || !answer || !marksBreakdown) {
                            apiError(HttpStatus.INTERNAL_SERVER_ERROR, "AI_MARK_SCHEME_INVALID", "Une correction générée est vide ou ne correspond à aucune partie.");
                        }
                        return { partLabel: part.label, answer, marksBreakdown, orderIndex: index };
                    });
                }

                questions.push(await tx.question.create({
                    data: {
                        origin: "ai_admin",
                        status: meta.status,
                        createdById: actor.id,
                        gradeLevel: meta.gradeLevel,
                        sectionKey: meta.sectionKey,
                        subject: meta.subject,
                        topic: meta.topic,
                        type,
                        difficulty: normalizeAiDifficulty(item.difficulty, meta.difficulty),
                        language: meta.language,
                        questionText,
                        context: `AI generated from: ${files.map((file) => file.name).join(", ")}`,
                        totalMarks,
                        estimatedTimeMinutes: 2,
                        publishedAt: meta.status === "published" ? new Date() : null,
                        parts: { create: savedParts },
                        markSchemes: { create: markSchemes },
                    },
                    include: { parts: true, markSchemes: true },
                }));
            }

            for (const file of files) {
                await tx.knowledgeBaseFile.create({
                    data: {
                        fileName: file.name,
                        storageKey: `ai-inline/${randomUUID()}-${file.name}`,
                        contentType: file.mimeType || "application/pdf",
                        subject: meta.subject,
                        gradeLevel: meta.gradeLevel,
                        sectionKey: meta.sectionKey,
                        topic: meta.topic,
                        status: "ready",
                        questionsCount: questions.length,
                        uploadedById: actor.id,
                        processedAt: new Date(),
                    },
                });
            }

            await tx.auditLog.create({
                data: {
                    actorId: actor.id,
                    action: "ai_generate_questions",
                    entity: "question",
                    entityId: questions[0]?.id ?? null,
                    metadata: {
                        model,
                        files: files.map((file) => ({ name: file.name, mimeType: file.mimeType })),
                        sourceSegments: sourceChunks.length,
                        count: questions.length,
                    } as Prisma.InputJsonValue,
                    ip,
                },
            });
            return questions;
        }, { maxWait: 10_000, timeout: 60_000 });

        const result = { persisted: true, raw, questions: saved };
        updateJob({ status: "completed", progress: 100, message: "Document lu et questions enregistrees", result });
        return result;
    }

    async publish(actor: AuthedUser, ip: string, id: string) {
        const q = await this.prisma.question.findUnique({ where: { id } });
        if (!q) apiError(HttpStatus.NOT_FOUND, "NOT_FOUND", "Question introuvable.");
        if (q!.origin === "ai_student_pdf") apiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Question privée élève.");
        const updated = await this.prisma.question.update({ where: { id }, data: { status: "published", publishedAt: new Date() } });
        await this.audit(actor, ip, "publish_question", "question", id);
        return updated;
    }

    chapters() {
        return this.prisma.curriculumChapter.findMany({ orderBy: [{ levelCode: "asc" }, { sortOrder: "asc" }] });
    }

    createChapter(body: any) {
        return this.prisma.curriculumChapter.create({
            data: { levelCode: body.levelCode, sectionKey: body.sectionKey ?? "", subject: body.subject, name: body.name, slug: body.slug, sortOrder: body.sortOrder ?? 0 },
        });
    }

    courses() {
        return this.prisma.course.findMany({ orderBy: { createdAt: "desc" } });
    }

    createCourse(actor: AuthedUser, body: any) {
        return this.prisma.course.create({
            data: {
                title: body.title,
                levelCode: body.levelCode,
                sectionKey: body.sectionKey ?? "",
                subject: body.subject,
                body: body.body ?? "",
                isPublished: Boolean(body.isPublished),
                createdById: actor.id,
            },
        });
    }

    kb() {
        return this.prisma.knowledgeBaseFile.findMany({ orderBy: { createdAt: "desc" } });
    }

    async overview() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [revenueMtd, revenue30, activeSubs, new7, students, suspended, questionsPublished, draftsAi, pdf7, payments] = await Promise.all([
            this.prisma.payment.aggregate({ _sum: { amountTnd: true }, where: { status: "completed", createdAt: { gte: monthStart } } }),
            this.prisma.payment.aggregate({ _sum: { amountTnd: true }, where: { status: "completed", createdAt: { gte: d30 } } }),
            this.prisma.subscription.count({ where: { status: { in: ["active", "granted", "trialing"] }, endsAt: { gte: now } } }),
            this.prisma.user.count({ where: { role: "student", createdAt: { gte: d7 }, deletedAt: null } }),
            this.prisma.user.count({ where: { role: "student", deletedAt: null, status: { not: "archived" } } }),
            this.prisma.user.count({ where: { status: "suspended" } }),
            this.prisma.question.count({ where: { status: "published", deletedAt: null } }),
            this.prisma.question.count({ where: { origin: "ai_admin", status: "draft" } }),
            this.prisma.studentDocument.count({ where: { createdAt: { gte: d7 } } }),
            this.prisma.payment.findMany({ where: { status: "completed", createdAt: { gte: d30 } }, orderBy: { createdAt: "asc" } }),
        ]);
        const activeWithPlan = await this.prisma.subscription.findMany({ where: { status: { in: ["active", "granted"] }, endsAt: { gte: now } }, include: { plan: true } });
        const mrr = activeWithPlan.reduce((sum, sub) => {
            const price = Number(sub.plan.priceTnd);
            return sum + (sub.plan.interval === "yearly" ? price / 12 : price);
        }, 0);
        const byLevel = await this.prisma.studentProfile.groupBy({ by: ["gradeLevel"], _count: true });
        const dailyRevenue: Record<string, number> = {};
        for (const payment of payments) {
            const key = payment.createdAt.toISOString().slice(0, 10);
            dailyRevenue[key] = (dailyRevenue[key] ?? 0) + Number(payment.amountTnd);
        }
        return {
            revenueMtd: Number(revenueMtd._sum.amountTnd ?? 0),
            revenue30: Number(revenue30._sum.amountTnd ?? 0),
            mrr,
            activeSubs,
            new7,
            students,
            suspended,
            questionsPublished,
            draftsAi,
            pdf7,
            byLevel,
            dailyRevenue: Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount })),
        };
    }

    auditLogs() {
        return this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: true } });
    }
}
