import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { Helper } from "../utils/helper.js";
import { API } from "./api/api.js";
import logger from "../utils/logger.js";
import { v3 as uuidv3, v4 as uuidv4 } from "uuid";
import { WebSocket } from "ws";
import sqlite from "./db/sqlite.js";

export default class Core extends API {
  constructor(acc, worker, proxy) {
    super("https://api.getgrass.io", proxy);
    this.acc = acc;
    this.socket = null;
    this.wssReconnectAttempts = 0;
    this.maxwssReconnectAttempts = 5;
    this.pingInterval = 0;
    this.point = 0;
    this.pingCount = 0;
    this.pongCount = 0;
    this.pingInterval = null;
    this.pingTimeout = null;
    this.worker = worker;
  }

  uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  }

  async login() {
    try {
      await Helper.delay(1000, this.worker, `Try to login...`, this);
      const res = await this.fetch(`/login`, "POST", undefined, {
        username: this.acc.email,
        password: this.acc.password,
      });
      if (res.status == 200) {
        this.token = res.result.data.accessToken;
        this.refreshToken = res.result.data.refreshToken;
        this.user = res.user;
      } else {
        throw res;
      }
    } catch (error) {
      if (error.message.includes(400)) {
        await Helper.delay(
          3000,
          this.worker,
          `Failed to login posible wrong Email / Password`,
          this
        );
      } else {
        await this.handleError(error);
      }
    }
  }

  async initDevice() {
    await Helper.delay(1000, this.worker, `Initializing Worker...`, this);
    let session = await sqlite.getSessionByProxy(this.proxy);
    if (session) {
      session = await sqlite.firstOrCreateSession(
        this.proxy,
        session.device_id
      );
    } else {
      session = await sqlite.firstOrCreateSession(
        this.proxy,
        uuidv3(this.proxy, uuidv3.DNS).toString()
      );
    }
    logger.info(`Use Session ${JSON.stringify(session)}`);
    this.deviceId = session.device_id;
    await Helper.delay(1000, this.worker, `Worker Initialized...`, this);
  }
  async getUser() {
    await Helper.delay(1000, this.worker, `Getting User Information...`, this);
    const res = await this.fetch(`/retrieveUser`, "GET", this.token);
    if (res.status == 200) {
      this.user = res.result.data;
    } else {
      await this.handleError(res);
    }
  }
  async getActiveNetwork() {
    try {
      await Helper.delay(
        1000,
        this.worker,
        `Getting Actives Network Information...`,
        this
      );
      const res = await this.fetch(`/activeIps`, "GET", this.token);
      if (res.status == 200) {
        this.network = res.result.data.find(
          (item) => item.ipAddress == this.IP
        );
      } else {
        await this.handleError(res);
      }
    } catch (error) {
      await this.handleError(error);
    }
  }

  async getPoint(msg) {
    try {
      if (msg)
        await Helper.delay(1000, this.worker, `Getting Epoch Earning...`, this);
      const res = await this.fetch(
        `/epochEarnings?input=%7B%22limit%22:1%7D`,
        "GET",
        this.token
      );
      if (res.status == 200) {
        const point = res.result.data.data;
        this.point = point.reduce((sum, item) => {
          return (
            sum +
            (item.totalPoints || 0) +
            (item.referralPoints || 0) +
            (item.rewardPoints || 0)
          );
        }, 0);
        if (msg)
          await Helper.delay(
            1000,
            this.worker,
            `Successfully Get Epoch Point...`,
            this
          );
      } else {
        this.handleError(res);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async connectWebSocket() {
    try {
      logger.info("INIT WSS");
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        await Helper.delay(
          0,
          this.worker,
          "WebSocket already connected.",
          this
        );
        return;
      }
      logger.info("No existing WSS running");

      await this.ipChecker().catch((err) => {
        logger.info("FAILED TO GET IP");
      });
      await Helper.delay(0, this.worker, "Connecting to webscoket.", this);
      let agent;
      if (this.proxy) {
        if (this.proxy.startsWith(`http`))
          agent = new HttpsProxyAgent(this.proxy);
        if (this.proxy.startsWith(`socks`))
          agent = new SocksProxyAgent(this.proxy);
      }
      this.socketURL = `wss://proxy2.wynd.network:4444/`;
      this.socket = new WebSocket(this.socketURL, {
        agent: agent,
        headers: {
          "User-Agent": this.ua,
          connection: "Upgrade",
          host: "proxy2.wynd.network:4444",
          origin: "chrome-extension://lkbnfiajjmbhnfledhphioinpickokdi",
          "sec-websocket-extensions":
            "permessage-deflate; client_max_window_bits",
          "sec-websocket-version": "13",
        },
      });

      this.socket.onopen = async () => {
        await Helper.delay(
          0,
          this.worker,
          "Connected to websocket, Websocket connection oppened",
          this
        );
        this.wssReconnectAttempts = 0;
      };

      this.socket.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        const action = data.action;
        await Helper.delay(
          0,
          this.worker,
          `Received message on Worker ${this.worker}: ${JSON.stringify(data)}`,
          this
        );

        switch (action) {
          case "AUTH":
            await this.handleAuth(data);
            break;

          case "PONG":
            await Helper.delay(
              0,
              this.worker,
              `Received ${action} Action`,
              this
            );
            await this.sendPong(data);
            break;

          default:
            await Helper.delay(
              500,
              this.worker,
              `Received unknown action: ${action}`,
              this
            );
            break;
        }
      };

      this.socket.onerror = async (error) => {
        await Helper.delay(
          0,
          this.worker,
          `WebSocket error: ${JSON.stringify(error)}`,
          this
        );
      };

      this.socket.onclose = async (event) => {
        try {
          if (!event.wasClean) {
            await Helper.delay(
              3000,
              this.worker,
              `WebSocket closed unexpectedly: ${event.code} - ${event.reason}`,
              this
            );
          } else {
            await Helper.delay(
              3000,
              this.worker,
              `WebSocket Connection Closed Cleanly`,
              this
            );
          }

          await this.stopPing();
          await this.reconnectWebSocket().catch((err) => {
            throw err;
          });
        } catch (error) {
          throw error;
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async reconnectWebSocket() {
    try {
      if (this.wssReconnectAttempts < this.maxwssReconnectAttempts) {
        this.wssReconnectAttempts += 1;
        const delay = Math.min(5000, 1000 * this.wssReconnectAttempts);
        Helper.delay(
          delay,
          this.worker,
          `Attempting to reconnect (#${this.wssReconnectAttempts})...`,
          this
        ).then(async () => await this.connectWebSocket());
      } else {
        const msg =
          "Max reconnect attempts reached. Could not reconnect to WebSocket.";
        Helper.delay(1000, this.worker, msg, this);
        throw Error(msg);
      }
    } catch (error) {
      throw error;
    }
  }

  async handleAuth(data) {
    const authRes = JSON.stringify({
      id: data.id,
      origin_action: "AUTH",
      result: {
        browser_id: this.deviceId,
        user_id: this.acc instanceof Object ? this.user.userId : this.acc,
        user_agent: this.ua,
        timestamp: Date.now(),
        device_type: "extension",
        version: "4.26.2",
        extension_id: "lkbnfiajjmbhnfledhphioinpickokdi",
      },
    });

    logger.info(authRes);
    await Helper.delay(0, this.worker, `Sending ${data.action} Response`, this);
    this.socket.send(authRes);
    this.startPing();
    await Helper.delay(
      0,
      this.worker,
      `Auth Response Sended, Delaying 1 min before sending PING`,
      this
    );
  }

  async sendPing() {
    const data = JSON.stringify({
      id: this.uuidv4(),
      version: "1.0.0",
      action: "PING",
      data: {},
    });
    logger.info(data);
    this.pingCount = this.pingCount + 1;
    await Helper.delay(0, this.worker, `Sending PING ${this.pingCount}`, this);
    this.socket.send(data);
    if (this.acc instanceof Object) {
      await this.getActiveNetwork();
    }
    await Helper.delay(0, this.worker, `PING ${this.pingCount} Sended`, this);
  }

  async startPing() {
    if (!this.pingInterval) {
      this.pingTimeout = setTimeout(async () => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          await Helper.delay(
            0,
            this.worker,
            `WebSocket Connection ${this.socket.readyState} Sending PING`,
            this
          );
          await this.sendPing();
          this.pingInterval = setInterval(async () => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              await this.sendPing();
            }
          }, 120000);
        }
      }, 60000);
    }
  }

  async stopPing() {
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  async sendPong(data) {
    this.pongCount = this.pongCount + 1;
    await Helper.delay(0, this.worker, `Sending PONG ${this.pongCount}`, this);
    this.socket.send(JSON.stringify({ id: data.id, origin_action: "PONG" }));
    await Helper.delay(0, this.worker, `PONG ${this.pongCount} Sended`, this);
  }

  async handleError(error) {
    throw error;
  }
}
