import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { clampLimit, withDb } from "./client";
import { oneOf, requireMillis, str } from "./serialize";
import { AUDIT_ACTIONS, ROLES, type AuditAction, type AuditLogEntry, type Role } from "@/types";

export async function listAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  return withDb<AuditLogEntry[]>([], async (database) => {
    const snap = await database
      .collection("auditLogs")
      .orderBy("timestamp", "desc")
      .limit(clampLimit(limit, 48))
      .get();
    return snap.docs.map((doc: QueryDocumentSnapshot) => {
      const d = doc.data();
      const metadata: Record<string, string | number | boolean | null> = {};
      const raw = (d.metadata ?? {}) as Record<string, unknown>;
      for (const [key, value] of Object.entries(raw)) {
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null
        ) {
          metadata[key] = value;
        }
      }
      return {
        id: doc.id,
        actorId: str(d.actorId),
        actorEmail: str(d.actorEmail),
        actorRole: oneOf<Role>(d.actorRole, ROLES, "member"),
        action: oneOf<AuditAction>(d.action, AUDIT_ACTIONS, "member.update"),
        targetType: str(d.targetType),
        targetId: str(d.targetId),
        metadata,
        timestamp: requireMillis(d.timestamp),
      };
    });
  });
}
