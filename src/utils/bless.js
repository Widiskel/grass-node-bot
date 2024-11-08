import blessed from "blessed";
import Core from "../core/core.js";
import { Helper } from "./helper.js";
import { proxyList } from "../../config/proxy_list.js";
import { accounts } from "../../accounts/accounts.js";

export class Bless {
  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
    });

    this.screen.title = "SKEL DROP HUNT";
    this.titleBox = blessed.box({
      top: 0,
      left: "center",
      width: "shrink",
      height: 2,
      tags: true,
      content: `{center}GRASS NODE BOT{/center}
    By: Widiskel`,
      style: {
        fg: "white",
        bold: true,
      },
    });
    this.screen.append(this.titleBox);
    this.subTitle = blessed.box({
      top: 1,
      left: "center",
      width: "shrink",
      height: 2,
      tags: true,
      content: `By: Widiskel - Skel Drop hunt (https://t.me/skeldrophunt)`,
      style: {
        fg: "white",
        bold: true,
      },
    });
    this.screen.append(this.subTitle);
    this.tabList = blessed.box({
      top: 5,
      left: "center",
      width: "100%",
      height: 3,
      tags: true,
      style: {
        fg: "white",
      },
    });
    this.screen.append(this.tabList);
    this.hintBox = blessed.box({
      bottom: 0,
      left: "center",
      width: "100%",
      height: 3,
      tags: true,
      content:
        "{center}Use '->'(arrow right) and '<-'(arrow left) to switch between tabs{/center}",
      style: {
        fg: "white",
      },
    });
    this.screen.append(this.hintBox);
    this.infoBox = blessed.box({
      bottom: 3,
      left: "center",
      width: "100%",
      height: 3,
      tags: true,
      content: "",
      style: {
        fg: "white",
        // bg: "black",
      },
    });
    this.screen.append(this.infoBox);
    this.tabs = [];
    this.currentTabIndex = 0;

    proxyList.forEach((account, idx) => {
      const tab = this.createAccountTab(`Worker ${idx + 1}`);
      this.tabs.push(tab);
      this.screen.append(tab);
      tab.hide();
    });

    if (this.tabs.length > 0) {
      this.tabs[0].show();
    }

    this.renderTabList();

    this.screen.key(["q", "C-c"], () => {
      return process.exit(0);
    });

    this.screen.key(["left", "right"], (ch, key) => {
      if (key.name === "right") {
        this.switchTab((this.currentTabIndex + 1) % this.tabs.length);
      } else if (key.name === "left") {
        this.switchTab(
          (this.currentTabIndex - 1 + this.tabs.length) % this.tabs.length
        );
      }
    });

    this.screen.render();
  }

  createAccountTab(title) {
    return blessed.box({
      label: title,
      top: 6,
      left: 0,
      width: "100%",
      height: "shrink",
      border: {
        type: "line",
      },
      style: {
        fg: "white",
        border: {
          fg: "#f0f0f0",
        },
      },
      tags: true,
    });
  }

  renderTabList() {
    let tabContent = "";
    proxyList.forEach((account, idx) => {
      if (idx === this.currentTabIndex) {
        tabContent += `{blue-fg}{bold} Worker ${idx + 1} {/bold}{/blue-fg} `;
      } else {
        tabContent += ` Worker ${idx + 1} `;
      }
    });
    this.tabList.setContent(`{center}${tabContent}{/center}`);
    this.screen.render();
  }

  switchTab(index) {
    this.tabs[this.currentTabIndex].hide();
    this.currentTabIndex = index;
    this.tabs[this.currentTabIndex].show();
    this.renderTabList();
    this.screen.render();
  }

  log(msg = "", acc = "", core = new Core(), delay) {
    if (
      delay === undefined ||
      delay == "Delaying for 0 Hours 0 Minutes 0 Seconds"
    ) {
      delay = "-";
    }
    let logContent;

    const email = accounts.email ?? "-";
    const user = core.user ?? {};

    let id;
    if (acc instanceof Object) {
      id = user.userId ?? "-";
    } else {
      id = accounts;
    }
    const point = core.point ?? "-";
    const device = core.deviceId ?? "-";
    const ip = core.IP;
    const network = core.network ?? {};
    const ipScore = network.ipScore ?? `-`;

    let spinnerData = {
      msg,
      delay,
      email,
      id,
      point,
      device,
      ip,
      ipScore,
    };

    logContent = `${Helper.spinnerContent(spinnerData)}`;

    this.tabs[acc].setContent(logContent);
    this.screen.render();
  }

  info(msg = "") {
    const formattedInfo = `
{center}Info: ${msg}{/center}
`;
    this.infoBox.setContent(formattedInfo);
    this.screen.render();
  }

  clearInfo() {
    this.infoBox.setContent("");
    this.screen.render();
  }
}
