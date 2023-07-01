import { App } from "@slack/bolt";

export async function DailyReportAppHandler(event: any) {
  console.log("App", App);
  console.log("request:", JSON.stringify(event, undefined, 2));
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, CDK! You've hit ${event.path}\n`,
  };
}
