import { IssueConnection } from "@linear/sdk";
import { Block, PlainTextOption, SlackViewAction } from "@slack/bolt";

const workspaces = [
  {
    name: "Purpom Media Lab",
    value: "purpom-media-lab",
  },
  {
    name: "アクティブコア",
    value: "active-core-swat",
  },
];

const workSpaceOptions = workspaces.map((workspace) => {
  return {
    text: {
      type: "plain_text",
      text: workspace.name,
      emoji: true,
    },
    value: workspace.value,
  };
});

// 出勤
export const buildInNewModal = () => {
  return {
    callback_id: "in_new_modal",
    title: {
      type: "plain_text" as const,
      text: "出勤",
      emoji: true,
    },
    type: "modal" as const,
    close: {
      type: "plain_text" as const,
      text: "キャンセル",
      emoji: true,
    },
    submit: {
      type: "plain_text" as const,
      text: "送信",
    },
    blocks: [
      {
        block_id: "user_section",
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
      {
        block_id: "workspace_section",
        type: "section",
        text: {
          type: "mrkdwn",
          text: "ワークスペースを選択してください。",
        },
        accessory: {
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "ワークスペースを選択",
            emoji: true,
          },
          options: workSpaceOptions,
          action_id: "static_select_in_action",
        },
      },
    ],
  };
};

export const buildInModalBlocks = (assignedIssues: IssueConnection) => {
  if (!assignedIssues?.nodes) {
    return buildInNotLinearBlocks();
  }
  const options = assignedIssues?.nodes?.map((issue) => {
    return {
      text: {
        type: "plain_text" as const,
        text: issue.title,
        emoji: false,
      },
      value: issue.url,
    };
  });

  return buildInLinearBlocks(options);
};

const buildInLinearBlocks = (options: PlainTextOption[]) => {
  return [
    {
      type: "divider",
    },
    {
      type: "input",
      block_id: "linear_section",
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
      block_id: "todo_input",
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
      block_id: "contact_input",
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
};

const buildInNotLinearBlocks = () => {
  return [
    {
      type: "divider",
    },
    {
      type: "input",
      block_id: "todo_input",
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
      block_id: "contact_input",
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
};

export const buildInUpdateModal = (blocks: Block[]) => {
  return {
    callback_id: "daily_report_in_post",
    type: "modal" as const,
    submit: {
      type: "plain_text" as const,
      text: "送信",
      emoji: true,
    },
    close: {
      type: "plain_text" as const,
      text: "キャンセル",
      emoji: true,
    },
    title: {
      type: "plain_text" as const,
      text: "出勤",
      emoji: true,
    },
    blocks,
  };
};

export const buildInPostModalBlocks = (body: SlackViewAction) => {
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

  const selectedIssues =
    body?.view?.state?.values?.linear_section?.multi_static_select_in_action
      ?.selected_options;

  const todoInput =
    body?.view?.state?.values?.todo_input?.plain_text_input_in_action?.value;

  const contactInput =
    body?.view?.state?.values?.contact_input?.plain_text_input_in_action?.value;

  // linearから選択したissueがある場合
  if (selectedIssues) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":calendar: |   *今日取り組むissue*  | :calendar: ",
      },
    });

    selectedIssues.forEach((issue) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `●  <${issue.value}|${issue.text.text}>`,
        },
      });
    });
  }

  // その他今日やることが入力されている場合
  if (todoInput) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":calendar: |   *その他今日やること*  | :calendar: ",
      },
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: todoInput,
      },
    });
  }

  // 連絡事項が入力されている場合
  if (contactInput) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: " :loud_sound: *連絡事項* :loud_sound:",
      },
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: contactInput,
      },
    });
  }

  return blocks;
};

//-----------------

