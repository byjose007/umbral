import { ok, err, Result } from 'neverthrow';
import { DomainError, TemplateNotFoundError } from './errors.js';

export interface RenderedTemplate {
  readonly subject: string;
  readonly body: string;
}

export class NotificationTemplateEngine {
  private readonly templates: Record<string, Record<'es' | 'en', { subject: string; body: string }>> = {
    FORCED_DOOR: {
      es: {
        subject: '🚨 ALERTA CRÍTICA: Puerta Forzada en {{zoneId}}',
        body: 'ATENCIÓN: Se ha detectado apertura forzada en la puerta {{doorId}} (Zona: {{zoneId}}) a las {{timestamp}}.',
      },
      en: {
        subject: '🚨 CRITICAL ALERT: Forced Door at {{zoneId}}',
        body: 'WARNING: Forced door entry detected on door {{doorId}} (Zone: {{zoneId}}) at {{timestamp}}.',
      },
    },
    HELD_OPEN: {
      es: {
        subject: '⚠️ ADVERTENCIA: Puerta Dejada Abierta en {{zoneId}}',
        body: 'Aviso: La puerta {{doorId}} ha permanecido abierta más del tiempo permitido. Por favor verificar.',
      },
      en: {
        subject: '⚠️ WARNING: Door Held Open at {{zoneId}}',
        body: 'Notice: Door {{doorId}} has been held open past the allowed threshold. Please inspect.',
      },
    },
    TAILGATING_SUSPECT: {
      es: {
        subject: '⚠️ ALERTA: Sospecha de Tailgating en {{zoneId}}',
        body: 'Se detectó paso múltiple no autorizado en {{doorId}}. Usuario presentado: {{pseudonym}}.',
      },
      en: {
        subject: '⚠️ ALERT: Tailgating Suspected at {{zoneId}}',
        body: 'Multiple unauthorized passes detected at door {{doorId}}. Presented user: {{pseudonym}}.',
      },
    },
    DURESS_ALARM: {
      es: {
        subject: '🚨 ALERTA SILENCIOSA: Coacción Activa',
        body: 'EMERGENCIA: Marcación bajo coacción en puerta {{doorId}} por el usuario {{pseudonym}}.',
      },
      en: {
        subject: '🚨 SILENT ALARM: Duress Pin Entered',
        body: 'EMERGENCY: Duress access granted at door {{doorId}} for user {{pseudonym}}.',
      },
    },
    MUSTER_EVACUATION: {
      es: {
        subject: '🔥 EVACUACIÓN ACTIVADA: Sitio {{siteId}}',
        body: 'Reporte de Evacuación Muster generado por {{initiatedBy}}. Ocupantes en riesgo: {{missingCount}}.',
      },
      en: {
        subject: '🔥 EVACUATION ACTIVATED: Site {{siteId}}',
        body: 'Emergency Muster evacuation roll initiated by {{initiatedBy}}. Accounted missing: {{missingCount}}.',
      },
    },
  };

  public render(
    templateId: string,
    locale: 'es' | 'en',
    params: Record<string, unknown>
  ): Result<RenderedTemplate, DomainError> {
    const templateGroup = this.templates[templateId];
    if (!templateGroup) {
      return err(new TemplateNotFoundError(templateId, locale));
    }

    const template = templateGroup[locale] || templateGroup['es'];
    if (!template) {
      return err(new TemplateNotFoundError(templateId, locale));
    }

    let subject = template.subject;
    let body = template.body;

    for (const [key, val] of Object.entries(params)) {
      const placeholder = `{{${key}}}`;
      const strVal = String(val ?? '');
      subject = subject.split(placeholder).join(strVal);
      body = body.split(placeholder).join(strVal);
    }

    return ok({ subject, body });
  }
}
