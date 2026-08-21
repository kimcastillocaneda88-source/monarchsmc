import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { AuditAction, SessionUser } from "@/types";

/**
 * Append-only audit trail for privileged actions.
 *
 * Written exclusively through the Admin SDK; Security Rules deny all client
 * writes to auditLogs so entries cannot be forged from the browser.
 */
export async function recordAudit(
  actor: Pick<SessionUser, "uid" | "email" | "role">,
  action: AuditAction,
  targetType: string,
  targetId: string,
  metadata: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  try {
    await adminDb().collection("auditLogs").add({
      actorId: actor.uid,
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      targetType,
      targetId,
      metadata,
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch {
    // Audit writes must never break the operation they describe; the failure is
    // surfaced in server logs by Firestore itself.
  }
}
