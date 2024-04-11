import { App, AwsLambdaReceiver, Block } from "@slack/bolt";
import { LinearClient } from "@linear/sdk";
import { WebClient } from "@slack/web-api";
import {
  buildInModalBlocks,
  buildInNewModal,
  buildInPostModalBlocks,
  buildInUpdateModal,
  buildOutModalBlocks,
  buildOutNewModal,
  buildOutPostModalBlocks,
  buildOutUpdateModal,
} from "./runner";

const slackClient = new WebClient(process.env.SLACK_AUTH_TOKEN ?? "");

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET ?? "",
});

const app = new App({
  token: process.env.SLACK_AUTH_TOKEN,
  receiver: awsLambdaReceiver,
});

/**
 *  出勤
 */
app.shortcut("daily_report_in", async ({ ack, body, client }) => {
  await ack();

  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildInNewModal(),
    });
  } catch (err) {
    console.error(err);
    throw new Error("出勤モーダルの表示に失敗しました。");
  }
});

// ユーザー選択
app.action("users_select_in_action", async ({ ack, body, client }) => {
  await ack();
});

// ワークスペース選択
app.action("static_select_in_action", async ({ ack, body, client }) => {
  await ack();
});

app.view("in_new_modal", async ({ ack, body, view, client }) => {
  const selectedUserId =
    body?.view?.state?.values?.user_section?.["users_select_in_action"][
      "selected_user"
    ];

  const selectedWorkspace =
    body?.view?.state?.values?.workspace_section?.["static_select_in_action"]
      ?.selected_option?.value;

  if (!selectedUserId || !selectedWorkspace) {
    throw new Error("ユーザーまたはワークスペースが選択されていません。");
  }

  // Slackのユーザー情報を取得
  const slackUserResponse = await slackClient.users.profile.get({
    user: selectedUserId,
  });

  const apiKey = (function () {
    switch (selectedWorkspace) {
      case "purpom-media-lab":
        return process.env.PURPOM_MEDIA_LAB_LINEAR_API_KEY;
      case "hyper-game":
        return process.env.HYPER_GAME_LINEAR_API_KEY;
      default:
        return "";
    }
  })();

  const linearClient = new LinearClient({
    apiKey: apiKey ?? "",
  });

  const assignedIssues = await linearClient.issues({
    filter: {
      assignee: {
        email: {
          eq: slackUserResponse?.profile?.email,
        },
      },
      state: {
        type: {
          in: ["unstarted", "started"],
        },
      },
    },
  });

  const blocks = buildInModalBlocks(assignedIssues);

  try {
    await ack({
      response_action: "update",
      view: buildInUpdateModal(blocks),
    });
    await client.views.update({
      view_id: body["view"]["id"],
      view: buildInUpdateModal(blocks),
    });
  } catch (err) {
    console.error(err);
    throw new Error("出勤モーダルの更新に失敗しました。");
  }
});

app.view("daily_report_in_post", async ({ ack, body, view, client }) => {
  await ack();

  try {
    await client.chat.postMessage({
      channel: "#daily",
      blocks: buildInPostModalBlocks(body),
    });
  } catch (err) {
    console.error(err);
    throw new Error("出勤レポートの投稿に失敗しました。");
  }
});

/**
 * 退勤
 */
app.shortcut("daily_report_out", async ({ ack, body, client }) => {
  await ack();

  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildOutNewModal(),
    });
  } catch (err) {
    console.error(err);
    throw new Error("退勤モーダルの表示に失敗しました。");
  }
});

// ユーザー選択
app.action("users_select_out_action", async ({ ack }) => {
  await ack();
});

// ワークスペース選択
app.action("static_select_out_action", async ({ ack }) => {
  await ack();
});

app.view("out_new_modal", async ({ ack, body, view, client }) => {
  const selectedUserId =
    body?.view?.state?.values?.user_section?.["users_select_out_action"][
      "selected_user"
    ];

  const selectedWorkspace =
    body?.view?.state?.values?.workspace_section?.["static_select_out_action"]
      ?.selected_option?.value;

  if (!selectedUserId || !selectedWorkspace) {
    throw new Error("ユーザーまたはワークスペースが選択されていません。");
  }

  // Slackのユーザー情報を取得
  const slackUserResponse = await slackClient.users.profile.get({
    user: selectedUserId,
  });

  const apiKey = (function () {
    switch (selectedWorkspace) {
      case "purpom-media-lab":
        return process.env.PURPOM_MEDIA_LAB_LINEAR_API_KEY;
      case "hyper-game":
        return process.env.HYPER_GAME_LINEAR_API_KEY;
      default:
        return "";
    }
  })();

  const linearClient = new LinearClient({
    apiKey: apiKey ?? "",
  });

  const oneDayAgo = new Date(
    new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
  );

  const assignedIssues = await linearClient.issues({
    orderBy: "updatedAt" as any,
    filter: {
      updatedAt: {
        gt: oneDayAgo, // 24時間以内に更新されたissueでフィルタリング
      },
      assignee: {
        email: {
          eq: slackUserResponse?.profile?.email,
        },
      },
      state: {
        type: {
          in: ["started", "completed"],
        },
      },
    },
  });

  const blocks = buildOutModalBlocks(assignedIssues);

  try {
    await ack({
      response_action: "update",
      view: buildOutUpdateModal(blocks),
    });
    await client.views.update({
      view_id: body["view"]["id"],
      view: buildOutUpdateModal(blocks),
    });
  } catch (err) {
    console.error(err);
    throw new Error("退勤モーダルの更新に失敗しました。");
  }
});

app.view("daily_report_out_post", async ({ ack, body, view, client }) => {
  await ack();

  try {
    await client.chat.postMessage({
      channel: "#daily",
      blocks: buildOutPostModalBlocks(body),
    });
  } catch (err) {
    console.error(err);
    throw new Error("退勤レポートの投稿に失敗しました。");
  }
});

export async function DailyReportAppHandler(
  event: any,
  context: any,
  callback: any
) {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
}
