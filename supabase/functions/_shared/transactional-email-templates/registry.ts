import type { ComponentType } from "npm:react@18.3.1";
import { template as accountantReport } from "./accountant-report.tsx";
import { template as forumReply } from "./forum-reply.tsx";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: any) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  to?: string;
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  "accountant-report": accountantReport,
};
