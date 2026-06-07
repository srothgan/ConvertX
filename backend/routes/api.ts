import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { Elysia, t } from "elysia";
import sanitize from "sanitize-filename";
import { outputDir, uploadsDir } from "..";
import { authService } from "../auth/authentik";
import { getAllInputs, getAllTargets, getPossibleTargets, handleConvert } from "../converters/main";
import db from "../db/db";
import { Filename, Jobs } from "../db/types";
import { getLogEntries } from "../helpers/logs";
import { HIDE_HISTORY, WEBROOT } from "../helpers/env";
import { normalizeFiletype } from "../helpers/normalizeFiletype";

type ApiSet = {
  status?: number | string;
};

type UploadFile = Blob & {
  name: string;
  size: number;
  type?: string;
};

type ConversionTarget = {
  value: string;
  source: string;
  target: string;
  converter: string;
  label: string;
  description: string;
};

const apiError = (
  set: ApiSet,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) => {
  set.status = status;

  return {
    success: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
};

const getJobForUser = (jobId: string, userId: string | number) => {
  return db.query("SELECT * FROM jobs WHERE user_id = ? AND id = ?").as(Jobs).get(userId, jobId);
};

const getJobFiles = (jobId: string) => {
  return db.query("SELECT * FROM file_names WHERE job_id = ?").as(Filename).all(jobId);
};

const getSourceFromFileName = (fileName: string) => {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot < 0 || lastDot === fileName.length - 1) {
    return "";
  }

  return normalizeFiletype(fileName.slice(lastDot + 1));
};

type FormatMetadata = {
  label: string;
  description: string;
  aliases?: string[];
};

