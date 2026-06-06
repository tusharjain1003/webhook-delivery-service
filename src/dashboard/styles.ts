export const styles = `
  body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f7f5; color: #1f2933; }
  nav { background: #1f2933; color: white; padding: 14px 24px; }
  nav a { color: white; margin-right: 18px; text-decoration: none; font-weight: 600; }
  main { max-width: 1000px; margin: 28px auto; padding: 0 18px; }
  h1, h2 { margin: 0 0 16px; }
  form.inline { display: inline; }
  .panel { background: white; border: 1px solid #d7dce0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 10px; align-items: end; }
  label { display: grid; gap: 4px; font-size: 13px; color: #52606d; }
  input { padding: 9px 10px; border: 1px solid #bcccdc; border-radius: 6px; font: inherit; }
  button, .button { border: 0; border-radius: 6px; background: #2563eb; color: white; padding: 9px 12px; font: inherit; cursor: pointer; text-decoration: none; display: inline-block; }
  button.danger { background: #b42318; }
  button.secondary { background: #52606d; }
  table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dce0; }
  th, td { border-bottom: 1px solid #e4e7eb; padding: 10px; text-align: left; vertical-align: top; }
  th { background: #f0f4f8; font-size: 13px; color: #52606d; }
  tr:hover td { background: #fbfbfa; }
  code, pre, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  pre { background: #111827; color: #f9fafb; padding: 14px; border-radius: 8px; overflow-x: auto; }
  .badge { border-radius: 999px; padding: 3px 8px; font-size: 12px; font-weight: 700; display: inline-block; }
  .success { background: #dcfce7; color: #166534; }
  .pending, .in_progress { background: #fef3c7; color: #92400e; }
  .failed { background: #fee2e2; color: #991b1b; }
  .exhausted { background: #e5e7eb; color: #374151; }
  .inactive { background: #e5e7eb; color: #374151; }
  .muted { color: #64748b; }
  .summary span { margin-right: 10px; }
  @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } table { font-size: 14px; } }
`;
