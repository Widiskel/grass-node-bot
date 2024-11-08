import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";
import logger from "../../utils/logger.js";
import { SocksProxyAgent } from "socks-proxy-agent";
import UserAgent from "user-agents";

export class API {
  constructor(url, proxy) {
    this.url = url;
    this.proxy = proxy;
    this.ua = new UserAgent({ deviceCategory: "desktop" }).data.userAgent;
    this.IP = "-";
  }

  generateHeaders(token = undefined) {
    const headers = {
      Accept: "*/*",
      "Content-Type": "application/json",
      "User-Agent": this.ua,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    };

    if (token) {
      headers.Authorization = token;
    }

    return headers;
  }

  replaceSensitiveData(str) {
    if (this.something) {
      if (typeof this.something === "string") {
        const regex = new RegExp(this.something, "g");
        return str.replace(regex, "?????");
      } else if (Array.isArray(this.something)) {
        this.something.forEach((sensitiveItem) => {
          const regex = new RegExp(sensitiveItem, "g");
          str = str.replace(regex, "?????");
        });
      }
    }
    return str;
  }

  async ipChecker() {
    logger.info("Checking IP");
    try {
      const options = {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9,id;q=0.8",
          priority: "u=1, i",
          "sec-ch-ua": this.ua,
        },
        method: "GET",
        mode: "cors",
      };

      if (this.proxy) {
        if (this.proxy.startsWith("http")) {
          options.agent = new HttpsProxyAgent(this.proxy);
        } else if (this.proxy.startsWith("socks")) {
          options.agent = new SocksProxyAgent(this.proxy);
        }
      }
      const response = await fetch(
        "https://api.ipify.org/?format=json",
        options
      );

      const data = await response.json();
      this.IP = data.ip;
    } catch (error) {
      console.error("Error fetching IP data:", error);
      throw error;
    }
    logger.info("IP Checked");
  }

  async fetch(
    endpoint,
    method,
    token,
    body = {},
    additionalHeader = {},
    isCustomUrl = false
  ) {
    const url = isCustomUrl ? endpoint : `${this.url}${endpoint}`;
    try {
      const headers = {
        ...this.generateHeaders(token),
        ...additionalHeader,
      };
      const options = {
        headers,
        method,
        referrer: "https://app.getgrass.io/",
      };

      logger.info(
        `${method} : ${this.replaceSensitiveData(url)} ${
          this.proxy ? this.proxy : ""
        }`
      );

      const dumHeader = headers;
      for (let key in dumHeader) {
        dumHeader[key] = this.replaceSensitiveData(dumHeader[key]);
      }
      logger.info(`Request Header : ${JSON.stringify(dumHeader)}`);

      if (method !== "GET") {
        options.body = `${JSON.stringify(body)}`;
        const dumBody = this.replaceSensitiveData(options.body);
        logger.info(`Request Body : ${dumBody}`);
      }

      if (this.proxy) {
        if (this.proxy.startsWith(`http`))
          options.agent = new HttpsProxyAgent(this.proxy);
        if (this.proxy.startsWith(`socks`))
          options.agent = new SocksProxyAgent(this.proxy);
      }

      const res = await fetch(url, options);
      logger.info(`Response : ${res.status} ${res.statusText}`);

      if (res.ok) {
        const contentType = res.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
          data.status = res.status;
        } else {
          data = {
            status: res.status,
            message: await res.text(),
          };
        }

        if (res.ok) data.status = 200;
        let responseData = JSON.stringify(data);
        responseData = this.replaceSensitiveData(responseData);
        // if (responseData.length > 200) {
        //   responseData = responseData.substring(0, 200) + "...";
        // }

        logger.info(`Response Data : ${responseData}`);
        return data;
      } else {
        throw res;
      }
    } catch (err) {
      logger.error(err);
      if (err.status) {
        if (err.status == 404 || err.status == 503) {
          console.error(`Detect API Change Stopping bot`);
          throw Error(`Detect API Change Stopping bot`);
        }
        throw Error(`${err.status} - ${err.statusText}`);
      }
      if (err.response) {
        if (err.response.status == 404 || err.response.status == 503) {
          console.error(`Detect API Change Stopping bot`);
          throw Error(`Detect API Change Stopping bot`);
        }
        throw Error(`${err.response}`);
      }
      throw err;
    }
  }
}
