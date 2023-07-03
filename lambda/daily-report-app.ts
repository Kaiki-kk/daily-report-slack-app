import { App, AwsLambdaReceiver, Block } from "@slack/bolt";
import { LinearClient } from "@linear/sdk";
import { WebClient } from "@slack/web-api";

const linearClient = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY ?? "",
});

const slackClient = new WebClient(process.env.SLACK_AUTH_TOKEN ?? "");

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET ?? "",
});

const app = new App({
  token: process.env.SLACK_AUTH_TOKEN,
  receiver: awsLambdaReceiver,
});

app.shortcut("daily_report_in", async ({ ack, body, client }) => {
  await ack();

  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        title: {
          type: "plain_text",
          text: "出勤",
          emoji: true,
        },
        type: "modal",
        close: {
          type: "plain_text",
          text: "キャンセル",
          emoji: true,
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "出勤するアカウントを選択してください。",
            },
            accessory: {
              type: "users_select",
              placeholder: {
                type: "plain_text",
                text: "アカウントを選択",
                emoji: true,
              },
              action_id: "users_select_in_action",
            },
          },
        ],
      },
    });
  } catch (err) {
    console.error(err);
  }
});

app.action("users_select_in_action", async ({ ack, body, client }) => {
  await ack();

  // 実態と異なる方定義のため、anyで回避
  const _body = body as any;

  const selectedUserId = _body["actions"][0]["selected_user"];

  const slackUserResponse = await slackClient.users.profile.get({
    user: selectedUserId,
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

  const options =
    assignedIssues?.nodes.length > 0
      ? assignedIssues?.nodes?.map((issue) => {
          return {
            text: {
              type: "plain_text" as "plain_text",
              text: issue.title,
              emoji: false,
            },
            value: issue.url,
          };
        })
      : [];

  const blocks =
    options.length > 0
      ? [
          {
            type: "divider",
          },
          {
            type: "input",
            block_id: "linear_input_id",
            label: {
              type: "plain_text",
              text: "今日やることをlinearから選択",
              emoji: true,
            },
            element: {
              type: "multi_static_select",
              placeholder: {
                type: "plain_text",
                text: "issueを選択",
                emoji: true,
              },
              options: options,
              action_id: "multi_static_select_in_action",
            },
            optional: true,
          },
          {
            type: "input",
            block_id: "todo_input_id",
            label: {
              type: "plain_text",
              text: "その他今日やることを入力",
              emoji: true,
            },
            element: {
              type: "plain_text_input",
              multiline: true,
              action_id: "plain_text_input_in_action",
            },
            optional: true,
          },
          {
            type: "input",
            block_id: "contact_input_id",
            label: {
              type: "plain_text",
              text: "連絡事項",
              emoji: true,
            },
            element: {
              type: "plain_text_input",
              action_id: "plain_text_input_in_action",
              multiline: true,
            },
            optional: true,
          },
        ]
      : [
          {
            type: "divider",
          },
          {
            type: "input",
            block_id: "todo_input_id",
            label: {
              type: "plain_text",
              text: "その他今日やることを入力",
              emoji: true,
            },
            element: {
              type: "plain_text_input",
              multiline: true,
              action_id: "plain_text_input_in_action",
            },
            optional: true,
          },
          {
            type: "input",
            block_id: "contact_input_id",
            label: {
              type: "plain_text",
              text: "連絡事項",
              emoji: true,
            },
            element: {
              type: "plain_text_input",
              action_id: "plain_text_input_in_action",
              multiline: true,
            },
            optional: true,
          },
        ];

  try {
    await client.views.update({
      view_id: _body.container.view_id,
      view: {
        callback_id: "daily_report_in_id",
        type: "modal",
        submit: {
          type: "plain_text",
          text: "送信",
          emoji: true,
        },
        close: {
          type: "plain_text",
          text: "キャンセル",
          emoji: true,
        },
        title: {
          type: "plain_text",
          text: "出勤",
          emoji: true,
        },
        blocks,
      },
    });
  } catch (err) {
    console.error(err);
  }
});

app.view("daily_report_in_id", async ({ ack, body, view, client }) => {
  await ack();

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:newspaper: |   *出勤*   |:newspaper: <@${body["user"]["id"]}>`,
      },
    },
    {
      type: "divider",
    },
  ];

  if (
    view["state"]["values"]["linear_input_id"]["multi_static_select_in_action"][
      "selected_options"
    ]
  ) {
    view["state"]["values"]["linear_input_id"]["multi_static_select_in_action"][
      "selected_options"
    ]?.forEach((item, index) => {
      if (index === 0) {
        const issueBlocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":calendar: |   *今日取り組むissue*  | :calendar: ",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `●  <${item.value}|${item.text.text}>`,
            },
          },
        ];
        blocks.push(...issueBlocks);
      } else {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `●  <${item.value}|${item.text.text}>`,
          },
        });
      }
    });
  }

  if (
    view["state"]["values"]["todo_input_id"]["plain_text_input_in_action"][
      "value"
    ]
  ) {
    const otherTodoBlocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":calendar: |   *その他今日やること*  | :calendar: ",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: view["state"]["values"]["todo_input_id"][
            "plain_text_input_in_action"
          ]["value"],
        },
      },
    ];

    blocks.push(...otherTodoBlocks);
  }

  if (
    view["state"]["values"]["contact_input_id"]["plain_text_input_in_action"][
      "value"
    ]
  ) {
    const contactBlocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: " :loud_sound: *連絡事項* :loud_sound:",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: view["state"]["values"]["contact_input_id"][
            "plain_text_input_in_action"
          ]["value"],
        },
      },
    ];
    blocks.push(...contactBlocks);
  }

  try {
    await client.chat.postMessage({
      channel: "#daily",
      blocks,
    });
  } catch (err) {
    console.error(err);
  }
});

app.shortcut("daily_report_out", async ({ ack, body, client }) => {
  await ack();

  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        callback_id: "daily_report_out_id",
        title: {
          type: "plain_text",
          text: "退勤",
          emoji: true,
        },
        type: "modal",
        close: {
          type: "plain_text",
          text: "キャンセル",
          emoji: true,
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "退勤するアカウントを選択してください。",
            },
            accessory: {
              type: "users_select",
              placeholder: {
                type: "plain_text",
                text: "アカウントを選択",
                emoji: true,
              },
              action_id: "users_select_out_action",
            },
          },
        ],
      },
    });
  } catch (err) {
    console.error(err);
  }
});

app.action("users_select_out_action", async ({ ack, body, client }) => {
  await ack();
  // 実態と異なる方定義のため、anyで回避
  const _body = body as any;

  const selectedUserId = _body["actions"][0]["selected_user"];

  const slackUserResponse = await slackClient.users.profile.get({
    user: selectedUserId,
  });

  const oneDayAgo = new Date(
    new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
  );

  const assignedIssues = await linearClient.issues({
    orderBy: "updatedAt" as any,
    filter: {
      updatedAt: {
        gt: oneDayAgo,
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

  const options =
    assignedIssues?.nodes.length > 0
      ? assignedIssues?.nodes?.map((issue) => {
          return {
            text: {
              type: "plain_text" as "plain_text",
              text: issue.title,
              emoji: false,
            },
            value: issue.url,
          };
        })
      : [];

  const blocks =
    options.length > 0
      ? [
          {
            type: "divider",
          },
          {
            type: "input",
            block_id: "linear_input_id",
            label: {
              type: "plain_text",
              text: "今日やったことをlinearから選択",
              emoji: true,
            },
            element: {
              type: "multi_static_select",
              placeholder: {
                type: "plain_text",
                text: "issueを選択",
                emoji: true,
              },
              options: options,
              action_id: "multi_static_select_out_action",
            },
            optional: true,
          },
          {
            type: "input",
            block_id: "todo_input_id",
            label: {
              type: "plain_text",
              text: "その他今日やったことを入力",
              emoji: true,
            },
            element: {
              type: "plain_text_input",
              multiline: true,
              action_id: "plain_text_input_out_action",
            },
            optional: true,
          },
          {
            type: "input",
            block_id: "contact_input_id",
            label: {
              type: "plain_text",
              text: "連絡事項",
              emoji: true,
            },
            element: {
              type: "plain_text_input",
              action_id: "plain_text_input_out_action",
              multiline: true,
            },
            optional: true,
          },
        ]
      : [
          {
            type: "divider",
          },
          {
            type: "input",
            block_id: "todo_input_id",
            label: {
              type: "plain_text",
              text: "その他今日やったことを入力",
              emoji: true,
            },
            element: {
              type: "plain_text_input",
              multiline: true,
              action_id: "plain_text_input_out_action",
            },
            optional: true,
          },
          {
            type: "input",
            block_id: "contact_input_id",
            label: {
              type: "plain_text",
              text: "連絡事項",
              emoji: true,
            },
            element: {
              type: "plain_text_input",
              action_id: "plain_text_input_out_action",
              multiline: true,
            },
            optional: true,
          },
        ];

  try {
    await client.views.update({
      view_id: _body.container.view_id,
      view: {
        callback_id: "daily_report_out_id",
        type: "modal",
        submit: {
          type: "plain_text",
          text: "送信",
          emoji: true,
        },
        close: {
          type: "plain_text",
          text: "キャンセル",
          emoji: true,
        },
        title: {
          type: "plain_text",
          text: "退勤",
          emoji: true,
        },
        blocks,
      },
    });
  } catch (err) {
    console.error(err);
  }
});

app.view("daily_report_out_id", async ({ ack, body, view, client }) => {
  await ack();

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:newspaper: |   *退勤*  | :newspaper: <@${body["user"]["id"]}>`,
      },
    },
    {
      type: "divider",
    },
  ];

  if (
    view["state"]["values"]["linear_input_id"][
      "multi_static_select_out_action"
    ]["selected_options"]
  ) {
    view["state"]["values"]["linear_input_id"][
      "multi_static_select_out_action"
    ]["selected_options"]?.forEach((item, index) => {
      if (index === 0) {
        const issueBlocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":calendar: |   *今日取り組んだissue*  | :calendar: ",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `●  <${item.value}|${item.text.text}>`,
            },
          },
        ];
        blocks.push(...issueBlocks);
      } else {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `●  <${item.value}|${item.text.text}>`,
          },
        });
      }
    });
  }

  if (
    view["state"]["values"]["todo_input_id"]["plain_text_input_out_action"][
      "value"
    ]
  ) {
    const otherTodoBlocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":calendar: |   *その他今日やったこと*  | :calendar: ",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: view["state"]["values"]["todo_input_id"][
            "plain_text_input_out_action"
          ]["value"],
        },
      },
    ];

    blocks.push(...otherTodoBlocks);
  }

  if (
    view["state"]["values"]["contact_input_id"]["plain_text_input_out_action"][
      "value"
    ]
  ) {
    const contactBlocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: " :loud_sound: *連絡事項* :loud_sound:",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: view["state"]["values"]["contact_input_id"][
            "plain_text_input_out_action"
          ]["value"],
        },
      },
    ];
    blocks.push(...contactBlocks);
  }

  try {
    await client.chat.postMessage({
      channel: "#daily",
      blocks,
    });
  } catch (err) {
    console.error(err);
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
