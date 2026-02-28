import { Injectable } from '@nestjs/common';

export type WhatsappConsentStatus = 'granted' | 'denied' | 'unknown';
export type WhatsappMessageType = 'template' | 'freeform';

interface EvaluateAutomationInput {
  consentStatus: WhatsappConsentStatus;
  isAutomation: boolean;
  messageType: WhatsappMessageType;
  lastInboundAt?: Date | null;
  freeformEnabled: boolean;
  consentExceptionContactIds: string[];
  contactId?: string;
}

export interface AutomationEvaluationResult {
  allowed: boolean;
  reason: string;
  serviceWindowOpen: boolean;
  serviceWindowHours?: number;
}

export type InboundInterpretationType =
  | 'confirm_pericia'
  | 'request_reschedule'
  | 'triage_inbox_unlinked'
  | 'triage_inbox_linked';

interface InterpretInboundInput {
  body: string;
  hasLinkedInboxItem: boolean;
}

@Injectable()
export class WhatsappRulesEngine {
  private static readonly SERVICE_WINDOW_HOURS = 24;

  evaluateAutomation(input: EvaluateAutomationInput): AutomationEvaluationResult {
    const serviceWindowHours = this.calculateServiceWindowHours(input.lastInboundAt);
    const serviceWindowOpen = serviceWindowHours !== undefined && serviceWindowHours <= WhatsappRulesEngine.SERVICE_WINDOW_HOURS;

    if (input.isAutomation && input.consentStatus !== 'granted') {
      const hasExplicitException = !!input.contactId && input.consentExceptionContactIds.includes(input.contactId);
      if (!hasExplicitException) {
        return {
          allowed: false,
          reason: 'automation-blocked-missing-consent',
          serviceWindowOpen,
          serviceWindowHours,
        };
      }
    }

    if (input.messageType === 'template') {
      return {
        allowed: true,
        reason: 'template-allowed',
        serviceWindowOpen,
        serviceWindowHours,
      };
    }

    if (!input.freeformEnabled) {
      return {
        allowed: false,
        reason: 'freeform-feature-disabled',
        serviceWindowOpen,
        serviceWindowHours,
      };
    }

    if (!serviceWindowOpen) {
      return {
        allowed: false,
        reason: 'freeform-outside-24h-window',
        serviceWindowOpen,
        serviceWindowHours,
      };
    }

    return {
      allowed: true,
      reason: 'freeform-allowed-within-window',
      serviceWindowOpen,
      serviceWindowHours,
    };
  }

  interpretInbound(input: InterpretInboundInput): { type: InboundInterpretationType; normalizedBody: string } {
    const normalizedBody = input.body.trim();

    if (normalizedBody === '1') {
      return { type: 'confirm_pericia', normalizedBody };
    }

    if (normalizedBody === '2') {
      return { type: 'request_reschedule', normalizedBody };
    }

    return {
      type: input.hasLinkedInboxItem ? 'triage_inbox_linked' : 'triage_inbox_unlinked',
      normalizedBody,
    };
  }

  private calculateServiceWindowHours(lastInboundAt?: Date | null): number | undefined {
    if (!lastInboundAt) return undefined;

    const diffMs = Date.now() - lastInboundAt.getTime();
    if (diffMs < 0) return 0;

    return diffMs / (1000 * 60 * 60);
  }
}
