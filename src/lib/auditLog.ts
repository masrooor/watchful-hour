import { supabase } from "@/integrations/supabase/client";

export const logAudit = async (
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert([{
      actor_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || {},
    }]);
  } catch (e) {
    console.error("Audit log failed:", e);
  }
};
