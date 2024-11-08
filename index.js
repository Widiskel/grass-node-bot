import { accounts } from "./accounts/accounts.js";
import { proxyList } from "./config/proxy_list.js";
import Core from "./src/core/core.js";
import sqlite from "./src/core/db/sqlite.js";
import { Helper } from "./src/utils/helper.js";
import logger from "./src/utils/logger.js";

async function operation(acc, worker, proxy) {
  const core = new Core(acc, worker, proxy);

  try {
    await core.initDevice();
    if (acc instanceof Object) {
      await core.login();
      await core.getUser();
      await core.getPoint(true);
      await core.ipChecker();
      await core.getActiveNetwork();
    }
    await core.connectWebSocket();
  } catch (error) {
    let account = acc;
    if (error.message) {
      await Helper.delay(
        10000,
        worker,
        `Error : ${error.message}, Retry again after 10 Second`,
        core
      );
    } else {
      await Helper.delay(
        10000,
        worker,
        `Error :${JSON.stringify(error)}, Retry again after 10 Second`,
        core
      );
    }

    await operation(account, worker, proxy);
  }
}

async function startBot() {
  return new Promise(async (resolve, reject) => {
    try {
      logger.info(`BOT STARTED`);

      if (accounts instanceof Object) {
        if (!accounts.email && !accounts.password)
          throw Error("Please Set Up your account first on accounts.js file");
      } else {
        if (accounts == undefined || accounts == "")
          throw Error("Please Set Up your User id first on accounts.js file");
      }

      if (proxyList.length == 0)
        throw Error(
          `This bot require you to use proxy, so add at least 1 proxy`
        );

      const promiseList = [];
      await sqlite.createTable();

      proxyList.forEach((proxy, worker) => {
        promiseList.push(operation(accounts, worker, proxy));
      });

      await Promise.all(promiseList);
      resolve();
    } catch (error) {
      logger.info(`BOT STOPPED`);
      logger.error(JSON.stringify(error));
      reject(error);
    }
  });
}

(async () => {
  try {
    logger.clear();
    logger.info("");
    logger.info("Application Started");
    console.log("GRASS NODE BOT");
    console.log();
    console.log("By : Widiskel");
    console.log("Follow On : https://github.com/Widiskel");
    console.log("Join Channel : https://t.me/skeldrophunt");
    console.log("Dont forget to run git pull to keep up to date");
    await startBot();
  } catch (error) {
    console.log("Error During executing bot", error);
    await startBot();
  }
})();
