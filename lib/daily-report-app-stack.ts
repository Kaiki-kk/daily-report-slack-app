import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dotenv from "dotenv";
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as path from "path";

dotenv.config();

export class DailyReportAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dailyReportAppHandler = new nodeLambda.NodejsFunction(
      this,
      "DailyReportAppHandler",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(__dirname, "../lambda/daily-report-app.ts"),
        handler: "DailyReportAppHandler",
        memorySize: 512,
        environment: {
          SLACK_AUTH_TOKEN: process.env.SLACK_AUTH_TOKEN ?? "",
          SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET ?? "",
          LINEAR_API_KEY: process.env.LINEAR_API_KEY ?? "",
          REGION: cdk.Stack.of(this).region,
        },
      }
    );

    const url = dailyReportAppHandler.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType["NONE"],
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.ALL],
      },
    });
  }
}
