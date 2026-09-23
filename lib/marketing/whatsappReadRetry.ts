// Retry only an idempotent report read, never a lead insert/update.
export async function retryReportRead<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (!code || !["P1001", "P1002", "P1017", "P2024"].includes(code)) throw error;
    console.warn("[whatsapp-report] Retrying interrupted read", { code });
    await new Promise(resolve => setTimeout(resolve, 350));
    return await read();
  }
}