const formatMetadata: Record<string, FormatMetadata> = {
  "pandoc native": {
    label: "Pandoc native document",
    description: "Internal Pandoc document format for advanced document conversion.",
  },
  abw: {
    label: "AbiWord document (.abw)",
    description: "Word processor document created by AbiWord.",
  },
  asciidoc: {
    label: "AsciiDoc document (.adoc)",
    description: "Plain text documentation format used for technical writing.",
    aliases: ["adoc"],
  },
  asciidoc_legacy: {
    label: "AsciiDoc legacy document",
    description: "Legacy AsciiDoc text document format.",
  },
  asciidoctor: {
    label: "AsciiDoctor document",
    description: "AsciiDoc document variant processed by Asciidoctor.",
  },
  avif: {
    label: "AVIF image (.avif)",
    description: "Modern image format with efficient compression.",
  },
  beamer: {
    label: "LaTeX Beamer slides",
    description: "Presentation slides produced for LaTeX Beamer.",
  },
  biblatex: {
    label: "BibLaTeX bibliography (.bib)",
    description: "Bibliography data used by LaTeX documents.",
    aliases: ["bib"],
  },
  bibtex: {
    label: "BibTeX bibliography (.bib)",
    description: "Bibliography data used by academic writing tools.",
    aliases: ["bib"],
  },
  bmp: {
    label: "Bitmap image (.bmp)",
    description: "Uncompressed bitmap image format.",
  },
  commonmark: {
    label: "CommonMark Markdown document",
    description: "Markdown text document using the CommonMark specification.",
  },
  commonmark_x: {
    label: "CommonMark Markdown document",
    description: "Markdown text document using CommonMark with extensions.",
  },
  csv: {
    label: "Spreadsheet table (.csv)",
    description: "Spreadsheet-compatible table data stored as comma-separated text.",
  },
  doc: {
    label: "Word 97-2003 document (.doc)",
    description: "Older Microsoft Word document format.",
  },
  docbook: {
    label: "DocBook document",
    description: "Structured document format often used for books and manuals.",
  },
  docbook4: {
    label: "DocBook 4 document",
    description: "DocBook 4 structured document format.",
  },
  docbook5: {
    label: "DocBook 5 document",
    description: "DocBook 5 structured document format.",
  },
  docm: {
    label: "Word macro-enabled document (.docm)",
    description: "Microsoft Word document that can contain macros.",
  },
  docx: {
    label: "Word document (.docx)",
    description: "Microsoft Word document used for formatted text.",
    aliases: ["word"],
  },
  dot: {
    label: "Word 97-2003 template (.dot)",
    description: "Older Microsoft Word template format.",
  },
  dotm: {
    label: "Word macro-enabled template (.dotm)",
    description: "Microsoft Word template that can contain macros.",
  },
  dotx: {
    label: "Word template (.dotx)",
    description: "Microsoft Word template for reusable document layouts.",
  },
  epub: {
    label: "eBook (.epub)",
    description: "Digital book format used by many e-readers.",
  },
  excel: {
    label: "Excel spreadsheet",
    description: "Microsoft Excel spreadsheet or workbook.",
    aliases: ["xlsx", "xls"],
  },
  fb2: {
    label: "FictionBook eBook (.fb2)",
    description: "XML-based eBook format used for fiction and long-form text.",
  },
  fodt: {
    label: "OpenDocument flat text (.fodt)",
    description: "OpenDocument text file stored as a single XML document.",
  },
  gfm: {
    label: "GitHub Markdown document",
    description: "Markdown text document using GitHub-flavored Markdown.",
    aliases: ["github markdown"],
  },
  gif: {
    label: "GIF image (.gif)",
    description: "Animated or static image format.",
  },
  html: {
    label: "Web page (.html)",
    description: "HTML document or webpage markup.",
    aliases: ["htm", "webpage"],
  },
  ipynb: {
    label: "Jupyter notebook (.ipynb)",
    description: "Interactive notebook containing code, text, and outputs.",
  },
  jpeg: {
    label: "JPEG image (.jpg, .jpeg)",
    description: "Common photographic image format.",
    aliases: ["jpg", "jfif"],
  },
  json: {
    label: "JSON data (.json)",
    description: "Structured data stored in JSON format.",
  },
  latex: {
    label: "LaTeX document (.tex)",
    description: "Typeset document source used for academic and technical writing.",
    aliases: ["tex"],
  },
  markdown: {
    label: "Markdown document (.md)",
    description: "Plain text document with lightweight formatting.",
    aliases: ["md"],
  },
  markdown_mmd: {
    label: "MultiMarkdown document",
    description: "Markdown document using MultiMarkdown extensions.",
  },
  markdown_phpextra: {
    label: "Markdown Extra document",
    description: "Markdown document using PHP Markdown Extra extensions.",
  },
  markdown_strict: {
    label: "Strict Markdown document",
    description: "Markdown document using a strict compatibility mode.",
  },
  mov: {
    label: "QuickTime video (.mov)",
    description: "QuickTime video container.",
  },
  mp3: {
    label: "MP3 audio (.mp3)",
    description: "Compressed audio format for music, speech, and other audio.",
  },
  mp4: {
    label: "MP4 video (.mp4)",
    description: "Common video container for web and device playback.",
  },
  odt: {
    label: "OpenDocument text (.odt)",
    description: "Open document format used by LibreOffice Writer and similar apps.",
  },
  opendocument: {
    label: "OpenDocument text",
    description: "Open document format used by office suites such as LibreOffice.",
  },
  org: {
    label: "Org mode document (.org)",
    description: "Plain text notes and documentation format used by Emacs Org mode.",
  },
  ott: {
    label: "OpenDocument text template (.ott)",
    description: "Template for OpenDocument text files.",
  },
  pages: {
    label: "Apple Pages document",
    description: "Word processing document created by Apple Pages.",
  },
  pdf: {
    label: "PDF document (.pdf)",
    description: "Portable document format for sharing fixed-layout documents.",
  },
  plain: {
    label: "Plain text document",
    description: "Text-only document without rich formatting.",
  },
  png: {
    label: "PNG image (.png)",
    description: "Lossless raster image format.",
  },
  powerpoint: {
    label: "PowerPoint presentation",
    description: "Microsoft PowerPoint presentation file.",
    aliases: ["ppt", "pptx"],
  },
  pptx: {
    label: "PowerPoint presentation (.pptx)",
    description: "Microsoft PowerPoint presentation slides.",
    aliases: ["powerpoint"],
  },
  revealjs: {
    label: "Reveal.js slides",
    description: "HTML presentation slides for Reveal.js.",
  },
  rtf: {
    label: "Rich text document (.rtf)",
    description: "Formatted text document supported by many word processors.",
  },
  svg: {
    label: "SVG image (.svg)",
    description: "Scalable vector graphics image.",
  },
  tab: {
    label: "Tab-separated table (.tab)",
    description: "Spreadsheet-compatible table data separated by tabs.",
  },
  texinfo: {
    label: "Texinfo document",
    description: "Documentation source format used by GNU projects.",
  },
  textile: {
    label: "Textile document",
    description: "Plain text document using Textile markup.",
  },
  tsv: {
    label: "Tab-separated table (.tsv)",
    description: "Spreadsheet-compatible table data separated by tabs.",
  },
  txt: {
    label: "Plain text document (.txt)",
    description: "Text-only document without rich formatting.",
  },
  webp: {
    label: "WebP image (.webp)",
    description: "Modern web image format.",
  },
  wpd: {
    label: "WordPerfect document (.wpd)",
    description: "Word processing document created by WordPerfect.",
  },
  wps: {
    label: "Works document (.wps)",
    description: "Older Microsoft Works word processing document.",
  },
  xhtml: {
    label: "XHTML document (.xhtml)",
    description: "HTML document written with XML syntax.",
  },
  xlsx: {
    label: "Excel spreadsheet (.xlsx)",
    description: "Microsoft Excel spreadsheet for tables, calculations, and workbooks.",
    aliases: ["excel"],
  },
  xml: {
    label: "XML document (.xml)",
    description: "Structured data or document stored in XML format.",
  },
  yaml: {
    label: "YAML data (.yaml)",
    description: "Human-readable structured data format.",
    aliases: ["yml"],
  },
};