// 退勤
export const buildOutNewModal = () => {
  return {
    callback_id: "out_new_modal",
    title: {
      type: "plain_text" as const,
      text: "退勤",
      emoji: true,
    },
    type: "modal" as const,
    close: {
      type: "plain_text" as const,
      text: "キャンセル",
      emoji: true,
    },
    submit: {
      type: "plain_text" as const,
      text: "送信",
    },
    blocks: [
      {
        block_id: "user_section",
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
      {
        block_id: "workspace_section",
        type: "section",
        text: {
          type: "mrkdwn",
          text: "ワークスペースを選択してください。",
        },
        accessory: {
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "ワークスペースを選択",
            emoji: true,
          },
          options: workSpaceOptions,
          action_id: "static_select_out_action",
        },
      },
    ],
  };
};

export const buildOutModalBlocks = (assignedIssues: IssueConnection) => {
  if (!assignedIssues?.nodes) {
    return buildOutNotLinearBlocks();
  }
  const options = assignedIssues?.nodes?.map((issue) => {
    return {
      text: {
        type: "plain_text" as const,
        text: issue.title,
        emoji: false,
      },
      value: issue.url,
    };
  });

  return buildOutLinearBlocks(options);
};

const buildOutLinearBlocks = (options: PlainTextOption[]) => {
  return [
    {
      type: "divider",
    },
    {
      type: "input",
      block_id: "linear_section",
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
      block_id: "todo_input",
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
      block_id: "trouble_input",
      label: {
        type: "plain_text",
        text: "困っていること・躓いていること",
        emoji: true,
      },
      element: {
        type: "plain_text_input",
        action_id: "plain_text_input_out_action",
        multiline: true,
      },
      optional: true,
    },
    {
      type: "input",
      block_id: "contact_input",
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
};

const buildOutNotLinearBlocks = () => {
  return [
    {
      type: "divider",
    },
    {
      type: "input",
      block_id: "todo_input",
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
      block_id: "trouble_input",
      label: {
        type: "plain_text",
        text: "困っていること・躓いていること",
        emoji: true,
      },
      element: {
        type: "plain_text_input",
        action_id: "plain_text_input_out_action",
        multiline: true,
      },
      optional: true,
    },
    {
      type: "input",
      block_id: "contact_input",
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
};

export const buildOutUpdateModal = (blocks: Block[]) => {
  return {
    callback_id: "daily_report_out_post",
    type: "modal" as const,
    submit: {
      type: "plain_text" as const,
      text: "送信",
      emoji: true,
    },
    close: {
      type: "plain_text" as const,
      text: "キャンセル",
      emoji: true,
    },
    title: {
      type: "plain_text" as const,
      text: "退勤",
      emoji: true,
    },
    blocks,
  };
};

export const buildOutPostModalBlocks = (body: SlackViewAction) => {
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:newspaper: |   *退勤*   |:newspaper: <@${body["user"]["id"]}>`,
      },
    },
    {
      type: "divider",
    },
  ];

  const selectedIssues =
    body?.view?.state?.values?.linear_section?.multi_static_select_out_action
      ?.selected_options;

  const todoInput =
    body?.view?.state?.values?.todo_input?.plain_text_input_out_action?.value;

  const troubleInput =
    body?.view?.state?.values?.trouble_input?.plain_text_input_out_action
      ?.value;

  const contactInput =
    body?.view?.state?.values?.contact_input?.plain_text_input_out_action
      ?.value;

  // linearから選択したissueがある場合
  if (selectedIssues) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":calendar: |   *今日取り組んだissue*  | :calendar: ",
      },
    });

    selectedIssues.forEach((issue) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `●  <${issue.value}|${issue.text.text}>`,
        },
      });
    });
  }

  // その他今日やることが入力されている場合
  if (todoInput) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":calendar: |   *その他今日やったこと*  | :calendar: ",
      },
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: todoInput,
      },
    });
  }

  // 困ったこと・つまづいtこと入力されている場合
  if (troubleInput) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: " :loud_sound: *困っていること・躓いていること* :loud_sound:",
      },
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: troubleInput,
      },
    });
  }

  // 連絡事項が入力されている場合
  if (contactInput) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: " :loud_sound: *連絡事項* :loud_sound:",
      },
    });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: contactInput,
      },
    });
  }

  return blocks;
};