const formatIdentifier = (extension: string) => {
  return /^[a-z0-9]+$/i.test(extension) ? `.${extension}` : extension;
};

const fallbackFormatName = (extension: string) => {
  if (/^[a-z0-9]{2,5}$/i.test(extension)) {
    return extension.toUpperCase();
  }

  return extension.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatLabel = (extension: string) => {
  if (!extension) {
    return "No extension";
  }

  return (
    formatMetadata[extension]?.label ??
    `${fallbackFormatName(extension)} format (${formatIdentifier(extension)})`
  );
};

const formatDescription = (extension: string) => {
  if (!extension) {
    return "Files without a clear extension need a source format before conversion.";
  }

  return (
    formatMetadata[extension]?.description ??
    "A conversion format handled by ConvertX. Check the file type and converter before starting."
  );
};

const formatAliases = (extension: string) => {
  return formatMetadata[extension]?.aliases ?? [];
};

const targetOption = (source: string, target: string, converter: string): ConversionTarget => {
  return {
    value: `${target},${converter}`,
    source,
    target,
    converter,
    label: formatLabel(target),
    description: `${formatDescription(target)} Compatible with ${formatLabel(source)} input.`,
  };
};

const buildFormatCatalog = () => {
  const converterTargets = getAllTargets();
  const sources = new Set<string>();

  for (const converter of Object.keys(converterTargets)) {
    for (const source of getAllInputs(converter)) {
      sources.add(normalizeFiletype(source));
    }
  }

  const sourceFormats = [...sources]
    .sort((a, b) => a.localeCompare(b))
    .map((source) => {
      const possibleTargets = getPossibleTargets(source);
      const targetOptions = Object.entries(possibleTargets)
        .flatMap(([converter, targets]) =>
          [...new Set(targets)].map((target) => targetOption(source, target, converter)),
        )
        .sort((a, b) => a.target.localeCompare(b.target) || a.converter.localeCompare(b.converter));

      return {
        extension: source,
        label: formatLabel(source),
        description: formatDescription(source),
        aliases: formatAliases(source),
        targetCount: targetOptions.length,
        targets: targetOptions,
      };
    });

  const targetFormats = new Map<
    string,
    { extension: string; label: string; description: string }
  >();
  for (const source of sourceFormats) {
    for (const target of source.targets) {
      targetFormats.set(target.target, {
        extension: target.target,
        label: formatLabel(target.target),
        description: formatDescription(target.target),
      });
    }
  }

  return {
    sources: sourceFormats,
    targets: [...targetFormats.values()].sort((a, b) => a.extension.localeCompare(b.extension)),
    converters: Object.keys(converterTargets).sort((a, b) => a.localeCompare(b)),
  };
};

const serializeJob = (job: Jobs) => {
  const files = getJobFiles(String(job.id));
  const completedFiles = files.length;
  const expectedFiles = job.num_files ?? 0;
  const status =
    job.status === "completed" || (expectedFiles > 0 && completedFiles >= expectedFiles)
      ? "completed"
      : job.status;

  return {
    id: String(job.id),
    dateCreated: job.date_created,
    status,
    numFiles: expectedFiles,
    completedFiles,
    progress:
      expectedFiles > 0 ? Math.min(100, Math.round((completedFiles / expectedFiles) * 100)) : 0,
    archiveUrl: `${WEBROOT}/archive/${job.id}`,
    files: files.map((file) => ({
      id: String(file.id),
      inputName: file.file_name,
      outputName: file.output_file_name,
      status: file.status,
      state:
        file.status.toLowerCase().includes("fail") ||
        file.status.toLowerCase().includes("unsupported")
          ? "failed"
          : file.status.toLowerCase().includes("done")
            ? "done"
            : "processing",
      downloadUrl: `${WEBROOT}/download/${job.id}/${encodeURIComponent(file.output_file_name)}`,
    })),
  };
};

const serializeHistoryJob = (job: Jobs) => ({
  ...serializeJob(job),
  resultUrl: `/results/${job.id}`,
});

const toFileArray = (file: UploadFile | UploadFile[] | undefined) => {
  if (!file) {
    return [];
  }

  return Array.isArray(file) ? file : [file];
};

export const api = new Elysia({ prefix: "/api" })
  .use(authService)
  .get(
    "/session",
    ({ user }) => {
      return {
        success: true,
        data: {
          authenticated: true,
          user: {
            id: String(user.id),
            email: user.email,
            username: user.username,
            name: user.name,
            groups: user.groups,
            entitlements: user.entitlements,
            isAdmin: user.isAdmin,
          },
          loginUrl: `${WEBROOT}/outpost.goauthentik.io/start`,
          logoffUrl: `${WEBROOT}/outpost.goauthentik.io/sign_out`,
        },
      };
    },
    { auth: true },
  )
  .get(
    "/conversion-formats",
    () => {
      return {
        success: true,
        data: buildFormatCatalog(),
      };
    },
    { auth: true },
  )
  .get(
    "/history",
    ({ set, user }) => {
      if (HIDE_HISTORY) {
        return apiError(set, 404, "HISTORY_HIDDEN", "History is disabled on this server.");
      }

      const jobs = db
        .query("SELECT * FROM jobs WHERE user_id = ? ORDER BY id DESC")
        .as(Jobs)
        .all(user.id)
        .filter((job) => job.num_files > 0)
        .map((job) => serializeHistoryJob(job));

      return {
        success: true,
        data: {
          jobs,
        },
      };
    },
    { auth: true },
  )
  .get(
    "/logs",
    () => {
      return {
        success: true,
        data: {
          entries: getLogEntries(),
        },
      };
    },
    { admin: true },
  )
  .post(
    "/jobs",
    async ({ set, user }) => {
      const dateCreated = new Date().toISOString();
      db.query("INSERT INTO jobs (user_id, date_created) VALUES (?, ?)").run(user.id, dateCreated);

      const inserted = db
        .query("SELECT * FROM jobs WHERE user_id = ? ORDER BY id DESC")
        .as(Jobs)
        .get(user.id);

      if (!inserted) {
        return apiError(set, 500, "JOB_CREATE_FAILED", "Could not create a conversion job.");
      }

      await mkdir(`${uploadsDir}${user.id}/${inserted.id}/`, { recursive: true });

      return {
        success: true,
        data: {
          job: serializeJob(inserted),
        },
      };
    },
    { auth: true },
  )
  .get(
    "/jobs/:jobId",
    ({ set, params, user }) => {
      const job = getJobForUser(params.jobId, user.id);
      if (!job) {
        return apiError(set, 404, "JOB_NOT_FOUND", "Job not found.");
      }

      return {
        success: true,
        data: {
          job: serializeJob(job),
        },
      };
    },
    { auth: true, params: t.Object({ jobId: t.String() }) },
  )
  .delete(
    "/jobs/:jobId",
    async ({ set, params, user }) => {
      const job = getJobForUser(params.jobId, user.id);
      if (!job) {
        return apiError(set, 404, "JOB_NOT_FOUND", "Job not found.");
      }

      await rm(`${outputDir}${job.user_id}/${job.id}`, {
        recursive: true,
        force: true,
      });
      await rm(`${uploadsDir}${job.user_id}/${job.id}`, {
        recursive: true,
        force: true,
      });

      db.query("DELETE FROM jobs WHERE id = ?").run(job.id);

      return {
        success: true,
        data: {
          jobId: String(job.id),
        },
      };
    },
    { auth: true, params: t.Object({ jobId: t.String() }) },
  )
  .post(
    "/jobs/:jobId/upload",
    async ({ set, params, body, user }) => {
      const job = getJobForUser(params.jobId, user.id);
      if (!job) {
        return apiError(set, 404, "JOB_NOT_FOUND", "Job not found.");
      }

      const files = toFileArray(body.file);
      if (files.length === 0) {
        return apiError(set, 400, "NO_FILES", "Choose at least one file to upload.");
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${params.jobId}/`;
      await mkdir(userUploadsDir, { recursive: true });

      const uploaded = [];
      for (const file of files) {
        const fileName = sanitize(file.name);
        if (!fileName) {
          return apiError(set, 400, "INVALID_FILE_NAME", "One selected file has an invalid name.");
        }

        await Bun.write(`${userUploadsDir}${fileName}`, file);
        uploaded.push({
          name: fileName,
          originalName: file.name,
          size: file.size,
          mimeType: file.type ?? "",
          source: getSourceFromFileName(fileName),
        });
      }

      return {
        success: true,
        data: {
          jobId: params.jobId,
          files: uploaded,
        },
      };
    },
    {
      auth: true,
      params: t.Object({ jobId: t.String() }),
      body: t.Object({ file: t.Files() }),
    },
  )
  .post(
    "/jobs/:jobId/uploads/delete",
    async ({ set, params, body, user }) => {
      const job = getJobForUser(params.jobId, user.id);
      if (!job) {
        return apiError(set, 404, "JOB_NOT_FOUND", "Job not found.");
      }

      const fileName = sanitize(body.fileName);
      if (!fileName) {
        return apiError(set, 400, "INVALID_FILE_NAME", "File name is invalid.");
      }

      await rm(`${uploadsDir}${user.id}/${params.jobId}/${fileName}`, { force: true });

      return {
        success: true,
        data: {
          jobId: params.jobId,
          fileName,
        },
      };
    },
    {
      auth: true,
      params: t.Object({ jobId: t.String() }),
      body: t.Object({ fileName: t.String() }),
    },
  )
  .post(
    "/jobs/:jobId/convert",
    async ({ set, params, body, user }) => {
      const job = getJobForUser(params.jobId, user.id);
      if (!job) {
        return apiError(set, 404, "JOB_NOT_FOUND", "Job not found.");
      }

      const convertTo = normalizeFiletype(body.target);
      const converterName = body.converter;

      if (
        !converterName ||
        !convertTo ||
        convertTo.includes("/") ||
        convertTo.includes("\\") ||
        convertTo.includes("..")
      ) {
        return apiError(set, 400, "INVALID_TARGET", "Choose a valid conversion target.");
      }

      const fileNames = body.fileNames.map((fileName) => sanitize(fileName)).filter(Boolean);
      if (fileNames.length === 0) {
        return apiError(set, 400, "NO_FILES", "Upload at least one file before converting.");
      }

      const userUploadsDir = `${uploadsDir}${user.id}/${params.jobId}/`;
      const userOutputDir = `${outputDir}${user.id}/${params.jobId}/`;

      const missingFiles = fileNames.filter(
        (fileName) => !existsSync(`${userUploadsDir}${fileName}`),
      );
      if (missingFiles.length > 0) {
        return apiError(
          set,
          400,
          "UPLOAD_MISSING",
          "One or more files have not finished uploading.",
          {
            files: missingFiles,
          },
        );
      }

      const incompatibleFiles = fileNames.filter((fileName) => {
        const source = getSourceFromFileName(fileName);
        const possibleTargets = getPossibleTargets(source);
        return !possibleTargets[converterName]?.includes(convertTo);
      });

      if (incompatibleFiles.length > 0) {
        return apiError(
          set,
          400,
          "INCOMPATIBLE_TARGET",
          "The selected target cannot convert every file.",
          {
            files: incompatibleFiles,
          },
        );
      }

      await mkdir(userOutputDir, { recursive: true });

      db.query("DELETE FROM file_names WHERE job_id = ?").run(params.jobId);
      db.query("UPDATE jobs SET num_files = ?1, status = 'pending' WHERE id = ?2").run(
        fileNames.length,
        params.jobId,
      );

      handleConvert(fileNames, userUploadsDir, userOutputDir, convertTo, converterName, {
        value: params.jobId,
      })
        .then(() => {
          db.query("UPDATE jobs SET status = 'completed' WHERE id = ?1").run(params.jobId);
        })
        .catch((error) => {
          db.query("UPDATE jobs SET status = 'failed' WHERE id = ?1").run(params.jobId);
          console.error("Error in React API conversion process:", error);
        });

      return {
        success: true,
        data: {
          jobId: params.jobId,
          status: "pending",
          redirectTo: `/results/${params.jobId}`,
        },
      };
    },
    {
      auth: true,
      params: t.Object({ jobId: t.String() }),
      body: t.Object({
        fileNames: t.Array(t.String(), { minItems: 1 }),
        target: t.String(),
        converter: t.String(),
      }),
    },
  );
